import { useEffect, useState } from 'react'
import { Keyboard, Music, Search, X } from 'lucide-react'
import { actions, getState, useApp } from '../../lib/store'
import { closeDialog } from '../../lib/ui'
import { displayKey, keyName } from '../../lib/hotkeys'
import { RESERVED_KEYS } from '../../lib/defaults'
import { fmtSize, fmtTime } from '../../lib/format'
import { HelpTip, Kbd, LabelIcon, Modal, Switch } from '../Common'
import { LabelSelect } from './UploadDialog'

export function TrackDialog({ trackId }: { trackId: string }) {
  const track = useApp((s) => s.tracks.find((t) => t.id === trackId))
  const labels = useApp((s) => s.labels)
  const [name, setName] = useState(track?.name ?? '')
  const [labelId, setLabelId] = useState(track?.labelId ?? '')
  const [loop, setLoop] = useState(track?.loop ?? false)
  const [hotkey, setHotkey] = useState<string | null>(track?.hotkey ?? null)

  if (!track) return null
  const save = () => {
    void actions.updateTrack(track.id, { name: name.trim() || track.name, labelId, loop, hotkey })
    closeDialog()
  }

  return (
    <Modal title="Sửa bài nhạc" icon={<Music size={18} />}
      footer={<><span className="spacer" /><button className="btn" onClick={closeDialog}>Hủy</button><button className="btn primary" onClick={save}>Lưu</button></>}>
      <form className="form" onSubmit={(e) => {
        e.preventDefault()
        save()
      }}>
        <div className="field">
          <label>Tên hiển thị</label>
          <input className="input" value={name} autoFocus onChange={(e) => setName(e.target.value)} />
          <small className="muted">{fmtTime(track.duration)} · {fmtSize(track.size)} · {track.source === 'library' ? 'Thư viện mẫu' : 'Tải lên'}</small>
        </div>
        <div className="field">
          <label>Nhãn</label>
          <LabelSelect value={labelId} onChange={setLabelId} labels={labels} />
        </div>
        <div className="field">
          <label>Phím phát nhanh <HelpTip section="hotkeys" /></label>
          <HotkeyCapture value={hotkey} onChange={setHotkey} trackId={track.id} />
        </div>
        <div className="field">
          <Switch checked={loop} onChange={setLoop} label="Lặp lại bài này khi hết" />
        </div>
      </form>
    </Modal>
  )
}

export function HotkeyCapture({ value, onChange, trackId }: { value: string | null; onChange: (k: string | null) => void; trackId?: string }) {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const owner = useApp((s) => s.tracks.find((t) => value && t.hotkey === value && t.id !== trackId))

  useEffect(() => {
    if (!listening) return
    document.body.dataset.capturing = '1'
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const k = keyName(e)
      if (['SHIFT', 'CONTROL', 'ALT', 'META', 'CAPSLOCK'].includes(k)) return
      if (k === 'ESCAPE') return setListening(false)
      if (k === 'BACKSPACE' || k === 'DELETE') {
        onChange(null)
        return setListening(false)
      }
      if (RESERVED_KEYS.has(k)) {
        setError(`Phím ${displayKey(k)} đã dùng cho điều khiển chung, chọn phím khác`)
        return
      }
      setError('')
      onChange(k)
      setListening(false)
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      delete document.body.dataset.capturing
      window.removeEventListener('keydown', onKey, true)
    }
  }, [listening, onChange])

  return (
    <div className="hk-capture">
      <button type="button" className={`hk-box ${listening ? 'listening' : ''}`} onClick={() => {
        setError('')
        setListening(!listening)
      }}>
        <Keyboard size={16} />
        {listening ? 'Bấm phím bất kỳ… (Esc hủy, Backspace xóa)' : value ? <>Phím <Kbd k={value} /></> : 'Chưa gán — bấm để gán'}
      </button>
      {value && !listening && (
        <button type="button" className="icon-btn ghost" title="Gỡ phím" onClick={() => onChange(null)}><X size={15} /></button>
      )}
      {error && <small className="warn-text">{error}</small>}
      {owner && !listening && <small className="muted">Phím này đang gán cho “{owner.name}” — lưu sẽ chuyển sang bài này.</small>}
    </div>
  )
}

/** Gán bài cho 1 ô phím trên Hotkey pad */
export function AssignKeyDialog({ keyCode }: { keyCode: string }) {
  const tracks = useApp((s) => s.tracks)
  const labels = useApp((s) => s.labels)
  const [q, setQ] = useState('')
  const current = tracks.find((t) => t.hotkey === keyCode)
  const list = labels.flatMap((l) => tracks.filter((t) => t.labelId === l.id && t.name.toLowerCase().includes(q.toLowerCase())))

  const assign = (id: string) => {
    void actions.updateTrack(id, { hotkey: keyCode })
    closeDialog()
  }

  return (
    <Modal title={<>Gán bài cho phím <Kbd k={keyCode} /></>} icon={<Keyboard size={18} />}
      footer={<>
        {current && <button className="btn danger" onClick={() => {
          void actions.updateTrack(current.id, { hotkey: null })
          closeDialog()
        }}>Gỡ “{current.name}”</button>}
        <span className="spacer" />
        <button className="btn" onClick={closeDialog}>Đóng</button>
      </>}>
      <div className="search-box">
        <Search size={15} />
        <input className="input" placeholder="Tìm bài…" value={q} autoFocus onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="pick-list">
        {!getState().tracks.length && <p className="muted center pad">Chưa có bài nào. Hãy tải nhạc lên trước.</p>}
        {list.map((t) => {
          const l = labels.find((x) => x.id === t.labelId)!
          return (
            <button key={t.id} className={`pick ${t.id === current?.id ? 'on' : ''}`} style={{ '--c': l.color } as React.CSSProperties} onClick={() => assign(t.id)}>
              <span className="ls-dot"><LabelIcon name={l.icon} size={13} /></span>
              <span className="pick-name">{t.name}</span>
              {t.hotkey && <Kbd k={t.hotkey} />}
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
