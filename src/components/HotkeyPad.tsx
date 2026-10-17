import { Grid3x3, Plus } from 'lucide-react'
import { useApp } from '../lib/store'
import { engine } from '../lib/audioEngine'
import { playTrack } from '../lib/player'
import { useEngine } from '../lib/useEngine'
import { openDialog } from '../lib/ui'
import { PAD_KEYS } from '../lib/defaults'
import { HelpTip, Kbd, LabelIcon } from './Common'

export function HotkeyPad() {
  const tracks = useApp((s) => s.tracks)
  const labels = useApp((s) => s.labels)
  const es = useEngine()
  const byKey = new Map(tracks.filter((t) => t.hotkey).map((t) => [t.hotkey!, t]))
  const extra = tracks.filter((t) => t.hotkey && !PAD_KEYS.includes(t.hotkey))

  const slot = (key: string) => {
    const t = byKey.get(key)
    const label = labels.find((l) => l.id === t?.labelId)
    const playing = t && es.trackId === t.id && es.status === 'playing'
    return (
      <button key={key} className={`pad ${t ? '' : 'pad-empty'} ${playing ? 'is-playing' : ''}`}
        style={{ '--c': label?.color ?? 'var(--line)' } as React.CSSProperties}
        title={t ? `${t.name} — click để phát, chuột phải để đổi` : 'Gán bài cho phím này'}
        onClick={() => (t ? (playing ? engine.togglePause() : void playTrack(t.id)) : openDialog({ kind: 'assignKey', key }))}
        onContextMenu={(e) => {
          e.preventDefault()
          openDialog({ kind: 'assignKey', key })
        }}>
        <span className="pad-key">{key}</span>
        {t ? (
          <>
            <span className="pad-icon"><LabelIcon name={label?.icon ?? 'Music'} size={13} /></span>
            <span className="pad-name">{t.name}</span>
          </>
        ) : <Plus size={14} className="pad-plus" />}
      </button>
    )
  }

  return (
    <section className="panel pad-panel">
      <div className="panel-head">
        <span className="panel-title"><Grid3x3 size={15} /> Phím phát nhanh</span>
        <HelpTip section="hotkeys" />
      </div>
      <div className="pads">{PAD_KEYS.map(slot)}</div>
      {extra.length > 0 && (
        <div className="pad-extra">
          {extra.map((t) => (
            <button key={t.id} className="chip-btn" onClick={() => void playTrack(t.id)}>
              <Kbd k={t.hotkey!} /> {t.name}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
