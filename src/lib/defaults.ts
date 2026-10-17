import type { Label, Settings } from './types'

export const DEFAULT_LABELS: Label[] = [
  { id: 'intro', name: 'Nhạc dạo đầu', color: '#818cf8', icon: 'Sunrise', order: 0 },
  { id: 'welcome', name: 'Nhạc chào đón', color: '#34d399', icon: 'DoorOpen', order: 1 },
  { id: 'introduce', name: 'Nhạc giới thiệu', color: '#38bdf8', icon: 'Mic', order: 2 },
  { id: 'award', name: 'Nhạc trao giải', color: '#fbbf24', icon: 'Trophy', order: 3 },
  { id: 'break', name: 'Nhạc giải lao - giải trí', color: '#f472b6', icon: 'Coffee', order: 4 },
  { id: 'ending', name: 'Nhạc kết thúc', color: '#a78bfa', icon: 'Flag', order: 5 },
  { id: 'sfx', name: 'Hiệu ứng âm thanh', color: '#2dd4bf', icon: 'Sparkles', order: 6 },
]

export const DEFAULT_SETTINGS: Settings = {
  volumeFadeMs: 1500,
  crossfadeMs: 2500,
  fadeInMs: 1000,
  stopFadeMs: 2000,
  pauseFadeMs: 500,
  duckRatio: 0.5,
  duckFadeMs: 600,
  duckMode: 'toggle',
  volumeStep: 5,
  seekStep: 5,
  autoNext: false,
  volume: 70,
  sfxVolume: 100,
  collapsed: [],
}

export const COLOR_SWATCHES = [
  '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#2dd4bf',
  '#38bdf8', '#60a5fa', '#818cf8', '#a78bfa', '#e879f9', '#f472b6',
  '#94a3b8', '#fde047',
]

/** Phím cố định của hệ thống — không cho gán làm phím tắt bài nhạc */
export const RESERVED_KEYS = new Set([' ', 'ENTER', 'ESCAPE', 'P', 'M', 'L', 'N', 'S', 'X', '?', '/', '[', ']',
  'ARROWUP', 'ARROWDOWN', 'ARROWLEFT', 'ARROWRIGHT', 'TAB'])

/** Nhãn mà bài thuộc về sẽ mặc định là hiệu ứng */
export const SFX_LABEL_ID = 'sfx'

export const PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
