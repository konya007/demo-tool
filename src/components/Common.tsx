import { useEffect, useRef, type ReactNode } from 'react'
import {
  Award, Bell, Cake, Camera, CircleHelp, Clapperboard, Coffee, Crown, Disc3, DoorOpen, Drama, Drum, Flag, Flame,
  Flower2, Gamepad2, Gift, Guitar, HandHeart, Handshake, Headphones, Heart, Medal, Megaphone, Mic, MicVocal, Moon,
  Music, Music2, PartyPopper, Piano, Radio, Rocket, Siren, Smile, Sparkles, Star, Sun, Sunrise, Sunset, Ticket,
  Trophy, Users, Wine, X, Zap, type LucideIcon,
} from 'lucide-react'
import { closeDialog, openDialog, type HelpSection } from '../lib/ui'
import { useApp } from '../lib/store'
import { displayKey } from '../lib/hotkeys'
import type { TrackKind } from '../lib/types'

export const LABEL_ICONS: Record<string, LucideIcon> = {
  Sunrise, DoorOpen, Mic, MicVocal, Trophy, Award, Medal, Crown, Star, Sparkles, PartyPopper, Gift, Heart,
  HandHeart, Handshake, Users, Coffee, Gamepad2, Drama, Flame, Zap, Sunset, Flag, Bell, Megaphone, Radio, Disc3,
  Headphones, Guitar, Drum, Piano, Clapperboard, Camera, Smile, Rocket, Ticket, Cake, Wine, Flower2, Moon, Sun,
  Siren, Music, Music2,
}

export function LabelIcon({ name, size = 16 }: { name: string; size?: number }) {
  const Icon = LABEL_ICONS[name] ?? Music
  return <Icon size={size} strokeWidth={2.2} />
}

export function Modal({ title, icon, children, footer, wide, onClose = closeDialog }: {
  title: ReactNode
  icon?: ReactNode
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
  onClose?: () => void
}) {
  const panel = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    document.body.dataset.modal = '1'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.body.dataset.capturing) {
        e.stopPropagation()
        closeRef.current()
      }
    }
    window.addEventListener('keydown', onKey, true)
    panel.current?.querySelector<HTMLElement>('[autofocus], input, button')?.focus()
    return () => {
      delete document.body.dataset.modal
      window.removeEventListener('keydown', onKey, true)
    }
  }, [])
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} ref={panel} role="dialog" aria-modal="true">
        <header className="modal-head">
          <h2>{icon}{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Đóng"><X size={18} /></button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  )
}

/** Nút (?) mở hướng dẫn đúng mục */
export function HelpTip({ section, title = 'Hướng dẫn' }: { section: HelpSection; title?: string }) {
  return (
    <button className="help-tip" title={title} aria-label={title}
      onClick={(e) => {
        e.stopPropagation()
        openDialog({ kind: 'help', section })
      }}>
      <CircleHelp size={15} />
    </button>
  )
}

export function Kbd({ k }: { k: string }) {
  return <kbd className="kbd">{displayKey(k)}</kbd>
}

export function Toasts() {
  const toasts = useApp((s) => s.toasts)
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.tone}`}>{t.text}</div>
      ))}
    </div>
  )
}

/** Chọn loại bài: nhạc (crossfade) hay hiệu ứng (phát chồng) */
export function KindToggle({ value, onChange, compact }: { value: TrackKind; onChange: (k: TrackKind) => void; compact?: boolean }) {
  return (
    <div className={`seg kind-seg ${compact ? 'compact' : ''}`}>
      <button type="button" className={value === 'music' ? 'on' : ''} onClick={() => onChange('music')}
        title="Đổi bài: bài đang phát sẽ crossfade sang bài này">
        <Music size={13} /> Nhạc
      </button>
      <button type="button" className={value === 'sfx' ? 'on sfx' : ''} onClick={() => onChange('sfx')}
        title="Phát chồng lên nhạc đang chạy (VD tiếng vỗ tay)">
        <Zap size={13} /> Hiệu ứng
      </button>
    </div>
  )
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: ReactNode }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch-track"><span className="switch-thumb" /></span>
      {label && <span>{label}</span>}
    </label>
  )
}
