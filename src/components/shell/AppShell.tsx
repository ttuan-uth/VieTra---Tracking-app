import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Bell,
  ChevronRight,
  CircleAlert,
  CircleHelp,
  ClipboardList,
  FileText,
  LogOut,
  Map,
  Search,
  X,
} from 'lucide-react'
import styles from './AppShell.module.css'
import type { Screen } from '../../navigation'
import type { AuthUser, UserNotification } from '../../types/domain'
import { initials } from '../../utils/format'
import { NotificationCenter } from './NotificationCenter'

interface AppShellProps {
  screen: Screen
  crumb: string
  notifications: UserNotification[]
  user: AuthUser
  onSignOut: () => void
  actionError: string | null
  onDismissActionError: () => void
  onNavigate: (screen: Screen) => void
  onTrack: (code: string) => void
  onMarkNotificationRead: (notificationId: string) => void
  onMarkAllNotificationsRead: () => void
  onOpenNotification: (notification: UserNotification) => void
  children: ReactNode
}

const NAV: Array<{ screen: Screen; label: string; icon: typeof FileText }> = [
  { screen: 'quote', label: 'Báo giá', icon: FileText },
  { screen: 'bookings', label: 'Đơn đặt chỗ', icon: ClipboardList },
  { screen: 'tracking', label: 'Theo dõi lô hàng', icon: Map },
]

export function AppShell({
  screen,
  crumb,
  notifications,
  user,
  onSignOut,
  actionError,
  onDismissActionError,
  onNavigate,
  onTrack,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onOpenNotification,
  children,
}: AppShellProps) {
  const [query, setQuery] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement | null>(null)
  const unreadCount = notifications.filter((notification) => !notification.read).length

  useEffect(() => {
    setQuery('')
    setNotificationsOpen(false)
  }, [screen])

  const activeNav: Screen =
    screen === 'services' || screen === 'booking' ? 'quote' : screen

  return (
    <div className={styles.shell}>
      <aside className={styles.rail} aria-label="Điều hướng chính">
        <span className={styles.brand} aria-hidden="true">
          V
        </span>
        <span className={styles.railDivider} />
        <nav className={styles.railNav}>
          {NAV.map(({ screen: target, label, icon: Icon }) => (
            <button
              key={target}
              type="button"
              title={label}
              aria-label={label}
              aria-current={activeNav === target ? 'page' : undefined}
              className={`${styles.railButton} ${activeNav === target ? styles.railButtonActive : ''}`}
              onClick={() => onNavigate(target)}
            >
              <Icon size={19} strokeWidth={1.7} aria-hidden="true" />
            </button>
          ))}
        </nav>
        <div className={styles.railFooter}>
          <button
            type="button"
            className={styles.railButton}
            title="Hỗ trợ vận hành"
            aria-label="Hỗ trợ vận hành"
          >
            <CircleHelp size={19} strokeWidth={1.7} aria-hidden="true" />
          </button>
          <span className={`${styles.avatar} ${styles.avatarInitials}`} title={user.name}>
            {initials(user.name)}
          </span>
        </div>
      </aside>

      <div className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <span className={styles.product}>VieTra</span>
            <span className={styles.crumbDivider} />
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <span>Điều hành vận tải</span>
              <ChevronRight size={13} aria-hidden="true" />
              <span className={styles.crumbCurrent}>{crumb}</span>
            </nav>
          </div>

          <div className={styles.headerRight}>
            <form
              className={styles.search}
              role="search"
              onSubmit={(event) => {
                event.preventDefault()
                if (query.trim().length >= 3) onTrack(query.trim().toUpperCase())
              }}
            >
              <Search size={15} className={styles.searchIcon} aria-hidden="true" />
              <label htmlFor="global-tracking-search" className="srOnly">
                Tra cứu mã vận tải
              </label>
              <input
                id="global-tracking-search"
                className={styles.searchInput}
                placeholder="Mã vận tải · VIE…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                autoComplete="off"
              />
            </form>
            <div className={styles.bellWrap} ref={bellRef}>
              <button
                type="button"
                className={styles.bell}
                aria-label={`Trung tâm thông báo, ${unreadCount} chưa đọc`}
                aria-expanded={notificationsOpen}
                aria-haspopup="dialog"
                onClick={() => setNotificationsOpen((prev) => !prev)}
              >
                <Bell size={17} strokeWidth={1.8} aria-hidden="true" />
                {unreadCount > 0 && <span className={styles.bellCount}>{unreadCount}</span>}
              </button>
              {notificationsOpen && (
                <NotificationCenter
                  notifications={notifications}
                  anchorRef={bellRef}
                  onClose={() => setNotificationsOpen(false)}
                  onMarkRead={onMarkNotificationRead}
                  onMarkAllRead={onMarkAllNotificationsRead}
                  onOpen={(notification) => {
                    setNotificationsOpen(false)
                    onOpenNotification(notification)
                  }}
                />
              )}
            </div>
            <div className={styles.account}>
              <div className={styles.accountText}>
                <span className={styles.accountName}>{user.name}</span>
                <span className={styles.accountCompany}>
                  {user.company ?? (user.role === 'admin' ? 'VieTra Operations' : 'Khách hàng')}
                </span>
              </div>
              <span className={styles.roleTag}>
                {user.role === 'admin' ? 'Admin' : 'Khách hàng'}
              </span>
              <button
                type="button"
                className={styles.signOut}
                onClick={onSignOut}
                title="Đăng xuất"
                aria-label="Đăng xuất khỏi VieTra"
              >
                <LogOut size={15} strokeWidth={1.8} aria-hidden="true" />
              </button>
              <span className={`${styles.accountAvatar} ${styles.accountAvatarInitials}`}>
                {initials(user.name)}
              </span>
            </div>
          </div>
        </header>
        <main className={styles.content}>
          {actionError && (
            <div className={styles.actionError} role="alert">
              <CircleAlert size={15} aria-hidden="true" />
              <span>{actionError}</span>
              <button
                type="button"
                className={styles.actionErrorClose}
                onClick={onDismissActionError}
                aria-label="Đóng thông báo lỗi"
              >
                <X size={14} />
              </button>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
