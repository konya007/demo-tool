import { useEffect, useRef, useSyncExternalStore } from 'react'
import { engine } from './audioEngine'

export const useEngine = () => useSyncExternalStore(engine.subscribe, engine.getState)

/** Gọi callback mỗi frame (dùng để cập nhật DOM trực tiếp, tránh re-render) */
export function useFrame(cb: () => void) {
  const ref = useRef(cb)
  ref.current = cb
  useEffect(() => {
    let id = 0
    const loop = () => {
      ref.current()
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [])
}
