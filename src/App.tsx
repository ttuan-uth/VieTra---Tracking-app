import { useState } from 'react'
import { AppShell } from './components/shell/AppShell'
import { AuthPage } from './features/auth/AuthPage'
import { SessionGate } from './features/auth/SessionGate'
import { QuotePage } from './features/quote/QuotePage'
import { ServicesPage } from './features/services/ServicesPage'
import { BookingPage } from './features/booking/BookingPage'
import { BookingsPage } from './features/bookings/BookingsPage'
import { TrackingPage } from './features/tracking/TrackingPage'
import { useAppStore } from './store/AppStore'
import { useAuth } from './store/AuthStore'
import type { ContactDetails, UserNotification } from './types/domain'
import type { Screen, TrackingFocus } from './navigation'

const CRUMBS: Record<Screen, string> = {
  quote: 'Yêu cầu báo giá',
  services: 'Phương án vận chuyển',
  booking: 'Hoàn tất đặt chỗ',
  bookings: 'Đơn đặt chỗ',
  tracking: 'Theo dõi lô hàng',
}

function App() {
  const {
    quoteDraft,
    notifications,
    isLoading,
    loadError,
    actionError,
    clearActionError,
    refresh,
    setActiveTrackingCode,
    markNotificationRead,
    markAllNotificationsRead,
  } = useAppStore()
  const { user, status, logout } = useAuth()
  const [screen, setScreen] = useState<Screen>('quote')
  const [bookingStarted, setBookingStarted] = useState(false)
  const [contact, setContact] = useState<ContactDetails | null>(null)
  const [bookingHighlight, setBookingHighlight] = useState<string | null>(null)
  const [bookingFocusId, setBookingFocusId] = useState<string | null>(null)
  const [trackingCode, setTrackingCode] = useState<string | undefined>(undefined)
  const [trackingFocus, setTrackingFocus] = useState<TrackingFocus | null>(null)

  const resolvedContact: ContactDetails =
    contact ?? {
      customerType: quoteDraft.customerType,
      companyName: quoteDraft.companyName,
      fullName: quoteDraft.contactName,
      email: quoteDraft.email,
      phone: quoteDraft.phone,
      marketingOptIn: quoteDraft.marketingOptIn,
      termsAccepted: true,
    }

  const navigate = (next: Screen) => {
    if (next !== 'tracking') setTrackingCode(undefined)
    setTrackingFocus(null)
    if (next !== 'bookings') {
      setBookingHighlight(null)
      setBookingFocusId(null)
    }
    setScreen(next)
  }

  const openTracking = (code: string, focus: TrackingFocus | null = null) => {
    setActiveTrackingCode(code)
    setTrackingCode(code)
    setTrackingFocus(focus)
    setBookingHighlight(null)
    setBookingFocusId(null)
    setScreen('tracking')
  }

  const handleOpenNotification = (notification: UserNotification) => {
    if (notification.type === 'transport-alert' && notification.shipmentCode) {
      openTracking(notification.shipmentCode, {
        legId: notification.legId,
        alertId: notification.alertId,
        simAt: notification.simAt,
      })
      return
    }
    if (notification.type === 'document-fix' && notification.bookingId) {
      setBookingFocusId(notification.bookingId)
      setScreen('bookings')
      return
    }
    if (notification.shipmentCode) {
      openTracking(notification.shipmentCode)
      return
    }
    if (notification.bookingId) {
      setBookingFocusId(notification.bookingId)
      setScreen('bookings')
    }
  }

  if (status === 'loading') return <SessionGate mode="loading" />

  if (!user) return <AuthPage />

  if (isLoading) {
    return <SessionGate mode="loading" />
  }

  if (loadError) {
    return (
      <SessionGate
        mode="error"
        message={loadError}
        onRetry={() => {
          void refresh()
        }}
        onSignOut={() => {
          void logout()
        }}
      />
    )
  }

  return (
    <AppShell
      screen={screen}
      crumb={CRUMBS[screen]}
      notifications={notifications}
      user={user}
      onSignOut={() => {
        void logout()
      }}
      actionError={actionError}
      onDismissActionError={clearActionError}
      onNavigate={navigate}
      onTrack={openTracking}
      onMarkNotificationRead={markNotificationRead}
      onMarkAllNotificationsRead={markAllNotificationsRead}
      onOpenNotification={handleOpenNotification}
    >
      {screen === 'quote' && (
        <QuotePage onContinue={() => setScreen(bookingStarted ? 'booking' : 'services')} />
      )}

      {screen === 'services' && (
        <ServicesPage
          onEditQuote={() => setScreen('quote')}
          onContinue={(nextContact) => {
            setContact(nextContact)
            setBookingStarted(true)
            setScreen('booking')
          }}
        />
      )}

      {bookingStarted && (
        <div hidden={screen !== 'booking'}>
          <BookingPage
            contact={resolvedContact}
            onBackToServices={() => setScreen('services')}
            onEditQuote={() => setScreen('quote')}
            onComplete={(id) => {
              setBookingHighlight(id)
              setScreen('bookings')
            }}
          />
        </div>
      )}

      {screen === 'bookings' && (
        <BookingsPage
          highlightId={bookingHighlight}
          focusBookingId={bookingFocusId}
          onFocusHandled={() => setBookingFocusId(null)}
          onTrack={openTracking}
          onNewBooking={() => {
            setContact(null)
            setBookingStarted(false)
            setBookingHighlight(null)
            setBookingFocusId(null)
            setScreen('quote')
          }}
        />
      )}

      {screen === 'tracking' && (
        <TrackingPage initialCode={trackingCode} focus={trackingFocus} />
      )}
    </AppShell>
  )
}

export default App
