import { useEffect } from 'react'
import { engine } from './audioEngine'
import { getState } from './store'
import { changeVolume, go, moveCue, playNext, playTrack, toggleLoop } from './player'

/** Chuẩn hóa phím từ KeyboardEvent thành chuỗi dùng để gán (VD: "1", "Q", "F2") */
export function keyName(e: KeyboardEvent | React.KeyboardEvent): string {
  return e.key === ' ' ? ' ' : e.key.toUpperCase()
}

export function displayKey(k: string) {
  const map: Record<string, string> = { ' ': 'Space', ARROWUP: '↑', ARROWDOWN: '↓', ARROWLEFT: '←', ARROWRIGHT: '→', ESCAPE: 'Esc', ENTER: 'Enter' }
  return map[k] ?? k
}

const isTyping = (el: EventTarget | null) =>
  el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) &&
  !(el instanceof HTMLInputElement && ['range', 'checkbox', 'radio', 'button'].includes(el.type))

export const modalOpen = () => document.body.dataset.modal === '1'

export function useHotkeys(opts: { openHelp: () => void; focusSearch: () => void }) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (modalOpen() || isTyping(e.target) || e.ctrlKey || e.metaKey || e.altKey) return
      const k = keyName(e)
      const { settings, tracks } = getState()
      let handled = true
      switch (k) {
        case ' ':
          if (e.repeat) break
          engine.setDuck(settings.duckMode === 'hold' ? true : !engine.getState().ducked)
          break
        case 'ENTER':
          if (!e.repeat) void go()
          break
        case 'P':
          engine.togglePause()
          break
        case 'S':
        case 'ESCAPE':
          engine.stop()
          break
        case 'M':
          engine.setMuted(!engine.getState().muted)
          break
        case 'L':
          toggleLoop()
          break
        case 'N':
          playNext(e.shiftKey ? -1 : 1)
          break
        case 'ARROWUP':
          changeVolume(settings.volumeStep)
          break
        case 'ARROWDOWN':
          changeVolume(-settings.volumeStep)
          break
        case 'ARROWRIGHT':
          engine.seekBy(settings.seekStep)
          break
        case 'ARROWLEFT':
          engine.seekBy(-settings.seekStep)
          break
        case ']':
          moveCue(1)
          break
        case '[':
          moveCue(-1)
          break
        case '?':
          opts.openHelp()
          break
        case '/':
          opts.focusSearch()
          break
        default: {
          const t = tracks.find((x) => x.hotkey === k)
          if (t && !e.repeat) void playTrack(t.id)
          else handled = !!t
        }
      }
      if (handled) {
        e.preventDefault()
        // tránh Space/Enter "click" luôn vào nút đang focus
        if (document.activeElement instanceof HTMLButtonElement) document.activeElement.blur()
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === ' ' && getState().settings.duckMode === 'hold' && !isTyping(e.target)) {
        engine.setDuck(false)
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [opts])
}
