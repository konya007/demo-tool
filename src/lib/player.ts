import { engine } from './audioEngine'
import { actions, getState, toast } from './store'
import type { Track } from './types'

/** Danh sách bài theo thứ tự hiển thị (nhóm theo nhãn) */
export function orderedTracks(): Track[] {
  const { labels, tracks } = getState()
  return labels.flatMap((l) => tracks.filter((t) => t.labelId === l.id))
}

export async function playTrack(id: string) {
  const track = getState().tracks.find((t) => t.id === id)
  if (!track) return
  engine.ensure() // tạo AudioContext ngay trong thao tác người dùng
  const blob = await actions.getBlob(id)
  if (!blob) {
    toast(`Không tìm thấy dữ liệu của "${track.name}"`, 'error')
    return
  }
  try {
    await engine.play(track, blob)
  } catch (err) {
    toast(`Không phát được "${track.name}": ${(err as Error).message}`, 'error')
  }
}

/** GO: phát bài đang chọn (cue), rồi chuyển cue sang bài kế tiếp cùng nhãn */
export async function go() {
  const { cueId } = getState()
  if (!cueId) {
    engine.getState().trackId ? engine.togglePause() : toast('Chọn 1 bài trong danh sách trước (click vào bài)')
    return
  }
  const sibling = neighbor(cueId, 1, true)
  await playTrack(cueId)
  actions.setCue(sibling?.id ?? cueId)
}

export function neighbor(id: string, dir: 1 | -1, sameLabel: boolean): Track | undefined {
  const list = orderedTracks()
  const i = list.findIndex((t) => t.id === id)
  const t = list[i]
  if (!t) return undefined
  const next = list[i + dir]
  if (!next) return undefined
  return sameLabel && next.labelId !== t.labelId ? undefined : next
}

export function playNext(dir: 1 | -1 = 1) {
  const cur = engine.getState().trackId ?? getState().cueId
  if (!cur) return
  const n = neighbor(cur, dir, true)
  if (n) void playTrack(n.id)
  else toast('Đã hết bài trong nhóm này')
}

export function moveCue(dir: 1 | -1) {
  const list = orderedTracks()
  if (!list.length) return
  const { cueId } = getState()
  const i = list.findIndex((t) => t.id === cueId)
  const next = i < 0 ? list[0] : list[Math.max(0, Math.min(list.length - 1, i + dir))]
  actions.setCue(next.id)
  document.querySelector(`[data-track="${next.id}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
}

export function changeVolume(delta: number) {
  engine.setVolume(engine.getState().volume + delta)
  actions.updateSettings({ volume: engine.getState().volume })
}

export function setVolume(pct: number, ms?: number) {
  engine.setVolume(pct, ms)
  actions.updateSettings({ volume: engine.getState().volume })
}

export function toggleLoop() {
  const id = engine.getState().trackId
  if (!id) return
  const track = getState().tracks.find((t) => t.id === id)
  if (track) void actions.updateTrack(id, { loop: !track.loop })
}

engine.onEnded = (id) => {
  if (getState().settings.autoNext) {
    const n = neighbor(id, 1, true)
    if (n) void playTrack(n.id)
  }
}
