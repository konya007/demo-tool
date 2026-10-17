import { useEffect, useRef, useState } from 'react'
import { FileAudio, Tags, Trash2, Upload, X } from 'lucide-react'
import { actions, probeDuration, toast, uid, useApp } from '../../lib/store'
import { closeDialog } from '../../lib/ui'
import { COLOR_SWATCHES, SFX_LABEL_ID } from '../../lib/defaults'
import { fmtSize, fmtTime, stripExt } from '../../lib/format'
import type { UploadDraft } from '../../lib/types'
import { KindToggle, LabelIcon, Modal } from '../Common'

/** Gợi ý loại: thuộc nhãn hiệu ứng hoặc tên file giống hiệu ứng → hiệu ứng */
const kindFor = (labelId: string, file: File) =>
  labelId === SFX_LABEL_ID || /sfx|effect|hieu.?ung|vo.?tay|applause/i.test(file.name) ? 'sfx' as const : 'music' as const

const isAudio = (f: File) => f.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac|opus|webm)$/i.test(f.name)

export function UploadDialog({ files, labelId }: { files?: File[]; labelId?: string }) {
  const labels = useApp((s) => s.labels)
  const [drafts, setDrafts] = useState<UploadDraft[]>([])
  const [defaultLabel, setDefaultLabel] = useState(labelId ?? '')
  const [saving, setSaving] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const addFiles = (list: File[]) => {
    const audio = list.filter(isAudio)
    if (audio.length < list.length) toast(`Bỏ qua ${list.length - audio.length} file không phải âm thanh`, 'error')
    const next = audio.map((file) => ({ key: uid(), file, name: stripExt(file.name), labelId: defaultLabel, kind: kindFor(defaultLabel, file), duration: 0 }))
    setDrafts((d) => [...d, ...next])
    next.forEach((d) =>
      probeDuration(d.file).then((duration) =>
        setDrafts((all) => all.map((x) => (x.key === d.key ? { ...x, duration } : x)))))
  }

  useEffect(() => {
    if (files?.length) addFiles(files)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const update = (key: string, patch: Partial<UploadDraft>) =>
    setDrafts((d) => d.map((x) => (x.key === key ? { ...x, ...patch } : x)))

  const applyAll = (id: string) => {
    setDefaultLabel(id)
    if (id) setDrafts((d) => d.map((x) => ({ ...x, labelId: id, kind: kindFor(id, x.file) })))
  }

  const missing = drafts.filter((d) => !d.labelId || !d.name.trim())
  const canSave = drafts.length > 0 && !missing.length && !saving

  const save = async () => {
    setSaving(true)
    let i = 0
    for (const d of drafts) {
      await actions.addTrack(d.file, { name: d.name.trim(), labelId: d.labelId, kind: d.kind, duration: d.duration || undefined })
      setProgress(++i / drafts.length)
    }
    toast(`Đã thêm ${drafts.length} bài nhạc`, 'success')
    closeDialog()
  }

  return (
    <Modal wide title="Tải nhạc lên" icon={<Upload size={18} />}
      footer={
        <>
          {missing.length > 0 && drafts.length > 0 && (
            <span className="warn-text">{missing.length} bài chưa gắn nhãn hoặc chưa có tên</span>
          )}
          <span className="spacer" />
          <button className="btn" onClick={closeDialog}>Hủy</button>
          <button className="btn primary" disabled={!canSave} onClick={save}>
            {saving ? `Đang lưu ${Math.round(progress * 100)}%` : `Thêm ${drafts.length || ''} bài`}
          </button>
        </>
      }>
      <div className={`dropzone ${dragOver ? 'over' : ''} ${drafts.length ? 'compact' : ''}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(false)
          addFiles([...e.dataTransfer.files])
        }}>
        <FileAudio size={drafts.length ? 20 : 34} />
        <div>
          <b>Kéo thả file nhạc vào đây</b> hoặc <u>chọn file</u>
          <small>MP3, WAV, M4A, OGG, FLAC… · lưu trong trình duyệt (IndexedDB)</small>
        </div>
        <input ref={input} type="file" accept="audio/*" multiple hidden
          onChange={(e) => {
            addFiles([...(e.target.files ?? [])])
            e.target.value = ''
          }} />
      </div>

      {drafts.length > 0 && (
        <>
          <div className="apply-all">
            <Tags size={15} />
            <span>Gắn nhãn cho tất cả:</span>
            <LabelSelect value={defaultLabel} onChange={applyAll} labels={labels} />
          </div>
          <div className="draft-list">
            {drafts.map((d) => (
              <div key={d.key} className={`draft ${!d.labelId ? 'need-label' : ''}`}>
                <div className="draft-main">
                  <input className="input" value={d.name} placeholder="Tên bài"
                    onChange={(e) => update(d.key, { name: e.target.value })} />
                  <span className="draft-meta" title={d.file.name}>
                    {d.file.name} · {fmtSize(d.file.size)} · {d.duration ? fmtTime(d.duration) : '…'}
                  </span>
                </div>
                <KindToggle compact value={d.kind} onChange={(kind) => update(d.key, { kind })} />
                <LabelSelect value={d.labelId} onChange={(id) => update(d.key, { labelId: id, kind: kindFor(id, d.file) })} labels={labels} />
                <button className="icon-btn ghost danger" title="Bỏ file này"
                  onClick={() => setDrafts((all) => all.filter((x) => x.key !== d.key))}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  )
}

/** Chọn nhãn dạng dropdown có màu + icon */
export function LabelSelect({ value, onChange, labels }: {
  value: string
  onChange: (id: string) => void
  labels: { id: string; name: string; color: string; icon: string }[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const current = labels.find((l) => l.id === value)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className={`label-select ${open ? 'open' : ''} ${current ? '' : 'empty'}`} ref={ref}
      style={{ '--c': current?.color ?? 'var(--danger)' } as React.CSSProperties}>
      <button type="button" className="ls-btn" onClick={() => setOpen(!open)}>
        {current ? <><LabelIcon name={current.icon} size={14} /> {current.name}</> : <><X size={14} /> Chọn nhãn…</>}
      </button>
      {open && (
        <div className="ls-menu">
          {labels.map((l) => (
            <button key={l.id} type="button" className={l.id === value ? 'on' : ''}
              style={{ '--c': l.color } as React.CSSProperties}
              onClick={() => {
                onChange(l.id)
                setOpen(false)
              }}>
              <span className="ls-dot"><LabelIcon name={l.icon} size={13} /></span>{l.name}
            </button>
          ))}
          <form className="ls-new" onSubmit={async (e) => {
            e.preventDefault()
            const el = e.currentTarget.elements.namedItem('name') as HTMLInputElement
            const name = el.value.trim()
            if (!name) return
            const color = COLOR_SWATCHES[Math.floor(Math.random() * COLOR_SWATCHES.length)]
            const label = await actions.createLabel({ name, color, icon: 'Music' })
            onChange(label.id)
            setOpen(false)
          }}>
            <input name="name" className="input" placeholder="+ Tạo nhãn mới, Enter để lưu" />
          </form>
        </div>
      )}
    </div>
  )
}
