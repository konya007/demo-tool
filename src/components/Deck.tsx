import { useRef } from 'react'
import { Pause, Play, Repeat, SkipBack, SkipForward, Square, ChevronsRight, Shuffle, Zap, X } from 'lucide-react'
import { engine } from '../lib/audioEngine'
import { useApp } from '../lib/store'
import { go, playNext, toggleLoop } from '../lib/player'
import { useEngine, useFrame } from '../lib/useEngine'
import { fmtTime } from '../lib/format'
import { HelpTip, Kbd, LabelIcon } from './Common'

export function Deck() {
  const es = useEngine()
  const track = useApp((s) => s.tracks.find((t) => t.id === es.trackId))
  const label = useApp((s) => s.labels.find((l) => l.id === track?.labelId))
  const active = es.status !== 'idle' && !!track

  const remainRef = useRef<HTMLDivElement>(null)
  const elapsedRef = useRef<HTMLSpanElement>(null)
  const durRef = useRef<HTMLSpanElement>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const xfadeRef = useRef<HTMLDivElement>(null)

  useFrame(() => {
    const { time, duration } = engine.getTime()
    const lv = engine.getLevels()
    if (remainRef.current) remainRef.current.textContent = active ? `-${fmtTime(duration - time)}` : '--:--'
    if (elapsedRef.current) elapsedRef.current.textContent = fmtTime(time)
    if (durRef.current) durRef.current.textContent = fmtTime(duration)
    if (barRef.current) barRef.current.style.transform = `scaleX(${duration ? time / duration : 0})`
    if (remainRef.current) remainRef.current.classList.toggle('warn', active && !es.loop && duration - time < 15)
    if (xfadeRef.current) xfadeRef.current.classList.toggle('show', lv.crossfading || (active && lv.deck < 0.995 && es.status === 'playing'))
  })

  const seek = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const { duration } = engine.getTime()
    engine.seek(((e.clientX - r.left) / r.width) * duration)
  }

  return (
    <section className={`panel deck ${active ? 'is-active' : ''} ${es.status}`}
      style={{ '--c': label?.color ?? 'var(--accent)' } as React.CSSProperties}>
      <div className="panel-head">
        <span className="panel-title"><span className={`dot ${es.status}`} />
          {es.status === 'playing' ? 'Đang phát' : es.status === 'paused' ? 'Tạm dừng' : 'Sẵn sàng'}
        </span>
        <div ref={xfadeRef} className="xfade-badge"><Shuffle size={12} /> Đang chuyển nhạc</div>
        <HelpTip section="transition" />
      </div>

      <div className="deck-info">
        <div className="deck-art">
          {active ? <LabelIcon name={label?.icon ?? 'Music'} size={26} /> : <Play size={24} />}
          {es.status === 'playing' && <span className="ring" />}
        </div>
        <div className="deck-text">
          <div className="deck-title" title={track?.name}>{active ? track!.name : 'Chưa phát bài nào'}</div>
          {active && label && <span className="chip"><LabelIcon name={label.icon} size={12} /> {label.name}</span>}
        </div>
        <div className="deck-remain" ref={remainRef}>--:--</div>
      </div>

      <div className="seek" onPointerDown={(e) => {
        if (!active) return
        e.currentTarget.setPointerCapture(e.pointerId)
        seek(e)
      }} onPointerMove={(e) => e.buttons && active && seek(e)}>
        <div className="seek-fill" ref={barRef} />
      </div>
      <div className="seek-times"><span ref={elapsedRef}>00:00</span><span ref={durRef}>00:00</span></div>

      <div className="transport">
        <button className="t-btn" title="Bài trước cùng nhóm (Shift+N)" onClick={() => playNext(-1)}><SkipBack size={18} /></button>
        <button className="t-btn" title="Dừng với fade-out (S / Esc)" onClick={() => engine.stop()} disabled={!active}><Square size={17} /></button>
        <button className="t-btn t-main" title="Tạm dừng / Tiếp tục (P)" onClick={() => (active ? engine.togglePause() : void go())}>
          {es.status === 'playing' ? <Pause size={24} /> : <Play size={24} />}
        </button>
        <button className="t-btn" title="Bài tiếp cùng nhóm (N)" onClick={() => playNext(1)}><SkipForward size={18} /></button>
        <button className={`t-btn ${es.loop ? 'on' : ''}`} title="Lặp bài đang phát (L)" onClick={toggleLoop} disabled={!active}><Repeat size={17} /></button>
      </div>

      <SfxStrip />
      <CueCard />
    </section>
  )
}

/** Các hiệu ứng đang phát chồng */
function SfxStrip() {
  const ids = useEngine().sfx
  const tracks = useApp((s) => s.tracks)
  if (!ids.length) return null
  return (
    <div className="sfx-strip">
      {ids.map((id) => {
        const t = tracks.find((x) => x.id === id)
        return (
          <button key={id} className="sfx-chip" title="Bấm để dừng hiệu ứng" onClick={() => engine.stopSfx(id)}>
            <span className="eq"><i /><i /><i /></span><Zap size={12} /> {t?.name ?? 'Hiệu ứng'} <X size={12} />
          </button>
        )
      })}
    </div>
  )
}

function CueCard() {
  const cue = useApp((s) => s.tracks.find((t) => t.id === s.cueId))
  const label = useApp((s) => s.labels.find((l) => l.id === cue?.labelId))
  return (
    <div className={`cue ${cue ? '' : 'cue-empty'}`} style={{ '--c': label?.color ?? 'var(--line)' } as React.CSSProperties}>
      <div className="cue-text">
        <span className="cue-label">Tiếp theo <span className="muted">([ ] để chọn)</span></span>
        <span className="cue-name">{cue ? cue.name : 'Click 1 bài trong danh sách để chọn'}</span>
      </div>
      <button className="btn go" disabled={!cue} onClick={() => void go()} title="Phát bài tiếp theo (Enter)">
        GO <ChevronsRight size={16} /> <Kbd k="ENTER" />
      </button>
    </div>
  )
}
