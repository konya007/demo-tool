import { useEffect, useRef, useState, type DragEvent } from 'react'
import { ChevronDown, Library, Pencil, Play, Plus, Repeat, Trash2, Upload, Pause, Keyboard, Zap, Square } from 'lucide-react'
import { actions, useApp } from '../lib/store'
import { engine } from '../lib/audioEngine'
import { playTrack } from '../lib/player'
import { useEngine, useFrame } from '../lib/useEngine'
import { openDialog } from '../lib/ui'
import { fmtTime } from '../lib/format'
import type { Label, Track } from '../lib/types'
import { Kbd, LabelIcon } from './Common'

const DRAG_MIME = 'application/x-track-id'

export function TrackList() {
  const labels = useApp((s) => s.labels)
  const tracks = useApp((s) => s.tracks)
  const search = useApp((s) => s.search).trim().toLowerCase()
  const collapsed = useApp((s) => s.settings.collapsed)

  if (!tracks.length) return <EmptyState />

  const groups = labels.map((label) => ({
    label,
    tracks: tracks.filter((t) => t.labelId === label.id && (!search || t.name.toLowerCase().includes(search))),
  }))
  const visible = search ? groups.filter((g) => g.tracks.length) : groups

  return (
    <div className="track-list">
      {visible.map((g) => (
        <Group key={g.label.id} label={g.label} tracks={g.tracks}
          collapsed={!search && collapsed.includes(g.label.id)} />
      ))}
      {search && !visible.length && <p className="muted center pad">Không có bài nào khớp “{search}”.</p>}
    </div>
  )
}

function Group({ label, tracks, collapsed }: { label: Label; tracks: Track[]; collapsed: boolean }) {
  const [over, setOver] = useState(false)
  const playingId = useEngine().trackId
  const hasPlaying = tracks.some((t) => t.id === playingId)
  const total = tracks.reduce((s, t) => s + t.duration, 0)

  const onDrop = (e: DragEvent) => {
    setOver(false)
    const id = e.dataTransfer.getData(DRAG_MIME)
    if (id) {
      e.preventDefault()
      e.stopPropagation()
      void actions.moveTrack(id, label.id, null)
    }
  }

  return (
    <section className={`group ${over ? 'drop-over' : ''} ${collapsed ? 'is-collapsed' : ''}`}
      style={{ '--c': label.color } as React.CSSProperties}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DRAG_MIME)) {
          e.preventDefault()
          setOver(true)
        }
      }}
      onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOver(false)}
      onDrop={onDrop}>
      <header className="group-head" onClick={() => actions.toggleCollapsed(label.id)}>
        <ChevronDown size={16} className="chev" />
        <span className="group-icon"><LabelIcon name={label.icon} size={16} /></span>
        <h3>{label.name}</h3>
        {hasPlaying && <span className="eq small"><i /><i /><i /></span>}
        <span className="group-meta">{tracks.length} bài · {fmtTime(total)}</span>
        <button className="icon-btn ghost" title={`Thêm nhạc vào “${label.name}”`}
          onClick={(e) => {
            e.stopPropagation()
            openDialog({ kind: 'upload', labelId: label.id })
          }}>
          <Plus size={16} />
        </button>
      </header>
      <div className="group-body">
        <div className="group-inner">
          {tracks.map((t, i) => <Row key={t.id} track={t} index={i + 1} labelId={label.id} />)}
          {!tracks.length && (
            <button className="group-empty" onClick={() => openDialog({ kind: 'upload', labelId: label.id })}>
              <Plus size={14} /> Chưa có bài — thêm nhạc hoặc kéo bài từ nhóm khác vào đây
            </button>
          )}
        </div>
      </div>
    </section>
  )
}

function Row({ track, index, labelId }: { track: Track; index: number; labelId: string }) {
  const cueId = useApp((s) => s.cueId)
  const es = useEngine()
  const isSfx = track.kind === 'sfx'
  const sfxOn = isSfx && es.sfx.includes(track.id)
  const isCurrent = sfxOn || (!isSfx && es.trackId === track.id && es.status !== 'idle')
  const isPlaying = sfxOn || (isCurrent && es.status === 'playing')
  const [dropBefore, setDropBefore] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  useEffect(() => {
    if (!confirmDel) return
    const t = setTimeout(() => setConfirmDel(false), 2500)
    return () => clearTimeout(t)
  }, [confirmDel])

  return (
    <div
      data-track={track.id}
      className={`row ${isSfx ? 'is-sfx' : ''} ${cueId === track.id ? 'is-cue' : ''} ${isCurrent ? 'is-current' : ''} ${isPlaying ? 'is-playing' : ''} ${dropBefore ? 'drop-before' : ''}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_MIME, track.id)
        e.dataTransfer.effectAllowed = 'move'
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DRAG_MIME)) {
          e.preventDefault()
          setDropBefore(true)
        }
      }}
      onDragLeave={() => setDropBefore(false)}
      onDrop={(e) => {
        setDropBefore(false)
        const id = e.dataTransfer.getData(DRAG_MIME)
        if (id) {
          e.preventDefault()
          e.stopPropagation()
          void actions.moveTrack(id, labelId, track.id)
        }
      }}
      onClick={() => actions.setCue(track.id)}
      onDoubleClick={() => void playTrack(track.id)}
    >
      {isCurrent && !isSfx && <RowProgress />}
      <span className="row-num">
        {isPlaying ? <span className="eq"><i /><i /><i /></span> : index}
      </span>
      <button className="row-play" title={isSfx ? (sfxOn ? 'Dừng hiệu ứng' : 'Phát chồng lên nhạc') : isPlaying ? 'Tạm dừng' : 'Phát ngay'}
        onClick={(e) => {
          e.stopPropagation()
          if (isCurrent && !isSfx) engine.togglePause()
          else void playTrack(track.id)
        }}>
        {sfxOn ? <Square size={13} /> : isPlaying ? <Pause size={15} /> : isSfx ? <Zap size={15} /> : <Play size={15} />}
      </button>
      <div className="row-title">
        <span className="name" title={track.name}>{track.name}</span>
        <span className="sub">
          {fmtTime(track.duration)}
          {isSfx && <span className="tag tag-sfx"><Zap size={11} /> Hiệu ứng</span>}
          {track.source === 'library' && <span className="tag"><Library size={11} /> Mẫu</span>}
          {cueId === track.id && <span className="tag tag-cue">CUE · Enter để phát</span>}
        </span>
      </div>
      <div className="row-actions">
        <button className={`hk ${track.hotkey ? '' : 'hk-empty'}`} title="Gán phím tắt"
          onClick={(e) => {
            e.stopPropagation()
            openDialog({ kind: 'track', trackId: track.id })
          }}>
          {track.hotkey ? <Kbd k={track.hotkey} /> : <Keyboard size={14} />}
        </button>
        <button className={`icon-btn ghost ${isSfx ? 'on' : ''}`}
          title={isSfx ? 'Đang là hiệu ứng (phát chồng) — bấm để chuyển thành nhạc' : 'Đang là nhạc — bấm để chuyển thành hiệu ứng phát chồng'}
          onClick={(e) => {
            e.stopPropagation()
            if (sfxOn) engine.stopSfx(track.id)
            else if (isCurrent) engine.stop(400)
            void actions.updateTrack(track.id, { kind: isSfx ? 'music' : 'sfx' })
          }}>
          <Zap size={15} />
        </button>
        <button className={`icon-btn ghost ${track.loop ? 'on' : ''}`} title="Lặp lại bài này"
          onClick={(e) => {
            e.stopPropagation()
            void actions.updateTrack(track.id, { loop: !track.loop })
          }}>
          <Repeat size={15} />
        </button>
        <button className="icon-btn ghost reveal" title="Sửa"
          onClick={(e) => {
            e.stopPropagation()
            openDialog({ kind: 'track', trackId: track.id })
          }}>
          <Pencil size={15} />
        </button>
        <button className={`icon-btn ghost reveal danger ${confirmDel ? 'confirm' : ''}`}
          title={confirmDel ? 'Bấm lần nữa để xóa' : 'Xóa'}
          onClick={(e) => {
            e.stopPropagation()
            if (confirmDel) void actions.deleteTrack(track.id)
            else setConfirmDel(true)
          }}>
          <Trash2 size={15} />{confirmDel && <span>Xóa?</span>}
        </button>
      </div>
    </div>
  )
}

function RowProgress() {
  const ref = useRef<HTMLDivElement>(null)
  useFrame(() => {
    const { time, duration } = engine.getTime()
    if (ref.current) ref.current.style.transform = `scaleX(${duration ? time / duration : 0})`
  })
  return <div className="row-progress" ref={ref} />
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-art"><span className="eq big"><i /><i /><i /><i /><i /></span></div>
      <h2>Chưa có bài nhạc nào</h2>
      <p>Tải nhạc của bạn lên và gắn nhãn, hoặc lấy nhanh từ thư viện mẫu.</p>
      <div className="empty-actions">
        <button className="btn primary" onClick={() => openDialog({ kind: 'upload' })}><Upload size={16} /> Tải nhạc lên</button>
        <button className="btn" onClick={() => openDialog({ kind: 'library' })}><Library size={16} /> Mở thư viện mẫu</button>
      </div>
      <p className="muted small">Mẹo: kéo thả file nhạc vào bất kỳ đâu trên trang để tải lên.</p>
    </div>
  )
}
