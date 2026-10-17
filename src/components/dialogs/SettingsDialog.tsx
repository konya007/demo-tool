import { useEffect, useState } from 'react'
import { HardDrive, Settings as Gear } from 'lucide-react'
import { actions, useApp } from '../../lib/store'
import { DEFAULT_SETTINGS } from '../../lib/defaults'
import { fmtSize } from '../../lib/format'
import type { Settings } from '../../lib/types'
import { HelpTip, Modal, Switch } from '../Common'

type NumKey = { [K in keyof Settings]: Settings[K] extends number ? K : never }[keyof Settings]

function Slider({ k, label, min, max, step, unit = 's', scale = 1000 }: {
  k: NumKey; label: string; min: number; max: number; step: number; unit?: string; scale?: number
}) {
  const v = useApp((s) => s.settings[k])
  const shown = v / scale
  return (
    <div className="slider-field">
      <div className="sf-head">
        <label>{label}</label>
        <b>{unit === '%' ? Math.round(shown * 100) : Number.isInteger(shown) ? shown : shown.toFixed(1)}{unit}</b>
      </div>
      <input type="range" min={min} max={max} step={step} value={v}
        onChange={(e) => actions.updateSettings({ [k]: Number(e.target.value) })} />
    </div>
  )
}

export function SettingsDialog() {
  const s = useApp((st) => st.settings)
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(null)
  const [confirm, setConfirm] = useState(false)

  useEffect(() => {
    navigator.storage?.estimate?.().then((e) => setUsage({ used: e.usage ?? 0, quota: e.quota ?? 0 }))
  }, [])

  return (
    <Modal title="Cài đặt" icon={<Gear size={18} />}
      footer={<>
        <button className="btn" onClick={() => {
          const { volume, collapsed, ...rest } = DEFAULT_SETTINGS
          void volume; void collapsed
          actions.updateSettings(rest)
        }}>Khôi phục mặc định</button>
      </>}>
      <h4 className="sec">Chuyển mượt <HelpTip section="transition" /></h4>
      <Slider k="volumeFadeMs" label="Chuyển âm lượng (VD 100% → 40%)" min={0} max={8000} step={100} />
      <Slider k="crossfadeMs" label="Đổi nhạc (crossfade bài cũ → bài mới)" min={0} max={10000} step={100} />
      <Slider k="fadeInMs" label="Fade-in khi bắt đầu phát" min={0} max={8000} step={100} />
      <Slider k="stopFadeMs" label="Fade-out khi dừng" min={0} max={10000} step={100} />
      <Slider k="pauseFadeMs" label="Fade khi tạm dừng / tiếp tục" min={0} max={3000} step={50} />

      <h4 className="sec">Giảm nhanh cho MC <HelpTip section="duck" /></h4>
      <Slider k="duckRatio" label="Âm lượng còn lại khi giảm" min={0.05} max={0.9} step={0.05} unit="%" scale={1} />
      <Slider k="duckFadeMs" label="Thời gian giảm / khôi phục" min={0} max={4000} step={50} />
      <div className="field inline">
        <label>Phím Space</label>
        <div className="seg">
          <button className={s.duckMode === 'toggle' ? 'on' : ''} onClick={() => actions.updateSettings({ duckMode: 'toggle' })}>Bấm bật / tắt</button>
          <button className={s.duckMode === 'hold' ? 'on' : ''} onClick={() => actions.updateSettings({ duckMode: 'hold' })}>Giữ để giảm</button>
        </div>
      </div>

      <h4 className="sec">Phím tắt <HelpTip section="keys" /></h4>
      <Slider k="volumeStep" label="Bước âm lượng mỗi lần ↑ / ↓" min={1} max={20} step={1} unit="%" scale={100} />
      <Slider k="seekStep" label="Tua mỗi lần ← / →" min={1} max={30} step={1} scale={1} />

      <h4 className="sec">Phát nhạc</h4>
      <div className="field">
        <Switch checked={s.autoNext} onChange={(v) => actions.updateSettings({ autoNext: v })}
          label="Hết bài tự phát bài kế tiếp trong cùng nhãn" />
      </div>

      <h4 className="sec"><HardDrive size={14} /> Lưu trữ</h4>
      <div className="storage">
        {usage && (
          <>
            <div className="storage-bar"><div style={{ width: `${Math.min(100, (usage.used / (usage.quota || 1)) * 100)}%` }} /></div>
            <small className="muted">Đang dùng {fmtSize(usage.used)} / {fmtSize(usage.quota)} (IndexedDB của trình duyệt)</small>
          </>
        )}
        <button className={`btn small danger ${confirm ? 'confirm' : ''}`} onClick={() => {
          if (confirm) void actions.clearAll()
          setConfirm(!confirm)
        }}>
          {confirm ? 'Chắc chắn? Bấm lần nữa để xóa hết' : 'Xóa toàn bộ nhạc & nhãn'}
        </button>
      </div>
    </Modal>
  )
}
