import type { Track } from './types'

/**
 * Fader: bọc 1 GainNode, làm việc ở miền "level" 0..1 (tuyến tính theo % người dùng thấy),
 * map sang gain thực bằng đường cong cảm nhận. Mọi ramp được lên lịch trên audio thread
 * nên vẫn mượt kể cả khi tab bị ẩn.
 */
class Fader {
  private from: number
  private to: number
  private start = 0
  private dur = 0

  constructor(
    private ctx: AudioContext,
    readonly node: GainNode,
    private map: (level: number) => number,
    initial: number,
  ) {
    this.from = this.to = initial
    node.gain.value = map(initial)
  }

  level(): number {
    const t = this.ctx.currentTime
    if (this.dur <= 0 || t >= this.start + this.dur) return this.to
    if (t <= this.start) return this.from
    return this.from + (this.to - this.from) * ((t - this.start) / this.dur)
  }

  target() {
    return this.to
  }

  isRamping() {
    return this.dur > 0 && this.ctx.currentTime < this.start + this.dur
  }

  rampTo(target: number, ms: number) {
    const now = this.ctx.currentTime
    const cur = this.level()
    const g = this.node.gain
    g.cancelScheduledValues(0)
    if (ms <= 15 || Math.abs(cur - target) < 1e-4) {
      g.setValueAtTime(this.map(target), now)
      this.from = this.to = target
      this.dur = 0
      return
    }
    const n = Math.max(2, Math.min(512, Math.ceil(ms / 8)))
    const curve = new Float32Array(n)
    for (let i = 0; i < n; i++) curve[i] = this.map(cur + ((target - cur) * i) / (n - 1))
    try {
      g.setValueCurveAtTime(curve, now, ms / 1000)
    } catch {
      g.setValueAtTime(this.map(cur), now)
      g.linearRampToValueAtTime(this.map(target), now + ms / 1000)
    }
    this.from = cur
    this.to = target
    this.start = now
    this.dur = ms / 1000
  }
}

const perceptual = (l: number) => l * l
const equalPower = (l: number) => Math.sin((l * Math.PI) / 2)

interface Deck {
  track: Track
  audio: HTMLAudioElement
  source: MediaElementAudioSourceNode
  fader: Fader
  url: string
  timer?: number
}

export type PlayStatus = 'idle' | 'playing' | 'paused'

export interface EngineState {
  trackId: string | null
  status: PlayStatus
  ducked: boolean
  muted: boolean
  loop: boolean
  volume: number // % mục tiêu
  /** id các hiệu ứng (SFX) đang phát chồng */
  sfx: string[]
  sfxVolume: number
}

export interface EngineConfig {
  volumeFadeMs: number
  crossfadeMs: number
  fadeInMs: number
  stopFadeMs: number
  pauseFadeMs: number
  duckRatio: number
  duckFadeMs: number
}

class AudioEngine {
  private ctx: AudioContext | null = null
  private master!: Fader
  private duck!: Fader
  private mute!: Fader
  private sfxBus!: Fader
  private sfxVoices = new Map<string, Deck>()
  analyser!: AnalyserNode
  private current: Deck | null = null
  private outgoing = new Set<Deck>()
  private listeners = new Set<() => void>()
  private stateSnapshot: EngineState
  config: EngineConfig = {
    volumeFadeMs: 1500, crossfadeMs: 2500, fadeInMs: 1000, stopFadeMs: 2000,
    pauseFadeMs: 500, duckRatio: 0.5, duckFadeMs: 600,
  }
  onEnded: ((trackId: string) => void) | null = null
  private initialVolume = 70

  constructor() {
    this.stateSnapshot = { trackId: null, status: 'idle', ducked: false, muted: false, loop: false, volume: 70, sfx: [], sfxVolume: 100 }
  }

  // ---------- state / subscribe ----------
  subscribe = (fn: () => void) => {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  getState = () => this.stateSnapshot
  private set(patch: Partial<EngineState>) {
    this.stateSnapshot = { ...this.stateSnapshot, ...patch }
    this.listeners.forEach((l) => l())
  }

  setInitialVolume(v: number, sfx: number) {
    this.initialVolume = v
    this.set({ volume: v, sfxVolume: sfx })
  }

  /** Tạo AudioContext (cần thao tác người dùng để trình duyệt cho phép phát) */
  ensure(): AudioContext {
    if (!this.ctx) {
      const ctx = new AudioContext({ latencyHint: 'playback' })
      const master = ctx.createGain()
      const duck = ctx.createGain()
      const mute = ctx.createGain()
      this.analyser = ctx.createAnalyser()
      this.analyser.fftSize = 1024
      this.analyser.smoothingTimeConstant = 0.6
      const sfxBus = ctx.createGain()
      master.connect(duck).connect(mute).connect(this.analyser).connect(ctx.destination)
      // SFX đi thẳng vào mute: không bị crossfade hay giảm nhanh (duck) ảnh hưởng
      sfxBus.connect(mute)
      this.ctx = ctx
      this.master = new Fader(ctx, master, perceptual, this.initialVolume / 100)
      this.duck = new Fader(ctx, duck, perceptual, 1)
      this.mute = new Fader(ctx, mute, perceptual, 1)
      this.sfxBus = new Fader(ctx, sfxBus, perceptual, this.stateSnapshot.sfxVolume / 100)
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  // ---------- phát nhạc ----------
  async play(track: Track, blob: Blob) {
    const ctx = this.ensure()
    const url = URL.createObjectURL(blob)
    const audio = new Audio()
    audio.src = url
    audio.loop = track.loop
    audio.preload = 'auto'
    const source = ctx.createMediaElementSource(audio)
    const gain = ctx.createGain()
    source.connect(gain).connect(this.master.node)
    const deck: Deck = { track, audio, source, fader: new Fader(ctx, gain, equalPower, 0), url }

    audio.addEventListener('ended', () => {
      if (this.current !== deck) return
      this.dispose(deck)
      this.current = null
      this.set({ status: 'idle' })
      this.onEnded?.(track.id)
    })

    const prev = this.current
    const wasPlaying = prev && !prev.audio.paused
    this.current = deck
    this.set({ trackId: track.id, status: 'playing', loop: track.loop })

    try {
      await audio.play()
    } catch (err) {
      if (this.current === deck) {
        // giữ lại bài cũ nếu bài mới không phát được
        this.current = prev
        this.set(prev
          ? { trackId: prev.track.id, status: wasPlaying ? 'playing' : 'paused', loop: prev.track.loop }
          : { status: 'idle' })
      }
      this.dispose(deck)
      throw err
    }
    if (this.current !== deck) return // đã bị bài khác chen ngang

    const fadeMs = wasPlaying ? this.config.crossfadeMs : this.config.fadeInMs
    deck.fader.rampTo(1, fadeMs)
    if (prev) this.fadeOutAndDispose(prev, wasPlaying ? this.config.crossfadeMs : 0)
  }

  private fadeOutAndDispose(deck: Deck, ms: number) {
    this.outgoing.add(deck)
    deck.fader.rampTo(0, ms)
    clearTimeout(deck.timer)
    deck.timer = window.setTimeout(() => this.dispose(deck), ms + 60)
  }

  private dispose(deck: Deck) {
    clearTimeout(deck.timer)
    this.outgoing.delete(deck)
    deck.audio.pause()
    try {
      deck.source.disconnect()
      deck.fader.node.disconnect()
    } catch { /* đã ngắt */ }
    deck.audio.removeAttribute('src')
    deck.audio.load()
    URL.revokeObjectURL(deck.url)
  }

  togglePause() {
    const d = this.current
    if (!d) return
    this.ensure()
    clearTimeout(d.timer)
    if (this.stateSnapshot.status === 'playing') {
      this.set({ status: 'paused' })
      d.fader.rampTo(0, this.config.pauseFadeMs)
      d.timer = window.setTimeout(() => d.audio.pause(), this.config.pauseFadeMs + 30)
    } else {
      this.set({ status: 'playing' })
      void d.audio.play()
      d.fader.rampTo(1, this.config.pauseFadeMs)
    }
  }

  /** Dừng với fade-out */
  stop(ms = this.config.stopFadeMs) {
    const d = this.current
    if (!d) return
    this.current = null
    this.set({ status: 'idle' })
    if (d.audio.paused) this.dispose(d)
    else this.fadeOutAndDispose(d, ms)
  }

  /** Dừng ngay lập tức mọi thứ (panic) */
  panic() {
    if (this.current) this.dispose(this.current)
    this.outgoing.forEach((d) => this.dispose(d))
    this.sfxVoices.forEach((d) => this.dispose(d))
    this.sfxVoices.clear()
    this.syncSfx()
    this.current = null
    this.set({ status: 'idle' })
  }

  seek(sec: number) {
    const d = this.current
    if (!d || !isFinite(d.audio.duration)) return
    d.audio.currentTime = Math.max(0, Math.min(d.audio.duration - 0.05, sec))
  }

  seekBy(delta: number) {
    if (this.current) this.seek(this.current.audio.currentTime + delta)
  }

  setLoop(loop: boolean) {
    if (this.current) this.current.audio.loop = loop
    this.set({ loop })
  }

  /** Bài đang phát bị xóa/sửa */
  syncTrack(track: Track) {
    const v = this.sfxVoices.get(track.id)
    if (v) v.audio.loop = track.loop
    if (this.current?.track.id === track.id) {
      this.current.track = track
      this.current.audio.loop = track.loop
      this.set({ loop: track.loop })
    }
  }

  // ---------- hiệu ứng (SFX) phát chồng ----------
  isSfxPlaying = (id: string) => this.sfxVoices.has(id)

  /** Phát SFX chồng lên nhạc; đang phát thì bấm lại để dừng */
  async toggleSfx(track: Track, blob: Blob) {
    if (this.sfxVoices.has(track.id)) return this.stopSfx(track.id)
    const ctx = this.ensure()
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    audio.loop = track.loop
    const source = ctx.createMediaElementSource(audio)
    const gain = ctx.createGain()
    source.connect(gain).connect(this.sfxBus.node)
    const voice: Deck = { track, audio, source, fader: new Fader(ctx, gain, perceptual, 1), url }
    this.sfxVoices.set(track.id, voice)
    this.syncSfx()
    audio.addEventListener('ended', () => {
      if (this.sfxVoices.get(track.id) === voice) this.sfxVoices.delete(track.id)
      this.dispose(voice)
      this.syncSfx()
    })
    try {
      await audio.play()
    } catch (err) {
      if (this.sfxVoices.get(track.id) === voice) this.sfxVoices.delete(track.id)
      this.dispose(voice)
      this.syncSfx()
      throw err
    }
  }

  stopSfx(id?: string, ms = 300) {
    const ids = id ? [id] : [...this.sfxVoices.keys()]
    for (const k of ids) {
      const v = this.sfxVoices.get(k)
      if (!v) continue
      this.sfxVoices.delete(k)
      v.fader.rampTo(0, ms)
      v.timer = window.setTimeout(() => this.dispose(v), ms + 60)
    }
    this.syncSfx()
  }

  private syncSfx() {
    this.set({ sfx: [...this.sfxVoices.keys()] })
  }

  setSfxVolume(pct: number) {
    const v = Math.round(Math.max(0, Math.min(100, pct)))
    this.set({ sfxVolume: v })
    if (this.ctx) this.sfxBus.rampTo(v / 100, 120)
  }

  // ---------- âm lượng ----------
  setVolume(pct: number, ms = this.config.volumeFadeMs) {
    const v = Math.round(Math.max(0, Math.min(100, pct)))
    this.set({ volume: v })
    if (!this.ctx) {
      this.initialVolume = v
      return
    }
    this.master.rampTo(v / 100, ms)
  }

  setDuck(on: boolean) {
    if (on === this.stateSnapshot.ducked) return
    this.set({ ducked: on })
    if (!this.ctx) this.ensure()
    this.duck.rampTo(on ? this.config.duckRatio : 1, this.config.duckFadeMs)
  }

  /** Cập nhật tỉ lệ duck khi đang duck */
  refreshDuck() {
    if (this.ctx && this.stateSnapshot.ducked) this.duck.rampTo(this.config.duckRatio, this.config.duckFadeMs)
  }

  setMuted(on: boolean) {
    if (on === this.stateSnapshot.muted) return
    this.set({ muted: on })
    if (!this.ctx) this.ensure()
    this.mute.rampTo(on ? 0 : 1, Math.min(this.config.volumeFadeMs, 800))
  }

  // ---------- đọc realtime cho UI ----------
  getTime() {
    const a = this.current?.audio
    if (!a) return { time: 0, duration: 0 }
    return { time: a.currentTime, duration: isFinite(a.duration) ? a.duration : this.current!.track.duration }
  }

  getLevels() {
    if (!this.ctx) {
      const v = this.stateSnapshot.volume / 100
      return { master: v, duck: 1, mute: 1, effective: v, deck: 0, transitioning: false, crossfading: false }
    }
    const master = this.master.level()
    const duck = this.duck.level()
    const mute = this.mute.level()
    return {
      master,
      duck,
      mute,
      effective: master * duck * mute,
      deck: this.current?.fader.level() ?? 0,
      transitioning: this.master.isRamping() || this.duck.isRamping() || this.mute.isRamping(),
      crossfading: this.outgoing.size > 0,
    }
  }

  private buf: Float32Array<ArrayBuffer> | null = null
  /** Mức RMS đầu ra 0..1 cho VU meter */
  getMeter(): number {
    if (!this.ctx) return 0
    if (!this.buf) this.buf = new Float32Array(this.analyser.fftSize)
    this.analyser.getFloatTimeDomainData(this.buf)
    let sum = 0
    for (let i = 0; i < this.buf.length; i++) sum += this.buf[i] * this.buf[i]
    return Math.min(1, Math.sqrt(sum / this.buf.length) * 2.2)
  }
}

export const engine = new AudioEngine()
