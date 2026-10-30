import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from '../api/client'
import type { AppStateResponse } from '../api/types'
import type {
  AuthUser,
  Booking,
  BillingDetails,
  ContactDetails,
  DemoDocument,
  QuoteDraft,
  RouteBooking,
  ServiceAddons,
  Shipment,
  TransportAlertNotice,
  UserNotification,
} from '../types/domain'
import type { Scenario } from '../sim/types'
import { INITIAL_QUOTE } from '../data/services'
import { freshTransportAlerts } from './notifications'
import { useAuth } from './AuthStore'

interface BookingPayload {
  quote: QuoteDraft
  contact: ContactDetails
  serviceId: string
  addons: ServiceAddons
  route: RouteBooking
  billing: BillingDetails
  documents: DemoDocument[]
}

export interface DocumentUpload {
  slotId: string
  name: string
  sizeBytes: number
}

interface AppState {
  bookings: Booking[]
  shipments: Shipment[]
  scenarios: Scenario[]
  notifications: UserNotification[]
}

interface AppStoreValue extends AppState {
  isLoading: boolean
  loadError: string | null
  actionError: string | null
  clearActionError: () => void
  refresh: () => Promise<void>
  markNotificationRead: (notificationId: string) => void
  markAllNotificationsRead: () => void
  notifyTransportAlerts: (alerts: TransportAlertNotice[]) => void
  quoteDraft: QuoteDraft
  selectedServiceId: string
  activeTrackingCode: string
  setQuoteDraft: (draft: QuoteDraft) => void
  selectService: (serviceId: string) => void
  submitBooking: (payload: BookingPayload) => Promise<Booking>
  verifyDocument: (bookingId: string, documentId: string) => Promise<void>
  requestDocumentFix: (bookingId: string, documentId: string, note: string) => Promise<void>
  attachDocument: (bookingId: string, upload: DocumentUpload) => Promise<void>
  autoConfirmHandover: (shipmentId: string, handoverAt?: string) => Promise<void>
  setActiveTrackingCode: (code: string) => void
  shipmentByCode: (code: string) => Shipment | undefined
  toggleScenario: (scenarioId: string) => Promise<void>
  addScenario: (scenario: Scenario) => Promise<void>
  updateScenario: (scenario: Scenario) => Promise<void>
  removeScenario: (scenarioId: string) => Promise<void>
  resetDemo: () => Promise<void>
}

const EMPTY_STATE: AppState = {
  bookings: [],
  shipments: [],
  scenarios: [],
  notifications: [],
}

const AppStoreContext = createContext<AppStoreValue | null>(null)

function messageOf(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'Không kết nối được máy chủ VieTra.'
}

function quoteForUser(user: AuthUser | null): QuoteDraft {
  if (!user) return INITIAL_QUOTE
  return {
    ...INITIAL_QUOTE,
    companyName: user.company ?? '',
    contactName: user.name,
    email: user.email,
    customerType: user.company ? 'business' : 'individual',
  }
}

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const { user, clearSession } = useAuth()
  const [state, setState] = useState<AppState>(EMPTY_STATE)
  const [quoteDraft, setQuoteDraft] = useState<QuoteDraft>(INITIAL_QUOTE)
  const [selectedServiceId, setSelectedServiceId] = useState('sea-lcl')
  const [activeTrackingCode, setActiveTrackingCode] = useState('VIE7K2M4A')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const handoverInFlight = useRef(new Set<string>())
  const activeUserId = useRef<string | null>(null)

  useEffect(() => {
    const nextId = user?.id ?? null
    if (activeUserId.current === nextId) return
    activeUserId.current = nextId
    setQuoteDraft(quoteForUser(user))
  }, [user])

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!user) {
        setState(EMPTY_STATE)
        setIsLoading(false)
        setLoadError(null)
        return
      }
      if (!options?.silent) setIsLoading(true)
      try {
        const data = await apiGet<AppStateResponse>('/state')
        setState(data)
        setLoadError(null)
        if (data.shipments.length > 0) {
          setActiveTrackingCode((current) =>
            data.shipments.some(
              (shipment) => shipment.code.toUpperCase() === current.toUpperCase(),
            )
              ? current
              : data.shipments[0].code,
          )
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearSession()
          return
        }
        setLoadError(messageOf(error))
      } finally {
        setIsLoading(false)
      }
    },
    [user, clearSession],
  )

  useEffect(() => {
    void load()
  }, [load])

  const runMutation = useCallback(
    async (action: () => Promise<unknown>) => {
      try {
        await action()
        await load({ silent: true })
        setActionError(null)
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearSession()
          return
        }
        setActionError(messageOf(error))
      }
    },
    [load, clearSession],
  )

  const runDocumentMutation = useCallback(
    async (action: () => Promise<unknown>) => {
      try {
        await action()
        await load({ silent: true })
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) clearSession()
        throw error
      }
    },
    [load, clearSession],
  )

  const submitBooking = useCallback(
    async (payload: BookingPayload): Promise<Booking> => {
      try {
        const booking = await apiPost<Booking>('/bookings', payload)
        await load({ silent: true })
        return booking
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) clearSession()
        throw error
      }
    },
    [load, clearSession],
  )

  const verifyDocument = useCallback(
    async (bookingId: string, documentId: string) => {
      await runDocumentMutation(() =>
        apiPost(`/bookings/${bookingId}/documents/${documentId}/verify`, {}),
      )
    },
    [runDocumentMutation],
  )

  const requestDocumentFix = useCallback(
    async (bookingId: string, documentId: string, note: string) => {
      await runDocumentMutation(() =>
        apiPost(`/bookings/${bookingId}/documents/${documentId}/request-fix`, {
          note,
        }),
      )
    },
    [runDocumentMutation],
  )

  const attachDocument = useCallback(
    async (bookingId: string, upload: DocumentUpload) => {
      await runDocumentMutation(() =>
        apiPost(`/bookings/${bookingId}/documents/${upload.slotId}`, {
          name: upload.name,
          sizeBytes: upload.sizeBytes,
        }),
      )
    },
    [runDocumentMutation],
  )

  const autoConfirmHandover = useCallback(
    async (shipmentId: string) => {
      if (handoverInFlight.current.has(shipmentId)) return
      handoverInFlight.current.add(shipmentId)
      try {
        await apiPost(`/shipments/${shipmentId}/handover`, {})
        await load({ silent: true })
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          clearSession()
          return
        }
        setActionError(messageOf(error))
      } finally {
        handoverInFlight.current.delete(shipmentId)
      }
    },
    [load, clearSession],
  )

  const markNotificationRead = useCallback(
    (notificationId: string) => {
      setState((prev) => ({
        ...prev,
        notifications: prev.notifications.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read: true }
            : notification,
        ),
      }))
      void apiPatch(`/notifications/${notificationId}/read`, {}).catch(() => {
        void load({ silent: true })
      })
    },
    [load],
  )

  const markAllNotificationsRead = useCallback(() => {
    setState((prev) => ({
      ...prev,
      notifications: prev.notifications.map((notification) => ({
        ...notification,
        read: true,
      })),
    }))
    void apiPost('/notifications/read-all', {}).catch(() => {
      void load({ silent: true })
    })
  }, [load])

  const notifyTransportAlerts = useCallback(
    (alerts: TransportAlertNotice[]) => {
      if (alerts.length === 0) return
      const fresh = freshTransportAlerts(state.notifications, alerts)
      if (fresh.length === 0) return
      void apiPost<{ created: number }>('/notifications/transport-alert', {
        alerts: fresh,
      })
        .then((result) => {
          if (result.created > 0) void load({ silent: true })
        })
        .catch((error) => {
          if (error instanceof ApiError && error.status === 401) clearSession()
        })
    },
    [state.notifications, load, clearSession],
  )

  const toggleScenario = useCallback(
    async (scenarioId: string) => {
      const scenario = state.scenarios.find((item) => item.id === scenarioId)
      if (!scenario) return
      await runMutation(() =>
        apiPost(`/scenarios/${scenarioId}/toggle`, { active: !scenario.active }),
      )
    },
    [state.scenarios, runMutation],
  )

  const addScenario = useCallback(
    async (scenario: Scenario) => {
      await runMutation(() => apiPost('/scenarios', scenario))
    },
    [runMutation],
  )

  const updateScenario = useCallback(
    async (scenario: Scenario) => {
      await runMutation(() => apiPatch(`/scenarios/${scenario.id}`, scenario))
    },
    [runMutation],
  )

  const removeScenario = useCallback(
    async (scenarioId: string) => {
      await runMutation(() => apiDelete(`/scenarios/${scenarioId}`))
    },
    [runMutation],
  )

  const resetDemo = useCallback(async () => {
    await runMutation(() => apiPost('/demo/reset', {}))
  }, [runMutation])

  const value = useMemo<AppStoreValue>(
    () => ({
      ...state,
      isLoading,
      loadError,
      actionError,
      clearActionError: () => setActionError(null),
      refresh: async () => {
        await load()
      },
      markNotificationRead,
      markAllNotificationsRead,
      notifyTransportAlerts,
      quoteDraft,
      selectedServiceId,
      activeTrackingCode,
      setQuoteDraft,
      selectService: setSelectedServiceId,
      submitBooking,
      verifyDocument,
      requestDocumentFix,
      attachDocument,
      autoConfirmHandover,
      setActiveTrackingCode,
      shipmentByCode: (code: string) =>
        state.shipments.find(
          (shipment) => shipment.code.toUpperCase() === code.trim().toUpperCase(),
        ),
      toggleScenario,
      addScenario,
      updateScenario,
      removeScenario,
      resetDemo,
    }),
    [
      state,
      isLoading,
      loadError,
      actionError,
      load,
      markNotificationRead,
      markAllNotificationsRead,
      notifyTransportAlerts,
      quoteDraft,
      selectedServiceId,
      activeTrackingCode,
      submitBooking,
      verifyDocument,
      requestDocumentFix,
      attachDocument,
      autoConfirmHandover,
      toggleScenario,
      addScenario,
      updateScenario,
      removeScenario,
      resetDemo,
    ],
  )

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

export function useAppStore(): AppStoreValue {
  const context = useContext(AppStoreContext)
  if (!context) throw new Error('useAppStore must be used inside AppStoreProvider')
  return context
}
