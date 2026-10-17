import { useEffect, useState } from 'react'
import { Check, CloudDownload, Library, Play, Square, Trash2 } from 'lucide-react'
import { actions, toast, useApp } from '../../lib/store'
import { fmtSize } from '../../lib/format'
import { DEFAULT_LABELS } from '../../lib/defaults'
import type { LibraryItem } from '../../lib/types'
import { HelpTip, LabelIcon, Modal } from '../Common'

let manifestCache: LibraryItem[] | null = null

export function LibraryDialog() {
  const [items, setItems] = useState<LibraryItem[] | null>(manifestCache)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [preview, setPreview] = useState<{ id: string; audio: HTMLAudioElement } | null>(null)
  const tracks = useApp((s) => s.tracks)
  const downloads = useApp((s) => s.downloads)
  const labels = useApp((s) => s.labels)

  useEffect(() => {
    if (manifestCache) return
    fetch(`${import.meta.env.BASE_URL}library/manifest.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((m: { items: LibraryItem[] }) => {
        manifestCache = m.items
        setItems(m.items)
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  // dừng nghe thử khi đóng
  useEffect(() => () => preview?.audio.pause(), [preview])

  const labelOf = (key: string) => labels.find((l) => l.id === key) ?? DEFAULT_LABELS.find((l) => l.id === key)
  const owned = (id: string) => tracks.find((t) => t.libraryId === id)
  const cats = items ? [...new Set(items.map((i) => i.label))] : []
  const shown = items?.filter((i) => filter === 'all' || i.label === filter) ?? []
  const pending = shown.filter((i) => !owned(i.id) && downloads[i.id] === undefined)

  const togglePreview = (item: LibraryItem) => {
    preview?.audio.pause()
    if (preview?.id === item.id) return setPreview(null)
    // nghe thử stream trực tiếp, không lưu
    const audio = new Audio(`${import.meta.env.BASE_URL}library/${item.file}`)
    audio.volume = 0.6
    audio.play().catch(() => toast('Không nghe thử được', 'error'))
    audio.onended = () => setPreview(null)
    setPreview({ id: item.id, audio })
  }

  const downloadAll = async () => {
    for (const i of pending) await actions.downloadLibraryItem(i)
    toast(`Đã tải ${pending.length} bài vào thư viện của bạn`, 'success')
  }

  return (
    <Modal wide title={<>Thư viện mẫu <HelpTip section="library" /></>} icon={<Library size={18} />}
      footer={
        <>
          <span className="muted small">Nhạc chỉ được tải khi bạn bấm — sau đó lưu offline trong trình duyệt.</span>
          <span className="spacer" />
          <button className="btn primary" disabled={!pending.length} onClick={downloadAll}>
            <CloudDownload size={16} /> Tải tất cả ({pending.length})
          </button>
        </>
      }>
      {error && <p className="warn-text">Không tải được danh mục: {error}</p>}
      {!items && !error && <div className="skeleton-grid">{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton" />)}</div>}
      {items && (
        <>
          <div className="filter-chips">
            <button className={`chip-btn ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>Tất cả ({items.length})</button>
            {cats.map((c) => {
              const l = labelOf(c)
              return (
                <button key={c} className={`chip-btn ${filter === c ? 'on' : ''}`} style={{ '--c': l?.color } as React.CSSProperties}
                  onClick={() => setFilter(c)}>
                  <LabelIcon name={l?.icon ?? 'Music'} size={13} /> {l?.name ?? c} ({items.filter((i) => i.label === c).length})
                </button>
              )
            })}
          </div>
          <div className="market">
            {shown.map((item) => {
              const l = labelOf(item.label)
              const have = owned(item.id)
              const prog = downloads[item.id]
              return (
                <div key={item.id} className={`m-card ${have ? 'owned' : ''}`} style={{ '--c': l?.color } as React.CSSProperties}>
                  <button className={`m-art ${preview?.id === item.id ? 'playing' : ''}`} title="Nghe thử" onClick={() => togglePreview(item)}>
                    <LabelIcon name={l?.icon ?? 'Music'} size={22} />
                    <span className="m-play">{preview?.id === item.id ? <Square size={16} /> : <Play size={16} />}</span>
                  </button>
                  <div className="m-text">
                    <b title={item.name}>{item.name}</b>
                    <span>{l?.name} · {fmtSize(item.size)}</span>
                  </div>
                  {have ? (
                    <div className="m-owned">
                      <span className="badge-ok"><Check size={13} /> Đã có</span>
                      <button className="icon-btn ghost danger" title="Gỡ khỏi máy" onClick={() => void actions.deleteTrack(have.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : prog !== undefined ? (
                    <div className="m-progress"><div style={{ width: `${prog * 100}%` }} /><span>{Math.round(prog * 100)}%</span></div>
                  ) : (
                    <button className="btn small" onClick={() => void actions.downloadLibraryItem(item)}>
                      <CloudDownload size={14} /> Tải
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </Modal>
  )
}
