import { useSyncExternalStore } from 'react'
import { db } from './db'
import { DEFAULT_LABELS, DEFAULT_SETTINGS } from './defaults'
import { engine } from './audioEngine'
import type { Label, LibraryItem, Settings, Track } from './types'

export interface Toast {
  id: number
  text: string
  tone: 'info' | 'success' | 'error'
}

export interface AppState {
  ready: boolean
  tracks: Track[]
  labels: Label[]
  settings: Settings
  cueId: string | null
  search: string
  /** libraryId -> tiến độ 0..1 khi đang tải */
  downloads: Record<string, number>
  toasts: Toast[]
}

let state: AppState = {
  ready: false,
  tracks: [],
  labels: [],
  settings: DEFAULT_SETTINGS,
  cueId: null,
  search: '',
  downloads: {},
  toasts: [],
}

const listeners = new Set<() => void>()
function set(patch: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  state = { ...state, ...(typeof patch === 'function' ? patch(state) : patch) }
  listeners.forEach((l) => l())
}
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useApp<T>(selector: (s: AppState) => T): T {
  return useSyncExternalStore(subscribe, () => selector(state))
}
export const getState = () => state

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

function applyEngineConfig(s: Settings) {
  engine.config = {
    volumeFadeMs: s.volumeFadeMs,
    crossfadeMs: s.crossfadeMs,
    fadeInMs: s.fadeInMs,
    stopFadeMs: s.stopFadeMs,
    pauseFadeMs: s.pauseFadeMs,
    duckRatio: s.duckRatio,
    duckFadeMs: s.duckFadeMs,
  }
}

let toastSeq = 0
export function toast(text: string, tone: Toast['tone'] = 'info') {
  const id = ++toastSeq
  set((s) => ({ toasts: [...s.toasts, { id, text, tone }] }))
  setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3200)
}

/** Đọc thời lượng file audio */
export function probeDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob)
    const a = new Audio()
    const done = (d: number) => {
      URL.revokeObjectURL(url)
      resolve(isFinite(d) ? d : 0)
    }
    a.preload = 'metadata'
    a.onloadedmetadata = () => done(a.duration)
    a.onerror = () => done(0)
    a.src = url
  })
}

const sortTracks = (t: Track[]) => [...t].sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
const sortLabels = (l: Label[]) => [...l].sort((a, b) => a.order - b.order)

export const actions = {
  async init() {
    const [tracks, labels, saved] = await Promise.all([
      db.getAll<Track>('tracks'),
      db.getAll<Label>('labels'),
      db.get<Partial<Settings>>('kv', 'settings'),
    ])
    let finalLabels = labels
    if (!labels.length) {
      finalLabels = DEFAULT_LABELS
      await db.putMany('labels', DEFAULT_LABELS)
    }
    const settings = { ...DEFAULT_SETTINGS, ...saved }
    applyEngineConfig(settings)
    engine.setInitialVolume(settings.volume)
    set({ ready: true, tracks: sortTracks(tracks), labels: sortLabels(finalLabels), settings })
  },

  // ---------- settings ----------
  updateSettings(patch: Partial<Settings>) {
    const settings = { ...state.settings, ...patch }
    set({ settings })
    applyEngineConfig(settings)
    if ('duckRatio' in patch) engine.refreshDuck()
    void db.put('kv', settings, 'settings')
  },

  toggleCollapsed(labelId: string) {
    const c = state.settings.collapsed
    actions.updateSettings({ collapsed: c.includes(labelId) ? c.filter((x) => x !== labelId) : [...c, labelId] })
  },

  setSearch: (search: string) => set({ search }),
  setCue: (cueId: string | null) => set({ cueId }),

  // ---------- tracks ----------
  async addTrack(blob: Blob, meta: Pick<Track, 'name' | 'labelId'> & Partial<Track>) {
    const maxOrder = state.tracks.reduce((m, t) => Math.max(m, t.order), 0)
    const track: Track = {
      id: uid(),
      duration: meta.duration ?? (await probeDuration(blob)),
      size: blob.size,
      mime: blob.type || 'audio/mpeg',
      hotkey: null,
      loop: false,
      source: 'upload',
      createdAt: Date.now(),
      order: maxOrder + 1,
      ...meta,
    }
    await db.put('blobs', blob, track.id)
    await db.put('tracks', track)
    set((s) => ({ tracks: sortTracks([...s.tracks, track]) }))
    void navigator.storage?.persist?.()
    return track
  },

  async updateTrack(id: string, patch: Partial<Track>) {
    let tracks = state.tracks
    // phím tắt là duy nhất: gỡ khỏi bài khác
    if (patch.hotkey) {
      const clash = tracks.filter((t) => t.id !== id && t.hotkey === patch.hotkey)
      for (const t of clash) await db.put('tracks', { ...t, hotkey: null })
      tracks = tracks.map((t) => (clash.includes(t) ? { ...t, hotkey: null } : t))
    }
    const updated = tracks.map((t) => (t.id === id ? { ...t, ...patch } : t))
    const track = updated.find((t) => t.id === id)
    if (!track) return
    await db.put('tracks', track)
    set({ tracks: sortTracks(updated) })
    engine.syncTrack(track)
  },

  async deleteTrack(id: string) {
    if (engine.getState().trackId === id) engine.stop(400)
    await db.delete('tracks', id)
    await db.delete('blobs', id)
    set((s) => ({ tracks: s.tracks.filter((t) => t.id !== id), cueId: s.cueId === id ? null : s.cueId }))
  },

  /** Kéo thả: đổi nhãn và/hoặc vị trí (chèn trước beforeId) */
  async moveTrack(id: string, labelId: string, beforeId: string | null) {
    const track = state.tracks.find((t) => t.id === id)
    if (!track || id === beforeId) return
    const group = state.tracks.filter((t) => t.labelId === labelId && t.id !== id)
    let idx = beforeId ? group.findIndex((t) => t.id === beforeId) : group.length
    if (idx < 0) idx = group.length
    group.splice(idx, 0, { ...track, labelId })
    const updated = group.map((t, order) => ({ ...t, order }))
    await db.putMany('tracks', updated)
    const ids = new Set(updated.map((t) => t.id))
    set((s) => ({ tracks: sortTracks([...s.tracks.filter((t) => !ids.has(t.id)), ...updated]) }))
  },

  getBlob: (id: string) => db.get<Blob>('blobs', id),

  // ---------- labels ----------
  async saveLabel(label: Label) {
    await db.put('labels', label)
    set((s) => {
      const exists = s.labels.some((l) => l.id === label.id)
      return { labels: sortLabels(exists ? s.labels.map((l) => (l.id === label.id ? label : l)) : [...s.labels, label]) }
    })
  },

  async createLabel(partial: Omit<Label, 'id' | 'order'>) {
    const label: Label = { ...partial, id: uid(), order: state.labels.length }
    await actions.saveLabel(label)
    return label
  },

  async moveLabel(id: string, dir: -1 | 1) {
    const list = [...state.labels]
    const i = list.findIndex((l) => l.id === id)
    const j = i + dir
    if (i < 0 || j < 0 || j >= list.length) return
    ;[list[i], list[j]] = [list[j], list[i]]
    const reordered = list.map((l, order) => ({ ...l, order }))
    await db.putMany('labels', reordered)
    set({ labels: reordered })
  },

  /** Xóa nhãn, chuyển các bài trong nhãn sang nhãn khác */
  async deleteLabel(id: string, moveTo: string) {
    const moved = state.tracks.filter((t) => t.labelId === id).map((t) => ({ ...t, labelId: moveTo }))
    if (moved.length) await db.putMany('tracks', moved)
    await db.delete('labels', id)
    set((s) => ({
      labels: s.labels.filter((l) => l.id !== id),
      tracks: sortTracks(s.tracks.map((t) => moved.find((m) => m.id === t.id) ?? t)),
    }))
  },

  // ---------- thư viện mẫu ----------
  async downloadLibraryItem(item: LibraryItem) {
    if (state.downloads[item.id] !== undefined) return
    if (state.tracks.some((t) => t.libraryId === item.id)) return
    set((s) => ({ downloads: { ...s.downloads, [item.id]: 0 } }))
    const done = () => set((s) => {
      const { [item.id]: _, ...rest } = s.downloads
      return { downloads: rest }
    })
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}library/${item.file}`)
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)
      const total = Number(res.headers.get('content-length')) || item.size
      const reader = res.body.getReader()
      const chunks: Uint8Array<ArrayBuffer>[] = []
      let loaded = 0
      for (;;) {
        const { done: end, value } = await reader.read()
        if (end) break
        chunks.push(value)
        loaded += value.length
        set((s) => ({ downloads: { ...s.downloads, [item.id]: Math.min(0.99, loaded / total) } }))
      }
      const ext = item.file.split('.').pop()
      const blob = new Blob(chunks, { type: ext === 'wav' ? 'audio/wav' : 'audio/mpeg' })
      // nhãn mặc định bị xóa thì tạo lại
      let labelId = item.label
      if (!state.labels.some((l) => l.id === labelId)) {
        const def = DEFAULT_LABELS.find((l) => l.id === labelId)
        if (def) await actions.saveLabel({ ...def, order: state.labels.length })
        else labelId = state.labels[0].id
      }
      await actions.addTrack(blob, { name: item.name, labelId, source: 'library', libraryId: item.id })
      done()
      return true
    } catch (err) {
      done()
      toast(`Tải "${item.name}" thất bại: ${(err as Error).message}`, 'error')
      return false
    }
  },

  async clearAll() {
    engine.panic()
    await db.clearAll()
    set({ tracks: [], cueId: null })
    await actions.init()
    toast('Đã xóa toàn bộ dữ liệu', 'success')
  },
}

export function useLabelMap() {
  const labels = useApp((s) => s.labels)
  return new Map(labels.map((l) => [l.id, l]))
}
