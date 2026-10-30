import { CircleAlert, RotateCcw, ShieldCheck } from 'lucide-react'
import styles from './SessionGate.module.css'

interface SessionGateProps {
  mode: 'loading' | 'error'
  message?: string | null
  onRetry?: () => void
  onSignOut?: () => void
}

export function SessionGate({ mode, message, onRetry, onSignOut }: SessionGateProps) {
  return (
    <div className={styles.page}>
      <section className={styles.panel} aria-live="polite">
        <span className={styles.mark} aria-hidden="true">
          V
        </span>
        <div className={styles.copy}>
          <h1>{mode === 'loading' ? 'Đang mở phiên vận hành' : 'Không tải được dữ liệu'}</h1>
          <p>
            {mode === 'loading'
              ? 'Đang xác thực cookie và tải booking, chứng từ, lô hàng từ máy chủ VieTra.'
              : message || 'API chưa phản hồi. Kiểm tra máy chủ rồi thử lại.'}
          </p>
        </div>
        {mode === 'loading' ? (
          <div className={styles.loadingRow} role="status">
            <span className={styles.spinner} aria-hidden="true" />
            <span className="mono">/api · đang kết nối</span>
          </div>
        ) : (
          <div className={styles.actions}>
            {onRetry && (
              <button type="button" className="btn btnPrimary" onClick={onRetry}>
                <RotateCcw size={14} /> Thử lại
              </button>
            )}
            {onSignOut && (
              <button type="button" className="btn" onClick={onSignOut}>
                Đăng xuất
              </button>
            )}
          </div>
        )}
        <footer className={styles.footer}>
          <ShieldCheck size={13} aria-hidden="true" />
          <span>Phiên đăng nhập dùng cookie HttpOnly; dữ liệu là dữ liệu mô phỏng.</span>
          {mode === 'error' && <CircleAlert size={13} aria-hidden="true" />}
        </footer>
      </section>
    </div>
  )
}
