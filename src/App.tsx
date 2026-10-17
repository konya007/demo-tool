import { useEffect, useMemo, useRef, useState } from 'react'
import { AudioLines, FileAudio, Keyboard, Library, Search, Settings, Tags, Upload, X } from 'lucide-react'
import { actions, useApp } from './lib/store'
import { useHotkeys } from './lib/hotkeys'
import { openDialog, useDialog } from './lib/ui'
import { TrackList } from './components/TrackList'
import { Deck } from './components/Deck'
import { VolumePanel } from './components/VolumePanel'
import { HotkeyPad } from './components/HotkeyPad'
import { Kbd, Toasts } from './components/Common'
import { UploadDialog } from './components/dialogs/UploadDialog'
import { LibraryDialog } from './components/dialogs/LibraryDialog'
import { LabelsDialog } from './components/dialogs/LabelsDialog'
import { AssignKeyDialog, TrackDialog } from './components/dialogs/TrackDialog'
import { SettingsDialog } from './components/dialogs/SettingsDialog'
import { HelpDialog } from './components/dialogs/HelpDialog'

export default function App() {
  const ready = useApp((s) => s.ready)
  const search = useApp((s) => s.search)
  const trackCount = useApp((s) => s.tracks.length)
  const dialog = useDialog()
  const searchRef = useRef<HTMLInputElement>(null)
  const [fileDrag, setFileDrag] = useState(false)

  useEffect(() => {
    void actions.init()
  }, [])

  const hotkeyOpts = useMemo(() => ({
    openHelp: () => openDialog({ kind: 'help', section: 'keys' }),
    focusSearch: () => searchRef.current?.focus(),
  }), [])
  useHotkeys(hotkeyOpts)

  // Kéo file nhạc từ máy vào bất kỳ đâu
  useEffect(() => {
    let depth = 0
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files')
    const enter = (e: DragEvent) => {
      if (!hasFiles(e) || document.body.dataset.modal) return
      depth++
      setFileDrag(true)
    }
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return
      depth = Math.max(0, depth - 1)
      if (!depth) setFileDrag(false)
    }
    const over = (e: DragEvent) => hasFiles(e) && e.preventDefault()
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setFileDrag(false)
      if (document.body.dataset.modal) return
      const files = [...(e.dataTransfer?.files ?? [])]
      if (files.length) openDialog({ kind: 'upload', files })
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragleave', leave)
    window.addEventListener('dragover', over)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('dragover', over)
      window.removeEventListener('drop', drop)
    }
  }, [])

  if (!ready) return <div className="boot"><span className="eq big"><i /><i /><i /><i /></span></div>

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo"><AudioLines size={20} /></span>
          <div>
            <b>Stage Music</b>
            <small>Điều khiển nhạc sân khấu</small>
          </div>
        </div>

        <div className="search">
          <Search size={15} />
          <input ref={searchRef} placeholder="Tìm bài…" value={search}
            onChange={(e) => actions.setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' || e.key === 'Enter') {
                if (e.key === 'Escape') actions.setSearch('')
                e.currentTarget.blur()
              }
            }} />
          {search ? <button className="icon-btn ghost" onClick={() => actions.setSearch('')}><X size={14} /></button> : <Kbd k="/" />}
        </div>

        <nav className="actions">
          <button className="btn primary" onClick={() => openDialog({ kind: 'upload' })}><Upload size={16} /><span>Tải nhạc</span></button>
          <button className="btn" onClick={() => openDialog({ kind: 'library' })}><Library size={16} /><span>Thư viện mẫu</span></button>
          <button className="icon-btn" title="Quản lý nhãn" onClick={() => openDialog({ kind: 'labels' })}><Tags size={18} /></button>
          <button className="icon-btn" title="Phím tắt & hướng dẫn (?)" onClick={() => openDialog({ kind: 'help', section: 'keys' })}><Keyboard size={18} /></button>
          <button className="icon-btn" title="Cài đặt" onClick={() => openDialog({ kind: 'settings' })}><Settings size={18} /></button>
        </nav>
      </header>

      <main className="layout">
        <div className="col-list">
          <div className="list-head">
            <h2>Danh sách nhạc <span className="count">{trackCount}</span></h2>
            <span className="muted small hide-sm">Click: chọn · Đúp chuột: phát · Kéo thả: đổi nhóm/thứ tự</span>
          </div>
          <TrackList />
        </div>
        <aside className="col-side">
          <Deck />
          <VolumePanel />
          <HotkeyPad />
        </aside>
      </main>

      {fileDrag && (
        <div className="file-drop">
          <div><FileAudio size={44} /><b>Thả file nhạc để tải lên</b></div>
        </div>
      )}

      {dialog?.kind === 'upload' && <UploadDialog files={dialog.files} labelId={dialog.labelId} />}
      {dialog?.kind === 'library' && <LibraryDialog />}
      {dialog?.kind === 'labels' && <LabelsDialog />}
      {dialog?.kind === 'settings' && <SettingsDialog />}
      {dialog?.kind === 'help' && <HelpDialog section={dialog.section} />}
      {dialog?.kind === 'track' && <TrackDialog trackId={dialog.trackId} />}
      {dialog?.kind === 'assignKey' && <AssignKeyDialog keyCode={dialog.key} />}
      <Toasts />
    </div>
  )
}
