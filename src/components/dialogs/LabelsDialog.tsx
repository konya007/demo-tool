import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Tags, Trash2 } from 'lucide-react'
import { actions, useApp } from '../../lib/store'
import { COLOR_SWATCHES } from '../../lib/defaults'
import type { Label } from '../../lib/types'
import { LABEL_ICONS, LabelIcon, Modal } from '../Common'
import { LabelSelect } from './UploadDialog'

export function LabelsDialog() {
  const labels = useApp((s) => s.labels)
  const tracks = useApp((s) => s.tracks)
  const [newName, setNewName] = useState('')

  const add = async () => {
    const name = newName.trim()
    if (!name) return
    await actions.createLabel({ name, color: COLOR_SWATCHES[labels.length % COLOR_SWATCHES.length], icon: 'Music' })
    setNewName('')
  }

  return (
    <Modal title="Quản lý nhãn" icon={<Tags size={18} />}>
      <p className="muted small">Mỗi bài nhạc thuộc 1 nhãn. Danh sách nhạc được nhóm theo thứ tự nhãn bên dưới.</p>
      <div className="label-list">
        {labels.map((l, i) => (
          <LabelRow key={l.id} label={l} count={tracks.filter((t) => t.labelId === l.id).length}
            first={i === 0} last={i === labels.length - 1} others={labels.filter((x) => x.id !== l.id)} />
        ))}
      </div>
      <form className="label-add" onSubmit={(e) => {
        e.preventDefault()
        void add()
      }}>
        <input className="input" value={newName} placeholder="Tên nhãn mới, VD: Nhạc khai mạc" onChange={(e) => setNewName(e.target.value)} />
        <button className="btn primary" disabled={!newName.trim()}><Plus size={16} /> Thêm nhãn</button>
      </form>
    </Modal>
  )
}

function LabelRow({ label, count, first, last, others }: {
  label: Label; count: number; first: boolean; last: boolean; others: Label[]
}) {
  const [name, setName] = useState(label.name)
  const [pop, setPop] = useState<'color' | 'icon' | 'delete' | null>(null)
  const [moveTo, setMoveTo] = useState(others[0]?.id ?? '')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => setName(label.name), [label.name])
  useEffect(() => {
    if (!pop) return
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setPop(null)
    window.addEventListener('mousedown', close)
    return () => window.removeEventListener('mousedown', close)
  }, [pop])

  const save = (patch: Partial<Label>) => void actions.saveLabel({ ...label, ...patch })

  return (
    <div className="label-row" ref={ref} style={{ '--c': label.color } as React.CSSProperties}>
      <button className="lr-icon" title="Đổi icon" onClick={() => setPop(pop === 'icon' ? null : 'icon')}>
        <LabelIcon name={label.icon} size={18} />
      </button>
      <button className="lr-color" title="Đổi màu" onClick={() => setPop(pop === 'color' ? null : 'color')} />
      <input className="input" value={name} onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && name !== label.name && save({ name: name.trim() })}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()} />
      <span className="lr-count">{count} bài</span>
      <button className="icon-btn ghost" disabled={first} title="Lên" onClick={() => void actions.moveLabel(label.id, -1)}><ArrowUp size={15} /></button>
      <button className="icon-btn ghost" disabled={last} title="Xuống" onClick={() => void actions.moveLabel(label.id, 1)}><ArrowDown size={15} /></button>
      <button className="icon-btn ghost danger" disabled={!others.length} title="Xóa nhãn"
        onClick={() => (count ? setPop(pop === 'delete' ? null : 'delete') : void actions.deleteLabel(label.id, ''))}>
        <Trash2 size={15} />
      </button>

      {pop === 'color' && (
        <div className="popover">
          <div className="swatches">
            {COLOR_SWATCHES.map((c) => (
              <button key={c} className={`swatch ${c === label.color ? 'on' : ''}`} style={{ background: c }} onClick={() => save({ color: c })} />
            ))}
            <label className="swatch custom" title="Màu tùy chọn">
              <input type="color" value={label.color} onChange={(e) => save({ color: e.target.value })} />
            </label>
          </div>
        </div>
      )}
      {pop === 'icon' && (
        <div className="popover">
          <div className="icon-grid">
            {Object.keys(LABEL_ICONS).map((n) => (
              <button key={n} className={n === label.icon ? 'on' : ''} title={n} onClick={() => {
                save({ icon: n })
                setPop(null)
              }}>
                <LabelIcon name={n} size={18} />
              </button>
            ))}
          </div>
        </div>
      )}
      {pop === 'delete' && (
        <div className="popover delete-pop">
          <p>Nhãn này có <b>{count} bài</b>. Chuyển các bài sang:</p>
          <LabelSelect value={moveTo} onChange={setMoveTo} labels={others} />
          <div className="row-end">
            <button className="btn small" onClick={() => setPop(null)}>Hủy</button>
            <button className="btn small danger" disabled={!moveTo} onClick={() => void actions.deleteLabel(label.id, moveTo)}>Xóa nhãn</button>
          </div>
        </div>
      )}
    </div>
  )
}
