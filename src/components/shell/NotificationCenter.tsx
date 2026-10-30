import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import {
  BadgeCheck,
  Bell,
  CheckCheck,
  FileWarning,
  MapPin,
  OctagonAlert,
  TriangleAlert,
  Truck,
} from 'lucide-react'
import styles from './NotificationCenter.module.css'
import type { NotificationType, UserNotification } from '../../types/domain'
import { dateTimeLabel } from '../../utils/date'

interface NotificationCenterProps {
  notifications: UserNotification[]
  anchorRef: RefObject<HTMLDivElement | null>
  onClose: () => void
  onMarkRead: (notificationId: string) => void
  onMarkAllRead: () => void
  onOpen: (notification: UserNotification) => void
}

const TYPE_LABEL: Record<NotificationType, string> = {
  'document-fix': 'Chứng từ cần bổ sung',
  'code-issued': 'Mã vận tải',
  handover: 'Bàn giao',
  'transport-alert': 'Cảnh báo vận chuyển',
}

function iconClass(notification: UserNotification): string {
  if (notification.type === 'document-fix') return styles.iconWarning
  if (notification.type === 'code-issued') return styles.iconSuccess
  if (notification.type === 'handover') return styles.iconHandover
  return notification.severity === 'critical' ? styles.iconDanger : styles.iconWarning
}

function NotificationIcon({ notification }: { notification: UserNotification }) {
  if (notification.type === 'document-fix') return <FileWarning size={15} />
  if (notification.type === 'code-issued') return <BadgeCheck size={15} />
  if (notification.type === 'handover') return <Truck size={15} />
  if (notification.severity === 'critical') return <OctagonAlert size={15} />
  return <TriangleAlert size={15} />
}

export function NotificationCenter({
  notifications,
  anchorRef,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onOpen,
}: NotificationCenterProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const panelRef = useRef<HTMLDivElement | null>(null)
  const closeRef = useRef(onClose)

  const ordered = useMemo(
    () =>
      [...notifications].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [notifications],
  )
  const unreadCount = ordered.filter((notification) => !notification.read).length
  const visible = useMemo(
    () =>
      filter === 'unread'
        ? ordered.filter((notification) => !notification.read)
        : ordered,
    [ordered, filter],
  )

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    panelRef.current?.focus()
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (panelRef.current?.contains(target) || anchorRef.current?.contains(target)) return
      closeRef.current()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeRef.current()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [anchorRef])

  return (
    <div
      ref={panelRef}
      className={styles.popover}
      role="dialog"
      aria-label="Trung tâm thông báo"
      tabIndex={-1}
    >
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Trung tâm thông báo</p>
          <h2 className={styles.title}>Cập nhật lô hàng</h2>
        </div>
        <button
          type="button"
          className={styles.markAll}
          disabled={unreadCount === 0}
          onClick={onMarkAllRead}
        >
          <CheckCheck size={13} /> Đọc tất cả
        </button>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Lọc thông báo">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'all'}
          className={`${styles.tab} ${filter === 'all' ? styles.tabActive : ''}`}
          onClick={() => setFilter('all')}
        >
          Tất cả <span className={styles.tabCount}>{notifications.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'unread'}
          className={`${styles.tab} ${filter === 'unread' ? styles.tabActive : ''}`}
          onClick={() => setFilter('unread')}
        >
          Chưa đọc <span className={styles.tabCount}>{unreadCount}</span>
        </button>
      </div>

      <div className={styles.list} aria-live="polite">
        {visible.length === 0 && (
          <div className={styles.empty}>
            <Bell size={20} />
            <p>
              {filter === 'unread'
                ? 'Bạn đã đọc hết thông báo.'
                : 'Chưa có thông báo nào.'}
            </p>
          </div>
        )}

        {visible.map((notification) => (
          <button
            key={notification.id}
            type="button"
            className={`${styles.item} ${notification.read ? '' : styles.unread}`}
            onClick={() => {
              onMarkRead(notification.id)
              onOpen(notification)
            }}
          >
            <span
              className={`${styles.icon} ${iconClass(notification)}`}
              aria-hidden="true"
            >
              <NotificationIcon notification={notification} />
            </span>
            <span className={styles.itemBody}>
              <span className={styles.itemHead}>
                <span className={styles.itemTitle}>{notification.title}</span>
                {!notification.read && <span className={styles.unreadDot} aria-label="Chưa đọc" />}
              </span>
              <span className={styles.itemDetail}>{notification.detail}</span>
              {notification.type === 'transport-alert' && notification.legLabel && (
                <span className={styles.itemScope} title={notification.legLabel}>
                  <MapPin size={11} aria-hidden="true" />
                  <span>{notification.legLabel}</span>
                </span>
              )}
              <span className={styles.itemMeta}>
                <span>{TYPE_LABEL[notification.type]}</span>
                <span className={styles.itemMetaTime}>
                  {dateTimeLabel(notification.createdAt)}
                </span>
              </span>
            </span>
          </button>
        ))}
      </div>

      <footer className={styles.footer}>
        <span>Thông báo mô phỏng, đồng bộ từ máy chủ.</span>
        <button type="button" className={styles.close} onClick={onClose}>
          Đóng
        </button>
      </footer>
    </div>
  )
}
