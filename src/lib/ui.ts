import { useSyncExternalStore } from 'react'

export type Dialog =
  | { kind: 'upload'; files?: File[]; labelId?: string }
  | { kind: 'library' }
  | { kind: 'labels' }
  | { kind: 'settings' }
  | { kind: 'help'; section?: HelpSection }
  | { kind: 'track'; trackId: string }
  | { kind: 'assignKey'; key: string }

export type HelpSection = 'keys' | 'volume' | 'duck' | 'hotkeys' | 'library' | 'transition' | 'sfx'

let dialog: Dialog | null = null
const listeners = new Set<() => void>()

export function openDialog(d: Dialog) {
  dialog = d
  listeners.forEach((l) => l())
}
export function closeDialog() {
  dialog = null
  listeners.forEach((l) => l())
}
export function useDialog() {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
    () => dialog,
  )
}
