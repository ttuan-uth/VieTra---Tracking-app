import { TriangleAlert, X } from 'lucide-react'
import styles from './TransportAlertBanner.module.css'
import type { JourneyAlert } from '../../sim/types'
import { dateTimeLabel, durationLabel } from '../../utils/date'

interface TransportAlertBannerProps {
  alert: JourneyAlert
  legLabel: string
  legIndex: number
  totalLegs: number
  onDismiss: () => void
}

export function TransportAlertBanner({
  alert,
  legLabel,
  legIndex,
  totalLegs,
  onDismiss,
}: TransportAlertBannerProps) {
  const critical = alert.severity === 'critical'
  return (
    <aside
      className={`${styles.banner} ${critical ? styles.critical : ''}`}
      aria-label="Cảnh báo vận chuyển đang mở"
      aria-live="polite"
    >
      <span className={styles.icon} aria-hidden="true">
        <TriangleAlert size={15} />
      </span>

      <div className={styles.body}>
        <p className={styles.kicker}>
          <span className={styles.kind}>{critical ? 'Sự cố' : 'Chậm trễ'}</span>
          <span className={styles.leg}>
            Chặng {legIndex >= 0 ? legIndex + 1 : '—'}/{totalLegs} · {legLabel}
          </span>
        </p>
        <p className={styles.title}>{alert.title}</p>
        <p className={styles.meta}>
          <span>{dateTimeLabel(alert.at)}</span>
          <span>Giờ mô phỏng</span>
          <span>Ảnh hưởng +{durationLabel(alert.impactMinutes)}</span>
        </p>
      </div>

      <button
        type="button"
        className={styles.dismiss}
        aria-label="Bỏ đánh dấu cảnh báo"
        onClick={onDismiss}
      >
        <X size={14} />
      </button>
    </aside>
  )
}
