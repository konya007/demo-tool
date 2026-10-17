import { useRef, useState } from 'react'
import { ChevronDown, MicVocal, Volume2, VolumeX, Timer, Zap, Square } from 'lucide-react'
import { engine } from '../lib/audioEngine'
import { actions, useApp } from '../lib/store'
import { setSfxVolume, setVolume } from '../lib/player'
import { useEngine, useFrame } from '../lib/useEngine'
import { HelpTip, Kbd } from './Common'

const PRESETS = [0, 20, 40, 60, 80, 100]
const FADE_CHOICES = [300, 800, 1500, 3000, 5000]

export function VolumePanel() {
  const es = useEngine()
  const settings = useApp((s) => s.settings)
  const [more, setMore] = useState(false)

  const actualRef = useRef<HTMLDivElement>(null)
  const pctRef = useRef<HTMLSpanElement>(null)
  const arrowRef = useRef<HTMLSpanElement>(null)
  const meterRef = useRef<HTMLDivElement>(null)
  const peak = useRef(0)

  useFrame(() => {
    const lv = engine.getLevels()
    const eff = Math.round(lv.effective * 100)
    const target = es.volume * (es.ducked ? settings.duckRatio : 1) * (es.muted ? 0 : 1)
    if (actualRef.current) actualRef.current.style.width = `${lv.master * 100}%`
    if (pctRef.current) pctRef.current.textContent = String(eff)
    if (arrowRef.current) {
      const moving = Math.abs(eff - target) >= 1
      arrowRef.current.textContent = moving ? `→ ${Math.round(target)}%` : ''
      arrowRef.current.classList.toggle('show', moving)
    }
    if (meterRef.current) {
      const m = engine.getMeter()
      peak.current = Math.max(m, peak.current * 0.94)
      meterRef.current.style.setProperty('--m', String(m))
      meterRef.current.style.setProperty('--p', String(peak.current))
    }
  })

  return (
    <section className="panel volume">
      <div className="panel-head">
        <span className="panel-title"><Volume2 size={15} /> Âm lượng</span>
        <HelpTip section="volume" />
      </div>

      <div className="vol-readout">
        <span className="vol-big"><span ref={pctRef}>{es.volume}</span><small>%</small></span>
        <span className="vol-arrow" ref={arrowRef} />
        <span className="vol-target">Mức đặt: <b>{es.volume}%</b></span>
      </div>

      <div className="fader">
        <div className="fader-track"><div className="fader-actual" ref={actualRef} /></div>
        <input type="range" min={0} max={100} value={es.volume} aria-label="Âm lượng tổng"
          onChange={(e) => setVolume(Number(e.target.value))} />
      </div>
      <div className="meter" ref={meterRef}><div className="meter-fill" /><div className="meter-peak" /></div>

      <div className="presets">
        {PRESETS.map((p) => (
          <button key={p} className={`chip-btn ${es.volume === p ? 'on' : ''}`} onClick={() => setVolume(p)}>{p}</button>
        ))}
      </div>

      <div className="duck-row">
        <button className={`duck-btn ${es.ducked ? 'on' : ''}`}
          onPointerDown={() => settings.duckMode === 'hold' && engine.setDuck(true)}
          onPointerUp={() => settings.duckMode === 'hold' && engine.setDuck(false)}
          onPointerLeave={() => settings.duckMode === 'hold' && es.ducked && engine.setDuck(false)}
          onClick={() => settings.duckMode === 'toggle' && engine.setDuck(!es.ducked)}>
          <MicVocal size={20} />
          <span className="duck-text">
            <b>{es.ducked ? 'Đang giảm cho MC' : 'Giảm nhanh'}</b>
            <small>
              MC nói · {es.volume}% → {Math.round(es.volume * settings.duckRatio)}%
              {settings.duckMode === 'hold' ? ' · giữ' : ''}
            </small>
          </span>
          <Kbd k=" " />
        </button>
        <button className={`mute-btn ${es.muted ? 'on' : ''}`} title="Tắt tiếng (M)" onClick={() => engine.setMuted(!es.muted)}>
          {es.muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          <Kbd k="M" />
        </button>
        <HelpTip section="duck" />
      </div>

      <div className={`sfx-row ${es.sfx.length ? 'active' : ''}`}>
        <span className="sfx-label" title="Âm lượng riêng cho hiệu ứng phát chồng (không bị giảm nhanh)"><Zap size={14} /> Hiệu ứng</span>
        <input type="range" min={0} max={100} value={es.sfxVolume} aria-label="Âm lượng hiệu ứng"
          onChange={(e) => setSfxVolume(Number(e.target.value))} />
        <b>{es.sfxVolume}%</b>
        <button className="icon-btn ghost" disabled={!es.sfx.length} title="Dừng tất cả hiệu ứng (X)" onClick={() => engine.stopSfx()}>
          <Square size={13} />
        </button>
        <HelpTip section="sfx" />
      </div>

      <button className={`more-toggle ${more ? 'open' : ''}`} onClick={() => setMore(!more)}>
        <Timer size={14} /> Chuyển mượt {(settings.volumeFadeMs / 1000).toFixed(1)}s · Giảm còn {Math.round(settings.duckRatio * 100)}%
        <ChevronDown size={14} className="chev" />
      </button>
      <div className={`collapse ${more ? 'open' : ''}`}>
        <div className="collapse-inner">
          <div className="field">
            <label>Thời gian chuyển âm lượng</label>
            <div className="seg">
              {FADE_CHOICES.map((ms) => (
                <button key={ms} className={settings.volumeFadeMs === ms ? 'on' : ''}
                  onClick={() => actions.updateSettings({ volumeFadeMs: ms })}>{ms / 1000}s</button>
              ))}
            </div>
          </div>
          <div className="field">
            <label>Giảm nhanh còn <b>{Math.round(settings.duckRatio * 100)}%</b> âm lượng hiện tại</label>
            <input type="range" min={5} max={90} step={5} value={Math.round(settings.duckRatio * 100)}
              onChange={(e) => actions.updateSettings({ duckRatio: Number(e.target.value) / 100 })} />
          </div>
          <div className="field">
            <label>Chế độ phím Space</label>
            <div className="seg">
              <button className={settings.duckMode === 'toggle' ? 'on' : ''} onClick={() => actions.updateSettings({ duckMode: 'toggle' })}>Bấm bật / tắt</button>
              <button className={settings.duckMode === 'hold' ? 'on' : ''} onClick={() => actions.updateSettings({ duckMode: 'hold' })}>Giữ để giảm</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
