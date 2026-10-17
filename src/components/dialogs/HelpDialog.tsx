import { useEffect, useRef } from 'react'
import { CircleHelp } from 'lucide-react'
import { useApp } from '../../lib/store'
import type { HelpSection } from '../../lib/ui'
import { Kbd, Modal } from '../Common'

const KEYS: [string[], string][] = [
  [[' '], 'Giảm nhanh âm lượng cho MC nói (bấm lại để khôi phục)'],
  [['ENTER'], 'GO — phát bài đang chọn (cue), cue tự nhảy sang bài kế tiếp'],
  [['P'], 'Tạm dừng / tiếp tục (có fade)'],
  [['S', 'ESCAPE'], 'Dừng nhạc với fade-out'],
  [['N'], 'Phát bài kế tiếp cùng nhãn (Shift+N: bài trước)'],
  [['[', ']'], 'Chọn (cue) bài trước / sau trong danh sách'],
  [['ARROWUP', 'ARROWDOWN'], 'Tăng / giảm âm lượng (chuyển mượt)'],
  [['ARROWLEFT', 'ARROWRIGHT'], 'Tua lùi / tới'],
  [['X'], 'Dừng tất cả hiệu ứng (SFX) đang phát chồng'],
  [['M'], 'Tắt / bật tiếng (fade)'],
  [['L'], 'Bật / tắt lặp bài đang phát'],
  [['/'], 'Tìm bài'],
  [['?'], 'Mở hướng dẫn này'],
]

export function HelpDialog({ section = 'keys' }: { section?: HelpSection }) {
  const s = useApp((st) => st.settings)
  const body = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = body.current?.querySelector(`[data-sec="${section}"]`)
    el?.scrollIntoView({ block: 'start' })
    el?.classList.add('flash')
  }, [section])

  const sec = (n: number) => (n / 1000).toFixed(1).replace('.0', '') + ' giây'

  return (
    <Modal wide title="Hướng dẫn sử dụng" icon={<CircleHelp size={18} />}>
      <div className="help" ref={body}>
        <section data-sec="keys">
          <h4>⌨️ Phím tắt điều khiển</h4>
          <p className="muted small">Phím tắt hoạt động khi không gõ chữ trong ô nhập và không mở hộp thoại.</p>
          <table className="keys">
            <tbody>
              {KEYS.map(([ks, desc]) => (
                <tr key={desc}><td>{ks.map((k) => <Kbd key={k} k={k} />)}</td><td>{desc}</td></tr>
              ))}
              <tr><td><Kbd k="1" /> … <Kbd k="0" /></td><td>Phát ngay bài đã gán phím (xem mục Phím phát nhanh)</td></tr>
            </tbody>
          </table>
        </section>

        <section data-sec="hotkeys">
          <h4>🎹 Phím phát nhanh (gán phím cho bài)</h4>
          <ol>
            <li>Ở bảng <b>Phím phát nhanh</b>, bấm vào ô trống (VD ô <Kbd k="1" />) rồi chọn bài muốn gán.</li>
            <li>Hoặc bấm biểu tượng bàn phím ở từng bài trong danh sách → bấm phím muốn gán. Có thể dùng số, chữ cái, F1–F12.</li>
            <li>Khi diễn: chỉ cần bấm phím đó, bài sẽ chuyển sang mượt (crossfade).</li>
            <li>Chuột phải vào ô để đổi bài; Backspace khi đang gán để gỡ phím.</li>
          </ol>
          <p className="muted small">Các phím hệ thống (Space, Enter, P, S, N, X, M, L, mũi tên, [ ], / , ?) không gán được.</p>
        </section>

        <section data-sec="volume">
          <h4>🔊 Âm lượng chuyển mượt</h4>
          <p>Khi đổi âm lượng (kéo thanh, bấm mức có sẵn hoặc <Kbd k="ARROWUP" /> <Kbd k="ARROWDOWN" />), âm lượng không nhảy đột ngột mà
            trượt dần tới mức mới trong <b>{sec(s.volumeFadeMs)}</b>. VD đang 100% bấm “40” → giảm đều về 40%.</p>
          <p>Thanh mờ phía sau là <b>âm lượng thực</b> đang trượt, nút kéo là <b>mức đặt</b>. Đổi thời gian ở mục “Chuyển mượt” ngay dưới hoặc trong Cài đặt.</p>
        </section>

        <section data-sec="duck">
          <h4>🎤 Giảm nhanh khi MC nói</h4>
          <p>Bấm <Kbd k=" " /> (hoặc nút “Giảm nhanh”) để hạ nhạc còn <b>{Math.round(s.duckRatio * 100)}%</b> âm lượng hiện tại
            (VD 70% → {Math.round(70 * s.duckRatio)}%) trong {sec(s.duckFadeMs)}. Bấm lại để trả về như cũ.</p>
          <p>Chế độ <b>Giữ để giảm</b>: giữ Space trong lúc MC nói, thả ra nhạc tự lên lại. Mức giảm không làm thay đổi mức âm lượng đã đặt.</p>
        </section>

        <section data-sec="transition">
          <h4>🔀 Đổi nhạc mượt</h4>
          <ul>
            <li>Phát bài khác khi đang có nhạc: bài cũ nhỏ dần, bài mới to dần cùng lúc trong <b>{sec(s.crossfadeMs)}</b>.</li>
            <li>Bắt đầu phát từ im lặng: fade-in {sec(s.fadeInMs)}. Dừng (<Kbd k="S" />): fade-out {sec(s.stopFadeMs)}.</li>
            <li>Tạm dừng / tiếp tục (<Kbd k="P" />): fade {sec(s.pauseFadeMs)}.</li>
            <li><b>Cue + GO</b>: click 1 bài để chọn sẵn (viền sáng), đến lúc thì bấm <Kbd k="ENTER" />. Đúp chuột để phát ngay.</li>
            <li>Kéo thả bài để đổi thứ tự hoặc chuyển sang nhãn khác.</li>
          </ul>
        </section>

        <section data-sec="sfx">
          <h4>⚡ Nhạc &amp; Hiệu ứng (phát chồng)</h4>
          <p>Mỗi bài có 1 trong 2 loại, chọn khi tải lên, trong “Sửa bài” hoặc bấm biểu tượng ⚡ ở từng bài:</p>
          <ul>
            <li><b>Nhạc</b>: phát bài này sẽ crossfade thay cho bài đang chạy. Chỉ 1 bài nhạc phát tại một thời điểm.</li>
            <li><b>Hiệu ứng</b> (VD tiếng vỗ tay, trống, chuông): <b>phát chồng</b> lên nhạc đang chạy, không làm dừng nhạc.
              Có thể nhiều hiệu ứng cùng lúc. Bấm lại (hoặc phím đã gán) để tắt, <Kbd k="X" /> để tắt hết.</li>
            <li>Hiệu ứng có thanh âm lượng riêng và <b>không bị</b> giảm nhanh (Space), để vỗ tay vẫn rõ khi MC nói.</li>
            <li>Bài thuộc nhãn “Hiệu ứng âm thanh” mặc định là hiệu ứng.</li>
          </ul>
        </section>

        <section data-sec="library">
          <h4>📦 Thư viện mẫu</h4>
          <p>Kho nhạc mẫu có sẵn cho sự kiện. Nhạc <b>không tự tải</b> khi mở trang để web nhẹ — chỉ khi bấm “Tải”, file mới được tải về và lưu
            trong trình duyệt (IndexedDB), dùng được cả khi mất mạng. Bấm vào ảnh bìa để nghe thử trước.</p>
        </section>
      </div>
    </Modal>
  )
}
