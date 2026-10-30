import { useMemo, useState } from 'react'
import { Info, TriangleAlert } from 'lucide-react'
import styles from './TrackingPage.module.css'
import type { Journey } from '../../sim/types'
import type { Shipment, TransportMode } from '../../types/domain'
import { MODE_COLOR, MODE_LABEL } from './modeMeta'
import { ModeIcon } from '../../components/ModeIcon'
import { dateTimeLabel, delayLabel, durationLabel } from '../../utils/date'

interface JourneyTabsProps {
  shipment: Shipment
  journey: Journey
  simTime: number
  selectedLegId: string | null
  focusedAlertId?: string | null
  onSelectLeg: (legId: string) => void
}

type Tab = 'legs' | 'events' | 'alerts'

const EVENT_ICON: Record<string, string> = {
  departure: '↗',
  arrival: '↘',
  wait: '⏸',
  handover: '✓',
  scenario: '!',
  milestone: '◆',
  info: 'i',
}

export function JourneyTabs({
  shipment,
  journey,
  simTime,
  selectedLegId,
  focusedAlertId,
  onSelectLeg,
}: JourneyTabsProps) {
  const [tab, setTab] = useState<Tab>('legs')
  const [modeFilter, setModeFilter] = useState<'all' | TransportMode>('all')
  const [legStatus, setLegStatus] = useState<'all' | 'running' | 'completed' | 'delayed'>('all')
  const [severityFilter, setSeverityFilter] = useState<'all' | 'warning' | 'critical'>('all')
  const [alertType, setAlertType] = useState<string>('all')
  const [timeframe, setTimeframe] = useState<'all' | 'past' | 'next'>('all')
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({})

  const modes = Array.from(new Set(shipment.legs.map((leg) => leg.mode)))

  const legs = useMemo(
    () =>
      journey.legs
        .map((state, index) => ({
          state: {
            ...state,
            status:
              simTime >= state.actualEnd
                ? ('completed' as const)
                : simTime >= state.actualStart
                  ? ('running' as const)
                  : ('pending' as const),
          },
          leg: shipment.legs[index],
        }))
        .filter(({ leg }) => modeFilter === 'all' || leg.mode === modeFilter)
        .filter(({ state }) => {
          if (legStatus === 'all') return true
          if (legStatus === 'delayed') return state.delayMinutes > 30 || state.affected
          return state.status === legStatus
        }),
    [journey.legs, shipment.legs, modeFilter, legStatus, simTime],
  )

  const events = useMemo(() => {
    const filtered = journey.events
      .filter((event) => event.at <= simTime)
      .filter((event) => {
        if (timeframe === 'all') return true
        const delta = event.at - simTime
        if (timeframe === 'past') return delta >= -24 * 3_600_000 && delta <= 0
        return delta > 0 && delta <= 24 * 3_600_000
      })
    return [...filtered].sort((a, b) => b.at - a.at).slice(0, 80)
  }, [journey.events, simTime, timeframe])

  const alerts = useMemo(() => {
    const legMode = new Map(shipment.legs.map((leg) => [leg.id, leg.mode]))
    return journey.alerts
      .filter((alert) => alert.at <= simTime)
      .filter((alert) => (modeFilter === 'all' ? true : legMode.get(alert.legId) === modeFilter))
      .filter((alert) => (severityFilter === 'all' ? true : alert.severity === severityFilter))
      .filter((alert) => (alertType === 'all' ? true : alert.type === alertType))
      .sort((a, b) => {
        if (a.id === focusedAlertId) return -1
        if (b.id === focusedAlertId) return 1
        return b.at - a.at
      })
  }, [
    journey.alerts,
    simTime,
    modeFilter,
    severityFilter,
    alertType,
    focusedAlertId,
    shipment.legs,
  ])

  const alertTypes = useMemo(
    () => Array.from(new Set(journey.alerts.map((alert) => alert.type))),
    [journey.alerts],
  )

  const statusTag = (state: (typeof journey.legs)[number]) => {
    if (state.incident) {
      return <span className={`${styles.statusTag} ${styles.statusIncident}`}>Sự cố</span>
    }
    if (state.delayMinutes > 30) {
      return <span className={`${styles.statusTag} ${styles.statusDelayed}`}>Chậm trễ</span>
    }
    if (state.status === 'completed') {
      return <span className={`${styles.statusTag} ${styles.statusDone}`}>Hoàn thành</span>
    }
    if (state.status === 'running') {
      return <span className={`${styles.statusTag} ${styles.statusRunning}`}>Đang chạy</span>
    }
    return <span className={`${styles.statusTag} ${styles.statusPending}`}>Chờ</span>
  }

  return (
    <section className={`card ${styles.tabsCard}`} aria-label="Chi tiết hành trình">
      <div className={styles.tabBar} role="tablist" aria-label="Dữ liệu hành trình">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'legs'}
          className={`${styles.tab} ${tab === 'legs' ? styles.tabActive : ''}`}
          onClick={() => setTab('legs')}
        >
          Chặng vận tải <span className={styles.tabCount}>{shipment.legs.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'events'}
          className={`${styles.tab} ${tab === 'events' ? styles.tabActive : ''}`}
          onClick={() => setTab('events')}
        >
          Nhật ký sự kiện <span className={styles.tabCount}>{events.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'alerts'}
          className={`${styles.tab} ${tab === 'alerts' ? styles.tabActive : ''}`}
          onClick={() => setTab('alerts')}
        >
          Cảnh báo <span className={styles.tabCount}>{alerts.length}</span>
        </button>
      </div>

      <div className={styles.filterBar}>
        <span className={styles.filterLabel}>Phương thức</span>
        <select
          className={styles.filterSelect}
          aria-label="Lọc theo phương thức vận tải"
          value={modeFilter}
          onChange={(event) => setModeFilter(event.target.value as 'all' | TransportMode)}
        >
          <option value="all">Tất cả</option>
          {modes.map((mode) => (
            <option key={mode} value={mode}>
              {MODE_LABEL[mode]}
            </option>
          ))}
        </select>

        {tab === 'legs' && (
          <>
            <span className={styles.filterLabel}>Trạng thái</span>
            <select
              className={styles.filterSelect}
              aria-label="Lọc theo trạng thái chặng"
              value={legStatus}
              onChange={(event) =>
                setLegStatus(event.target.value as 'all' | 'running' | 'completed' | 'delayed')
              }
            >
              <option value="all">Tất cả</option>
              <option value="running">Đang chạy</option>
              <option value="delayed">Chậm trễ / ảnh hưởng</option>
              <option value="completed">Hoàn thành</option>
            </select>
          </>
        )}

        {tab === 'events' && (
          <>
            <span className={styles.filterLabel}>Khoảng thời gian</span>
            <select
              className={styles.filterSelect}
              aria-label="Lọc theo khoảng thời gian"
              value={timeframe}
              onChange={(event) => setTimeframe(event.target.value as 'all' | 'past' | 'next')}
            >
              <option value="all">Tất cả</option>
              <option value="past">24 giờ qua</option>
              <option value="next">24 giờ tới</option>
            </select>
          </>
        )}

        {tab === 'alerts' && (
          <>
            <span className={styles.filterLabel}>Mức độ</span>
            <select
              className={styles.filterSelect}
              aria-label="Lọc theo mức độ cảnh báo"
              value={severityFilter}
              onChange={(event) =>
                setSeverityFilter(event.target.value as 'all' | 'warning' | 'critical')
              }
            >
              <option value="all">Tất cả</option>
              <option value="warning">Chậm trễ</option>
              <option value="critical">Sự cố</option>
            </select>
            <span className={styles.filterLabel}>Loại cảnh báo</span>
            <select
              className={styles.filterSelect}
              aria-label="Lọc theo loại cảnh báo"
              value={alertType}
              onChange={(event) => setAlertType(event.target.value)}
            >
              <option value="all">Tất cả</option>
              {alertTypes.map((type) => (
                <option key={type} value={type}>
                  {type === 'late-arrival'
                    ? 'Chậm đến'
                    : type === 'congestion'
                      ? 'Ùn tắc'
                      : type === 'storm'
                        ? 'Bão'
                        : type === 'port-congestion'
                          ? 'Ùn cảng'
                          : type === 'road-closure'
                            ? 'Đóng đường'
                            : type === 'reroute'
                              ? 'Tuyến vòng'
                              : type === 'air-delay'
                                ? 'Hoãn bay'
                                : type}
                </option>
              ))}
            </select>
          </>
        )}

        <span className={`${styles.filterLabel}`} style={{ marginLeft: 'auto' }}>
          Hiển thị dữ liệu ≤ giờ mô phỏng
        </span>
      </div>

      {tab === 'legs' && (
        <div className={styles.legList}>
          {legs.length === 0 && (
            <p className={styles.empty}>Không có chặng phù hợp bộ lọc.</p>
          )}
          {legs.map(({ state, leg }) => (
            <div
              key={leg.id}
              role="button"
              tabIndex={0}
              aria-pressed={selectedLegId === leg.id}
              className={`${styles.legCard} ${selectedLegId === leg.id ? styles.legCardSelected : ''}`}
              onClick={() => onSelectLeg(leg.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelectLeg(leg.id)
                }
              }}
            >
              <div className={styles.legCardHead}>
                <span className={styles.legName}>
                  <span
                    className={styles.modeDot}
                    style={{ background: MODE_COLOR[leg.mode] }}
                    aria-hidden="true"
                  />
                  <ModeIcon mode={leg.mode} />
                  {leg.label}
                </span>
                {statusTag(state)}
              </div>
              <p className={styles.legRoute}>
                {leg.from.name} → {leg.to.name} ·{' '}
                {Math.round(state.distanceKm).toLocaleString('vi-VN')} km ·{' '}
                {durationLabel((state.actualEnd - state.actualStart) / 60_000)}
              </p>
              <div className={styles.legMetaRow}>
                <span>
                  <span className={styles.legMetaLabel}>Khởi hành</span>
                  <span className={`${styles.legMetaValue} mono`}>
                    {dateTimeLabel(state.actualStart)}
                  </span>
                </span>
                <span>
                  <span className={styles.legMetaLabel}>Đến (mô phỏng)</span>
                  <span className={`${styles.legMetaValue} mono`}>
                    {dateTimeLabel(state.actualEnd)}
                  </span>
                </span>
                <span>
                  <span className={styles.legMetaLabel}>Theo kế hoạch</span>
                  <span className={`${styles.legMetaValue} mono`}>
                    {dateTimeLabel(state.plannedEnd)}
                  </span>
                </span>
                <span>
                  <span className={styles.legMetaLabel}>Chênh lệch</span>
                  <span className={`${styles.legMetaValue} ${styles.delayCell}`}>
                    {delayLabel(state.delayMinutes)}
                  </span>
                </span>
              </div>
            </div>
          ))}
          <p className={styles.filterLabel} style={{ padding: '8px 14px' }}>
            Chọn một chặng để đánh dấu trên bản đồ. Dữ liệu thực tế ở đây là kết quả mô phỏng.
          </p>
        </div>
      )}

      {tab === 'events' && (
        <div className={styles.eventList} aria-live="polite">
          {events.length === 0 && (
            <p className={styles.empty}>
              Chưa có sự kiện nào tại thời điểm mô phỏng này. Hãy tua thời gian tiến.
            </p>
          )}
          {events.map((event) => (
            <div key={event.id} className={styles.eventRow}>
              <span className={styles.eventTime}>{dateTimeLabel(event.at)}</span>
              <span>
                <span className={styles.eventMarker} aria-hidden="true">
                  {EVENT_ICON[event.type] ?? '·'}
                </span>
                <span className={styles.eventTitle}>{event.title}</span>
                <div className={styles.eventType}>
                  {event.type === 'departure'
                    ? 'Khởi hành'
                    : event.type === 'arrival'
                      ? 'Đến'
                      : event.type === 'wait'
                        ? 'Chờ trung chuyển'
                        : event.type === 'handover'
                          ? 'Bàn giao kho'
                          : event.type === 'milestone'
                            ? 'Mốc quan trọng'
                            : event.type === 'info'
                              ? 'Ghi chú'
                              : 'Tình huống'}
                </div>
              </span>
              <span className={styles.eventDetail}>{event.detail}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'alerts' && (
        <div className={styles.alertList} aria-live="polite">
          {alerts.length === 0 && (
            <p className={styles.empty}>Không có cảnh báo nào phù hợp bộ lọc tại thời điểm này.</p>
          )}
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className={`${styles.alert} ${
                alert.id === focusedAlertId ? styles.alertFocused : ''
              }`}
            >
              <span
                className={`${styles.alertIcon} ${
                  alert.severity === 'critical'
                    ? styles.alertIconCritical
                    : alert.severity === 'info'
                      ? styles.alertIconInfo
                      : ''
                }`}
                aria-hidden="true"
              >
                {alert.severity === 'info' ? <Info size={13} /> : <TriangleAlert size={13} />}
              </span>
              <div>
                <p className={styles.alertTitle}>{alert.title}</p>
                <p className={styles.alertDetail}>{alert.detail}</p>
                <div className={styles.alertMeta}>
                  <span>Phát hiện {dateTimeLabel(alert.at)}</span>
                  <span>{shipment.legs.find((leg) => leg.id === alert.legId)?.label}</span>
                  <span>
                    {acknowledged[alert.id] || alert.status !== 'open'
                      ? 'Đã ghi nhận'
                      : 'Đang mở'}
                  </span>
                </div>
              </div>
              <div className={styles.alertSide}>
                <span className={styles.alertImpact}>+{durationLabel(alert.impactMinutes)}</span>
                <button
                  type="button"
                  className={styles.alertButton}
                  onClick={() => onSelectLeg(alert.legId)}
                >
                  Xem chặng
                </button>
                {!acknowledged[alert.id] && alert.status === 'open' && (
                  <button
                    type="button"
                    className={styles.alertButton}
                    onClick={() =>
                      setAcknowledged((prev) => ({ ...prev, [alert.id]: true }))
                    }
                  >
                    Ghi nhận
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
