import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  Check,
  CircleHelp,
  FlaskConical,
  MapPin,
  Package,
  Search,
  ShieldCheck,
  Truck,
  Warehouse,
} from 'lucide-react'
import styles from './TrackingPage.module.css'
import { useAppStore } from '../../store/AppStore'
import type { Shipment, TransportAlertNotice } from '../../types/domain'
import type { Scenario } from '../../sim/types'
import type { TrackingFocus } from '../../navigation'
import { buildJourney, clampToWindow, defaultSimTime, snapshotAt } from '../../sim/engine'
import { TrackMap } from './TrackMap'
import { SimulationClock } from './SimulationClock'
import { ScenarioPanel } from './ScenarioPanel'
import { JourneyTabs } from './JourneyTabs'
import { TransportAlertBanner } from './TransportAlertBanner'
import { transportAlertNotices } from './alertNotifications'
import { MODE_LABEL } from './modeMeta'
import { dateTimeLabel, delayLabel, timeLabel, toMs } from '../../utils/date'

interface TrackingPageProps {
  initialCode?: string
  focus?: TrackingFocus | null
}

export function TrackingPage({ initialCode, focus }: TrackingPageProps) {
  const {
    shipments,
    scenarios,
    activeTrackingCode,
    setActiveTrackingCode,
    autoConfirmHandover,
    notifyTransportAlerts,
    toggleScenario,
    addScenario,
    updateScenario,
    removeScenario,
  } = useAppStore()

  const [query, setQuery] = useState('')
  const [searchError, setSearchError] = useState('')

  useEffect(() => {
    if (initialCode) {
      setActiveTrackingCode(initialCode)
      setSearchError('')
    }
  }, [initialCode, setActiveTrackingCode])

  const shipment = useMemo(
    () => shipments.find((item) => item.code.toUpperCase() === activeTrackingCode.toUpperCase()),
    [shipments, activeTrackingCode],
  )

  const submitSearch = () => {
    const term = query.trim().toUpperCase()
    if (!term) return
    const found = shipments.find((item) => item.code.toUpperCase() === term)
    if (!found) {
      setSearchError(
        'Không tìm thấy mã vận tải này trong dữ liệu mô phỏng. Thử một mã mẫu bên dưới.',
      )
      return
    }
    setSearchError('')
    setActiveTrackingCode(found.code)
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1>Theo dõi lô hàng</h1>
          <p className={styles.lede}>
            Nhập mã vận tải được cấp sau khi chứng từ của booking được xác minh để xem vị trí mô
            phỏng, vận tốc, ETA động và các cảnh báo trên toàn hành trình đa phương thức.
          </p>
        </div>
        <div className={styles.headMeta}>
          <span className={styles.simChip}>
            <FlaskConical size={13} /> Dữ liệu giả lập — không phải GPS hay lịch tàu thật
          </span>
        </div>
      </div>

      <section className={`card ${styles.lookup}`} aria-label="Tra cứu mã vận tải">
        <span className={styles.lookupLabel}>Mã vận tải</span>
        <form
          className={styles.lookupForm}
          onSubmit={(event) => {
            event.preventDefault()
            submitSearch()
          }}
        >
          <label htmlFor="tracking-code" className="srOnly">
            Nhập mã vận tải
          </label>
          <input
            id="tracking-code"
            className={styles.lookupInput}
            placeholder="VIE7K2M4A"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
            spellCheck={false}
            aria-invalid={Boolean(searchError)}
            aria-describedby={searchError ? 'tracking-search-error' : undefined}
          />
          <button type="submit" className="btn btnPrimary btnSm">
            <Search size={13} /> Tra cứu
          </button>
        </form>
        {searchError && (
          <span id="tracking-search-error" className={styles.lookupError}>
            {searchError}
          </span>
        )}
        <div className={styles.chips} aria-label="Mã mẫu">
          {shipments.slice(0, 3).map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.chip} ${item.code === activeTrackingCode ? styles.chipActive : ''}`}
              onClick={() => {
                setActiveTrackingCode(item.code)
                setSearchError('')
                setQuery('')
              }}
              title={`${item.serviceName} · ${item.status}`}
            >
              {item.code}
            </button>
          ))}
        </div>
      </section>

      {!shipment ? (
        <section className={`card ${styles.notFound}`}>
          <h2>Chưa mở lô hàng nào</h2>
          <p>
            Mã vận tải gồm 9 ký tự dạng <span className="mono">VIEXXXXXX</span>, được cấp tự động
            khi toàn bộ chứng từ bắt buộc của booking đã được xác minh. Tạo booking mới ở mục Đơn
            đặt chỗ, sau đó mở hồ sơ chứng từ để xác minh.
          </p>
          <div className={styles.notFoundActions}>
            {shipments.slice(0, 3).map((item) => (
              <button
                key={item.id}
                type="button"
                className="btn btnSm"
                onClick={() => setActiveTrackingCode(item.code)}
              >
                {item.code} <ArrowRight size={13} />
              </button>
            ))}
          </div>
        </section>
      ) : (
        <TrackingView
          key={[
            shipment.id,
            focus?.alertId ?? '',
            focus?.legId ?? '',
            focus?.simAt ?? '',
          ].join('|')}
          shipment={shipment}
          focus={focus}
          scenarios={scenarios.filter((item) => item.shipmentId === shipment.id)}
          onAutoHandover={autoConfirmHandover}
          onNotifyTransportAlerts={notifyTransportAlerts}
          onToggleScenario={toggleScenario}
          onAddScenario={addScenario}
          onUpdateScenario={updateScenario}
          onRemoveScenario={removeScenario}
        />
      )}
    </div>
  )
}

interface TrackingViewProps {
  shipment: Shipment
  focus?: TrackingFocus | null
  scenarios: Scenario[]
  onAutoHandover: (shipmentId: string, handoverAt: string) => void
  onNotifyTransportAlerts: (alerts: TransportAlertNotice[]) => void
  onToggleScenario: (scenarioId: string) => void
  onAddScenario: (scenario: Scenario) => void
  onUpdateScenario: (scenario: Scenario) => void
  onRemoveScenario: (scenarioId: string) => void
}

function TrackingView({
  shipment,
  focus,
  scenarios,
  onAutoHandover,
  onNotifyTransportAlerts,
  onToggleScenario,
  onAddScenario,
  onUpdateScenario,
  onRemoveScenario,
}: TrackingViewProps) {
  const journey = useMemo(() => buildJourney({ shipment, scenarios }), [shipment, scenarios])
  const focusAlertId = focus?.alertId
  const linkedAlert = useMemo(
    () =>
      focusAlertId
        ? journey.alerts.find((alert) => alert.id === focusAlertId)
        : undefined,
    [focusAlertId, journey.alerts],
  )
  const focusTime = focus?.simAt ? toMs(focus.simAt) : linkedAlert?.at
  const [simTime, setSimTime] = useState(() =>
    focusTime !== undefined && Number.isFinite(focusTime)
      ? clampToWindow(journey, focusTime)
      : defaultSimTime(journey),
  )
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(600)
  const [selectedLegId, setSelectedLegId] = useState<string | null>(focus?.legId ?? null)
  const [focusedAlertId, setFocusedAlertId] = useState<string | null>(
    linkedAlert?.id ?? null,
  )
  const simRef = useRef(simTime)

  useEffect(() => {
    simRef.current = simTime
  }, [simTime])

  useEffect(() => {
    if (!playing) return
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const delta = now - last
      last = now
      const next = simRef.current + delta * speed
      if (next >= journey.windowEnd) {
        setSimTime(journey.windowEnd)
        setPlaying(false)
        return
      }
      setSimTime(next)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [playing, speed, journey.windowEnd])

  useEffect(() => {
    if (playing && simTime >= journey.windowEnd) setPlaying(false)
  }, [playing, simTime, journey.windowEnd])

  useEffect(() => {
    if (!shipment.handoverConfirmedAt && simTime >= toMs(shipment.handoverAt)) {
      onAutoHandover(shipment.id, shipment.handoverAt)
    }
  }, [
    simTime,
    shipment.id,
    shipment.handoverAt,
    shipment.handoverConfirmedAt,
    onAutoHandover,
  ])

  const actionableAlerts = journey.alerts.filter(
    (alert) => alert.severity !== 'info' && alert.at <= simTime,
  )
  const actionableAlertKey = actionableAlerts.map((alert) => alert.id).join('|')
  const actionableAlertsRef = useRef(actionableAlerts)
  const notifiedAlertIdsRef = useRef<string[] | null>(null)

  useEffect(() => {
    actionableAlertsRef.current = actionableAlerts
  }, [actionableAlerts])

  useEffect(() => {
    const currentAlerts = actionableAlertsRef.current
    if (notifiedAlertIdsRef.current === null) {
      notifiedAlertIdsRef.current = currentAlerts.map((alert) => alert.id)
      return
    }
    const known = new Set(notifiedAlertIdsRef.current)
    const fresh = currentAlerts.filter((alert) => !known.has(alert.id))
    if (fresh.length === 0) return
    notifiedAlertIdsRef.current = [
      ...notifiedAlertIdsRef.current,
      ...fresh.map((alert) => alert.id),
    ]
    onNotifyTransportAlerts(transportAlertNotices(shipment, fresh))
  }, [actionableAlertKey, shipment, onNotifyTransportAlerts])

  const snapshot = useMemo(() => snapshotAt(journey, simTime), [journey, simTime])
  const openAlerts = journey.alerts.filter((alert) => alert.at <= simTime)
  const criticalCount = openAlerts.filter((alert) => alert.severity === 'critical').length
  const focusedAlert = focusedAlertId
    ? journey.alerts.find((alert) => alert.id === focusedAlertId)
    : undefined
  const focusedLegIndex = focusedAlert
    ? shipment.legs.findIndex((leg) => leg.id === focusedAlert.legId)
    : -1

  const handleSelectLeg = useCallback((legId: string) => {
    setSelectedLegId(legId)
  }, [])

  const handoverPending = !shipment.handoverConfirmedAt
  const statusLabel = handoverPending
    ? 'Chờ bàn giao'
    : snapshot.awaiting
      ? 'Chờ khởi hành'
      : snapshot.delivered
        ? 'Đã giao'
        : 'Đang vận chuyển'
  const statusTone =
    statusLabel === 'Đã giao'
      ? 'badgeSuccess'
      : statusLabel === 'Đang vận chuyển'
        ? 'badgeAccent'
        : 'badgeWarning'

  const activeLeg = shipment.legs[snapshot.legIndex]
  const lastWaypoint = shipment.legs[shipment.legs.length - 1].to
  const positionValue = snapshot.awaiting
    ? shipment.legs[0].from.name
    : snapshot.delivered
      ? lastWaypoint.name
      : `${Math.round(snapshot.progress * 100)}% · ${MODE_LABEL[snapshot.mode]}`
  const positionNote = snapshot.awaiting
    ? `Dự kiến khởi hành ${dateTimeLabel(journey.plannedStart)}`
    : snapshot.delivered
      ? 'Hành trình mô phỏng đã kết thúc'
      : activeLeg
        ? `${activeLeg.from.name} → ${activeLeg.to.name}`
        : 'Chưa đủ dữ liệu'

  const milestones = journey.events
    .filter(
      (event) =>
        event.at <= simTime &&
        ['arrival', 'departure', 'handover', 'milestone'].includes(event.type),
    )
    .slice(-3)
    .reverse()

  return (
    <>
      <div className={styles.stats}>
        <div className={`card ${styles.stat}`}>
          <p className={styles.statLabel}>TRẠNG THÁI</p>
          <p className={styles.statValue}>
            <span className={`badge ${statusTone}`}>{statusLabel}</span>
          </p>
          <p className={styles.statNote}>
            {shipment.serviceName} · {MODE_LABEL[shipment.mode]}
          </p>
        </div>
        <div className={`card ${styles.stat}`}>
          <p className={styles.statLabel}>VỊ TRÍ HIỆN TẠI</p>
          <p className={styles.statValue}>{positionValue}</p>
          <p className={styles.statNote}>{positionNote}</p>
        </div>
        <div className={`card ${styles.stat}`}>
          <p className={styles.statLabel}>VẬN TỐC MÔ PHỎNG</p>
          <p className={styles.statValue}>
            {snapshot.awaiting ? '—' : `${Math.round(snapshot.speedKmh)} km/h`}
          </p>
          <p className={styles.statNote}>
            {snapshot.speedKmh === 0
              ? 'Đang chờ / dừng trong vùng ảnh hưởng'
              : `Theo tiến độ mô hình (${MODE_LABEL[snapshot.mode]})`}
          </p>
        </div>
        <div className={`card ${styles.stat}`}>
          <p className={styles.statLabel}>ETA TOÀN HÀNH TRÌNH</p>
          <p className={styles.statValueSmall} style={{ marginTop: 4 }}>
            {dateTimeLabel(snapshot.eta)}
          </p>
          <p className={styles.statNote}>
            {journey.delayMinutes > 0
              ? `${delayLabel(journey.delayMinutes)} so với kế hoạch`
              : 'Đúng lịch trình mô phỏng'}
          </p>
        </div>
        <div className={`card ${styles.stat}`}>
          <p className={styles.statLabel}>CẢNH BÁO ĐANG MỞ</p>
          <p className={styles.statValue}>
            {openAlerts.length}
            {criticalCount > 0 && (
              <span className="badge badgeDanger" style={{ marginLeft: 4 }}>
                {criticalCount} nghiêm trọng
              </span>
            )}
          </p>
          <p className={styles.statNote}>
            {activeLeg
              ? `Chặng ${snapshot.legIndex + 1}/${shipment.legs.length} · ${activeLeg.label}`
              : '—'}
          </p>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.sideCol}>
          <section className={`card ${styles.panel}`} aria-label="Thông tin lô hàng">
            <div className={styles.panelHead}>
              <p className={styles.panelTitle}>
                <Package size={14} /> Lô hàng
              </p>
              <span className={styles.smallBadge}>{shipment.code}</span>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.metaRows}>
                <div className={styles.metaRow}>
                  <span className={styles.metaKey}>Khách hàng</span>
                  <span className={styles.metaVal}>{shipment.customer}</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaKey}>Dịch vụ</span>
                  <span className={styles.metaVal}>{shipment.serviceName}</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaKey}>Hàng hoá</span>
                  <span className={styles.metaVal}>{shipment.cargoSummary}</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaKey}>Đặc biệt</span>
                  <span className={styles.metaVal}>
                    {shipment.specialCargo.length > 0
                      ? shipment.specialCargo.join(', ')
                      : 'Không có'}
                  </span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaKey}>Hình thức</span>
                  <span className={styles.metaVal}>
                    {shipment.handoff === 'carrier-pickup' ? 'Lấy tận nơi' : 'Giao đến kho'}
                  </span>
                </div>
              </div>

              <hr className="divider" style={{ margin: '12px 0' }} />

              <div className={styles.metaRows}>
                <div className={styles.metaRow}>
                  <span className={styles.metaKey}>Điểm đi</span>
                  <span className={styles.metaVal}>{shipment.legs[0].from.name}</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaKey}>Điểm đến</span>
                  <span className={styles.metaVal}>{lastWaypoint.name}</span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaKey}>Khởi hành dự kiến</span>
                  <span className={`${styles.metaVal} mono`}>
                    {dateTimeLabel(journey.plannedStart)}
                  </span>
                </div>
                <div className={styles.metaRow}>
                  <span className={styles.metaKey}>ETA hiện tại</span>
                  <span className={`${styles.metaVal} mono`}>{dateTimeLabel(snapshot.eta)}</span>
                </div>
              </div>
            </div>
          </section>

          <section className={`card ${styles.panel}`} aria-label="Bàn giao hàng hoá">
            <div className={styles.panelHead}>
              <p className={styles.panelTitle}>
                {shipment.handoff === 'deliver-to-warehouse' ? (
                  <Warehouse size={14} />
                ) : (
                  <Truck size={14} />
                )}
                {shipment.handoff === 'deliver-to-warehouse'
                  ? 'Giao hàng vào kho'
                  : 'Xe đến lấy hàng'}
              </p>
              {handoverPending ? (
                <span className="badge badgeWarning">tự động</span>
              ) : (
                <span className="badge badgeSuccess">đã bàn giao</span>
              )}
            </div>
            <div className={`${styles.panelBody} ${styles.handoff}`}>
              <p className={styles.handoffTime}>{dateTimeLabel(shipment.handoverAt)}</p>
              <p className={styles.handoffNote}>
                {shipment.handoff === 'deliver-to-warehouse'
                  ? 'Cut-off nhập kho do bên kho gửi. Hàng cần có mặt trước mốc này để kịp chuyến đã đặt.'
                  : `Xe ${shipment.vehicleName} · biển số ${shipment.vehiclePlate}. Vị trí xe được mô phỏng theo chặng đường bộ đầu tiên.`}
              </p>
              {handoverPending ? (
                <>
                  <div className={styles.handoffNotify}>
                    <ShieldCheck size={14} />
                    <span>
                      Mốc bàn giao do lịch mô phỏng quyết định. Hệ thống tự xác nhận khi giờ mô
                      phỏng đi qua mốc này — không cần admin thao tác.
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btnSm"
                    onClick={() => {
                      setPlaying(false)
                      setSimTime(
                        clampToWindow(journey, toMs(shipment.handoverAt) + 60_000),
                      )
                    }}
                  >
                    Tua tới mốc bàn giao
                  </button>
                </>
              ) : (
                <p className={styles.confirmedLine}>
                  <Check size={13} />
                  Đã bàn giao tự động lúc{' '}
                  {dateTimeLabel(shipment.handoverConfirmedAt as string)}
                </p>
              )}
            </div>
          </section>

          <section className={`card ${styles.panel}`} aria-label="Mốc cập nhật gần nhất">
            <div className={styles.panelHead}>
              <p className={styles.panelTitle}>
                <MapPin size={14} /> Mốc cập nhật gần nhất
              </p>
            </div>
            <div className={styles.panelBody}>
              {milestones.length === 0 ? (
                <p className={styles.handoffNote}>Chưa có mốc nào tại thời điểm mô phỏng này.</p>
              ) : (
                <div className={styles.milestoneList}>
                  {milestones.map((event) => (
                    <div key={event.id} className={styles.milestoneRow}>
                      <span className={styles.milestoneTitle} title={event.title}>
                        {event.title}
                      </span>
                      <span className={`${styles.milestoneTime} mono`}>
                        {dateTimeLabel(event.at)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p className={styles.handoffNote} style={{ marginTop: 9 }}>
                Lịch sử đầy đủ nằm ở tab “Nhật ký sự kiện” bên dưới.
              </p>
            </div>
          </section>
        </div>

        <div className={styles.centerCol}>
          {focusedAlert && (
            <TransportAlertBanner
              alert={focusedAlert}
              legLabel={
                shipment.legs[focusedLegIndex]?.label ?? 'Chặng chưa xác định'
              }
              legIndex={focusedLegIndex}
              totalLegs={shipment.legs.length}
              onDismiss={() => setFocusedAlertId(null)}
            />
          )}
          <TrackMap
            shipment={shipment}
            journey={journey}
            snapshot={snapshot}
            selectedLegId={selectedLegId}
            focusLegId={focus?.legId}
            onSelectLeg={handleSelectLeg}
          />
          <div className={`card ${styles.panel}`}>
            <div
              className={styles.panelBody}
              style={{ display: 'flex', gap: 16, flexWrap: 'wrap', padding: '10px 14px' }}
            >
              <span className="badge badgeAccent">
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: 999,
                    background: 'var(--color-accent)',
                    display: 'inline-block',
                  }}
                />{' '}
                Vị trí &amp; vận tốc theo mô hình, không phải GPS
              </span>
              <span className="hint" style={{ fontSize: 11.5 }}>
                Giờ mô phỏng: {timeLabel(simTime)} · {dateTimeLabel(simTime)} ·{' '}
                {Math.round((simTime - journey.plannedStart) / 3_600_000)} giờ sau khởi hành
              </span>
            </div>
          </div>

          <JourneyTabs
            shipment={shipment}
            journey={journey}
            simTime={simTime}
            selectedLegId={selectedLegId}
            focusedAlertId={focusedAlertId}
            onSelectLeg={handleSelectLeg}
          />
        </div>

        <div className={styles.sideCol}>
          <SimulationClock
            journey={journey}
            simTime={simTime}
            onChange={(next) => setSimTime(clampToWindow(journey, next))}
            playing={playing}
            onTogglePlay={() => setPlaying((prev) => !prev)}
            speed={speed}
            onSpeedChange={setSpeed}
          />
          <ScenarioPanel
            shipment={shipment}
            scenarios={scenarios}
            simTime={simTime}
            onToggle={onToggleScenario}
            onAdd={onAddScenario}
            onUpdate={onUpdateScenario}
            onRemove={onRemoveScenario}
            onJumpTo={(time) => {
              setPlaying(false)
              setSimTime(clampToWindow(journey, time))
            }}
          />
          <div
            className={styles.handoffNotify}
            style={{
              background: 'var(--color-surface-muted)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text-secondary)',
            }}
          >
            <CircleHelp size={14} />
            <span>
              Mẹo: tua ngược đồng hồ để xem lại trạng thái trước đó. Tình huống đã tắt hoặc kết
              thúc sẽ không còn tác động lên ETA.
            </span>
          </div>
        </div>
      </div>
    </>
  )
}
