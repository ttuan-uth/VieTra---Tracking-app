import { useMemo, useState } from 'react'
import { Pencil, Trash2, X } from 'lucide-react'
import styles from './TrackingPage.module.css'
import type { Scenario, ScenarioSeverity, ScenarioType } from '../../sim/types'
import type { Shipment, TransportMode } from '../../types/domain'
import { addHours, dateTimeLabel, nowIso } from '../../utils/date'
import { MODE_LABEL } from './modeMeta'

interface ScenarioPanelProps {
  shipment: Shipment
  scenarios: Scenario[]
  simTime: number
  onToggle: (id: string) => void
  onAdd: (scenario: Scenario) => void
  onUpdate: (scenario: Scenario) => void
  onRemove: (id: string) => void
  onJumpTo: (time: number) => void
}

type ImpactKind = 'speed' | 'wait' | 'detour' | 'closure'

const TYPE_OPTIONS: Record<
  TransportMode,
  Array<{ value: ScenarioType; label: string; kind: ImpactKind }>
> = {
  road: [
    { value: 'congestion', label: 'Ùn tắc theo bán kính', kind: 'speed' },
    { value: 'accident', label: 'Tai nạn', kind: 'speed' },
    { value: 'road-closure', label: 'Đóng đường (dừng chờ)', kind: 'closure' },
    { value: 'reroute', label: 'Đi tuyến vòng', kind: 'detour' },
  ],
  ocean: [
    { value: 'storm', label: 'Bão / thời tiết xấu', kind: 'speed' },
    { value: 'port-congestion', label: 'Ùn cảng / chờ cập cảng', kind: 'wait' },
    { value: 'security', label: 'Gián đoạn an ninh', kind: 'closure' },
  ],
  air: [
    { value: 'air-delay', label: 'Hoãn chuyến (trước cất cánh)', kind: 'wait' },
    { value: 'air-reschedule', label: 'Đổi lịch / đường bay', kind: 'speed' },
  ],
  rail: [
    { value: 'storm', label: 'Thời tiết xấu', kind: 'speed' },
    { value: 'port-congestion', label: 'Ùn ga / chờ trung chuyển', kind: 'wait' },
  ],
}

const SEVERITIES: Array<{ value: ScenarioSeverity; label: string }> = [
  { value: 'low', label: 'Thấp' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'high', label: 'Cao' },
]

interface FormState {
  mode: TransportMode
  legId: string
  type: ScenarioType
  severity: ScenarioSeverity
  startsInHours: number
  durationHours: number
  reduction: number
  waitHours: number
  detourKm: number
}

function defaultForm(shipment: Shipment): FormState {
  const firstLeg = shipment.legs[0]
  return {
    mode: firstLeg.mode,
    legId: firstLeg.id,
    type: TYPE_OPTIONS[firstLeg.mode][0].value,
    severity: 'medium',
    startsInHours: 0,
    durationHours: 12,
    reduction: 45,
    waitHours: 12,
    detourKm: 24,
  }
}

function kindOf(mode: TransportMode, type: ScenarioType): ImpactKind {
  return TYPE_OPTIONS[mode].find((item) => item.value === type)?.kind ?? 'speed'
}

export function ScenarioPanel({
  shipment,
  scenarios,
  simTime,
  onToggle,
  onAdd,
  onUpdate,
  onRemove,
  onJumpTo,
}: ScenarioPanelProps) {
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(() => defaultForm(shipment))

  const modes = useMemo(
    () => Array.from(new Set(shipment.legs.map((leg) => leg.mode))),
    [shipment.legs],
  )
  const legOptions = useMemo(
    () => shipment.legs.filter((leg) => leg.mode === form.mode),
    [shipment.legs, form.mode],
  )

  const resetForm = () => {
    setForm(defaultForm(shipment))
    setEditingId(null)
    setOpen(false)
  }

  const startEdit = (scenario: Scenario) => {
    const duration = Math.max(
      1,
      Math.round((new Date(scenario.endAt).getTime() - new Date(scenario.startAt).getTime()) / 3_600_000),
    )
    setEditingId(scenario.id)
    setOpen(true)
    setForm({
      mode: scenario.mode,
      legId: scenario.legId,
      type: scenario.type,
      severity: scenario.severity,
      startsInHours: Math.round(
        (new Date(scenario.startAt).getTime() - simTime) / 3_600_000,
      ),
      durationHours: duration,
      reduction: Math.round((1 - scenario.speedFactor) * 100),
      waitHours: scenario.extraWaitHours || 12,
      detourKm: scenario.detourKm || 24,
    })
  }

  const save = () => {
    const leg = shipment.legs.find((item) => item.id === form.legId) ?? shipment.legs[0]
    const typeLabel =
      TYPE_OPTIONS[form.mode].find((item) => item.value === form.type)?.label ?? form.type
    const kind = kindOf(form.mode, form.type)
    const startAt = addHours(simTime, form.startsInHours)
    const endAt = addHours(startAt, form.durationHours)
    const base: Scenario = {
      id: editingId ?? `sc-${Date.now().toString(36)}`,
      shipmentId: shipment.id,
      legId: leg.id,
      mode: leg.mode,
      type: form.type,
      label: `${typeLabel} · ${leg.label}`,
      severity: form.severity,
      startAt,
      endAt,
      speedFactor:
        kind === 'closure'
          ? 0
          : kind === 'wait'
            ? 1
            : Math.max(0.1, Math.min(1, 1 - form.reduction / 100)),
      extraWaitHours: kind === 'wait' ? form.waitHours : 0,
      detourKm: kind === 'detour' ? form.detourKm : 0,
      center:
        leg.path.length > 1
          ? leg.path[Math.floor(leg.path.length / 2)]
          : { lat: leg.from.lat, lng: leg.from.lng },
      radiusKm: leg.mode === 'road' ? 30 : leg.mode === 'ocean' ? 1400 : 350,
      active: true,
      createdAt: editingId
        ? scenarios.find((item) => item.id === editingId)?.createdAt ?? nowIso()
        : nowIso(),
    }

    if (editingId) {
      const existing = scenarios.find((item) => item.id === editingId)
      onUpdate({ ...base, label: existing ? `${typeLabel} · ${leg.label}` : base.label })
    } else {
      onAdd(base)
    }
    resetForm()
  }

  const state = (scenario: Scenario) => {
    if (!scenario.active) return { label: 'Đã tắt', className: styles.scenarioStateEnded }
    const start = new Date(scenario.startAt).getTime()
    const end = new Date(scenario.endAt).getTime()
    if (simTime > end) return { label: 'Đã kết thúc', className: styles.scenarioStateEnded }
    if (simTime < start) return { label: 'Sắp diễn ra', className: styles.scenarioState }
    return { label: 'Đang hiệu lực', className: `${styles.scenarioState} ${styles.scenarioStateActive}` }
  }

  const kind = kindOf(form.mode, form.type)

  const addRoadPreset = (preset: 'congestion' | 'closure') => {
    const roadLeg = shipment.legs.find((item) => item.mode === 'road') ?? shipment.legs[0]
    const startAt = roadLeg.plannedDeparture
    const center = roadLeg.path[Math.floor(roadLeg.path.length / 2)] ?? {
      lat: roadLeg.from.lat,
      lng: roadLeg.from.lng,
    }
    const isCongestion = preset === 'congestion'
    onAdd({
      id: `sc-preset-${preset}-${Date.now().toString(36)}`,
      shipmentId: shipment.id,
      legId: roadLeg.id,
      mode: 'road',
      type: isCongestion ? 'congestion' : 'reroute',
      label: isCongestion
        ? `Ùn tắc giờ cao điểm · ${roadLeg.label}`
        : `Đóng đường, đi tuyến vòng · ${roadLeg.label}`,
      severity: isCongestion ? 'high' : 'medium',
      startAt,
      endAt: addHours(startAt, isCongestion ? 6 : 10),
      speedFactor: isCongestion ? 0.4 : 1,
      extraWaitHours: 0,
      detourKm: isCongestion ? 0 : 32,
      center,
      radiusKm: 28,
      active: true,
      createdAt: nowIso(),
    })
    onJumpTo(new Date(startAt).getTime() + 90 * 60_000)
  }

  return (
    <section className={`card ${styles.panel}`} aria-label="Quản lý tình huống mô phỏng">
      <div className={styles.panelHead}>
        <p className={styles.panelTitle}>Tình huống mô phỏng</p>
        <span className={styles.smallBadge}>{scenarios.filter((item) => item.active).length} bật</span>
      </div>

      <div className={styles.presetRow}>
        <span className={styles.presetLabel}>Kịch bản nhanh</span>
        <button type="button" className="btn btnSm" onClick={() => addRoadPreset('congestion')}>
          Kẹt xe giờ cao điểm
        </button>
        <button type="button" className="btn btnSm" onClick={() => addRoadPreset('closure')}>
          Đóng đường + tuyến vòng
        </button>
      </div>

      <div className={styles.scenarioList}>
        {scenarios.length === 0 && (
          <p className={styles.empty}>Chưa có tình huống nào cho lô hàng này.</p>
        )}
        {scenarios.map((scenario) => {
          const status = state(scenario)
          return (
            <div key={scenario.id} className={styles.scenario}>
              <div className={styles.scenarioHead}>
                <div style={{ minWidth: 0 }}>
                  <p className={styles.scenarioTitle}>{scenario.label}</p>
                  <p className={styles.scenarioMeta}>
                    {MODE_LABEL[scenario.mode]} · {scenario.severity === 'high' ? 'Cao' : scenario.severity === 'medium' ? 'Trung bình' : 'Thấp'} ·{' '}
                    {dateTimeLabel(scenario.startAt)} → {dateTimeLabel(scenario.endAt)}
                  </p>
                </div>
                <div className={styles.scenarioActions}>
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label={`Chỉnh sửa ${scenario.label}`}
                    onClick={() => startEdit(scenario)}
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label={`Xoá ${scenario.label}`}
                    onClick={() => onRemove(scenario.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
              <div className={styles.scenarioRow}>
                <span className={status.className}>{status.label}</span>
                <button
                  type="button"
                  className={styles.switchButton}
                  aria-pressed={scenario.active}
                  onClick={() => onToggle(scenario.id)}
                >
                  {scenario.active ? 'Tắt' : 'Bật'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        className={styles.addToggle}
        aria-expanded={open}
        onClick={() => {
          setEditingId(null)
          setForm(defaultForm(shipment))
          setOpen((prev) => !prev)
        }}
      >
        {open ? 'Đóng biểu mẫu tình huống' : '+ Thêm tình huống'}
      </button>

      {open && (
        <div className={styles.addForm}>
          <div className={styles.formRow}>
            <div className="field">
              <label className="label" htmlFor="sc-mode">
                Phương thức
              </label>
              <select
                id="sc-mode"
                className="select"
                value={form.mode}
                onChange={(event) => {
                  const mode = event.target.value as TransportMode
                  const leg = shipment.legs.find((item) => item.mode === mode)
                  setForm({
                    ...form,
                    mode,
                    legId: leg?.id ?? form.legId,
                    type: TYPE_OPTIONS[mode][0].value,
                  })
                }}
              >
                {modes.map((mode) => (
                  <option key={mode} value={mode}>
                    {MODE_LABEL[mode]}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="sc-leg">
                Chặng
              </label>
              <select
                id="sc-leg"
                className="select"
                value={form.legId}
                onChange={(event) => setForm({ ...form, legId: event.target.value })}
              >
                {legOptions.map((leg) => (
                  <option key={leg.id} value={leg.id}>
                    {leg.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className="field">
              <label className="label" htmlFor="sc-type">
                Loại tình huống
              </label>
              <select
                id="sc-type"
                className="select"
                value={form.type}
                onChange={(event) =>
                  setForm({ ...form, type: event.target.value as ScenarioType })
                }
              >
                {TYPE_OPTIONS[form.mode].map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label" htmlFor="sc-severity">
                Mức độ
              </label>
              <select
                id="sc-severity"
                className="select"
                value={form.severity}
                onChange={(event) =>
                  setForm({ ...form, severity: event.target.value as ScenarioSeverity })
                }
              >
                {SEVERITIES.map((severity) => (
                  <option key={severity.value} value={severity.value}>
                    {severity.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className="field">
              <label className="label" htmlFor="sc-start">
                Bắt đầu sau (giờ mô phỏng)
              </label>
              <input
                id="sc-start"
                className="input mono"
                type="number"
                value={form.startsInHours}
                onChange={(event) =>
                  setForm({ ...form, startsInHours: Number(event.target.value) })
                }
              />
            </div>
            <div className="field">
              <label className="label" htmlFor="sc-duration">
                Kéo dài (giờ)
              </label>
              <input
                id="sc-duration"
                className="input mono"
                type="number"
                min={1}
                value={form.durationHours}
                onChange={(event) =>
                  setForm({ ...form, durationHours: Number(event.target.value) })
                }
              />
            </div>
          </div>

          {kind === 'speed' && (
            <div className="field">
              <label className="label" htmlFor="sc-reduction">
                Giảm tốc độ (%)
              </label>
              <input
                id="sc-reduction"
                className="input mono"
                type="number"
                min={5}
                max={95}
                value={form.reduction}
                onChange={(event) => setForm({ ...form, reduction: Number(event.target.value) })}
              />
            </div>
          )}
          {kind === 'wait' && (
            <div className="field">
              <label className="label" htmlFor="sc-wait">
                Thời gian chờ thêm (giờ)
              </label>
              <input
                id="sc-wait"
                className="input mono"
                type="number"
                min={1}
                value={form.waitHours}
                onChange={(event) => setForm({ ...form, waitHours: Number(event.target.value) })}
              />
            </div>
          )}
          {kind === 'detour' && (
            <div className="field">
              <label className="label" htmlFor="sc-detour">
                Quãng đường vòng thêm (km)
              </label>
              <input
                id="sc-detour"
                className="input mono"
                type="number"
                min={1}
                value={form.detourKm}
                onChange={(event) => setForm({ ...form, detourKm: Number(event.target.value) })}
              />
            </div>
          )}

          <p className={styles.formHint}>
            {kind === 'closure'
              ? 'Xe sẽ dừng trong vùng ảnh hưởng cho tới khi tình huống kết thúc. Nếu không có tuyến thay thế, mô phỏng dừng và phát cảnh báo.'
              : 'Tình huống dùng chung đồng hồ mô phỏng. Tắt hoặc chỉnh sửa sẽ tính lại toàn bộ hành trình.'}
          </p>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn btnSm btnPrimary" onClick={save}>
              {editingId ? 'Lưu thay đổi' : 'Thêm tình huống'}
            </button>
            <button type="button" className="btn btnSm" onClick={resetForm}>
              <X size={12} /> Huỷ
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
