export interface Label {
  id: string
  name: string
  color: string
  icon: string
  order: number
}

export type TrackKind = 'music' | 'sfx'

export interface Track {
  id: string
  name: string
  labelId: string
  duration: number
  size: number
  mime: string
  hotkey: string | null
  loop: boolean
  /** music: đổi bài có crossfade; sfx: phát chồng lên nhạc đang chạy */
  kind: TrackKind
  source: 'upload' | 'library'
  libraryId?: string
  createdAt: number
  order: number
}

export interface Settings {
  /** Thời gian chuyển âm lượng mượt khi đổi volume (ms) */
  volumeFadeMs: number
  /** Thời gian crossfade khi đổi bài đang phát (ms) */
  crossfadeMs: number
  /** Fade-in khi bắt đầu phát lúc đang im lặng (ms) */
  fadeInMs: number
  /** Fade-out khi bấm dừng (ms) */
  stopFadeMs: number
  /** Fade khi tạm dừng / tiếp tục (ms) */
  pauseFadeMs: number
  /** Tỉ lệ âm lượng còn lại khi giảm nhanh (0.5 = còn một nửa) */
  duckRatio: number
  /** Thời gian chuyển khi giảm nhanh / khôi phục (ms) */
  duckFadeMs: number
  /** toggle: bấm Space để bật/tắt; hold: giữ Space để giảm, thả ra khôi phục */
  duckMode: 'toggle' | 'hold'
  volumeStep: number
  seekStep: number
  autoNext: boolean
  volume: number
  sfxVolume: number
  collapsed: string[]
}

export interface LibraryItem {
  id: string
  name: string
  file: string
  label: string
  size: number
}

export interface UploadDraft {
  key: string
  file: File
  name: string
  labelId: string
  kind: TrackKind
  duration: number
}
