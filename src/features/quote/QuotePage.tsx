import { useMemo, useState } from 'react'
import { CircleHelp, Info, Plus, Trash2 } from 'lucide-react'
import styles from './QuotePage.module.css'
import { AddressFields } from '../../components/AddressFields'
import type { CargoLine, QuoteDraft, UnitSystem } from '../../types/domain'
import {
  CONTAINERS,
  PACKAGE_TYPES,
  SPECIAL_CARGO,
  serviceById,
} from '../../data/services'
import { formatKg, formatVolume, lineVolumeM3 } from '../../utils/format'
import { useAppStore } from '../../store/AppStore'
import { quoteErrors } from './validation'

interface QuotePageProps {
  onContinue: (draft: QuoteDraft) => void
}

const UNITS: Record<UnitSystem, { weight: string; dim: string }> = {
  metric: { weight: 'kg', dim: 'cm' },
  imperial: { weight: 'lb', dim: 'in' },
}

function newLine(index: number): CargoLine {
  return {
    id: `line-${Date.now()}-${index}`,
    packageType: 'Thùng carton',
    quantity: 1,
    weightKg: 100,
    lengthCm: 100,
    widthCm: 80,
    heightCm: 80,
  }
}

function toMetricVolume(line: CargoLine, unit: UnitSystem): number {
  if (unit === 'metric') return lineVolumeM3(line)
  const cm = 2.54
  return (
    (line.lengthCm * cm * line.widthCm * cm * line.heightCm * cm * line.quantity) / 1_000_000
  )
}

function toMetricWeight(line: CargoLine, unit: UnitSystem): number {
  return line.weightKg * line.quantity * (unit === 'imperial' ? 0.45359237 : 1)
}

export function QuotePage({ onContinue }: QuotePageProps) {
  const { quoteDraft: quote, setQuoteDraft } = useAppStore()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)

  const units = UNITS[quote.unitSystem]
  const totals = useMemo(() => {
    const volume = quote.lines.reduce((sum, line) => sum + toMetricVolume(line, quote.unitSystem), 0)
    const weight = quote.lines.reduce((sum, line) => sum + toMetricWeight(line, quote.unitSystem), 0)
    const pieces = quote.lines.reduce((sum, line) => sum + line.quantity, 0)
    return { volume, weight, pieces }
  }, [quote.lines, quote.unitSystem])

  const update = (patch: Partial<QuoteDraft>) => {
    setQuoteDraft({ ...quote, ...patch })
  }

  const updateLine = (id: string, patch: Partial<CargoLine>) => {
    update({ lines: quote.lines.map((line) => (line.id === id ? { ...line, ...patch } : line)) })
  }

  const submit = () => {
    setSubmitted(true)
    const nextErrors = quoteErrors(quote)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      const first = document.querySelector<HTMLElement>('[aria-invalid="true"], [data-error="true"]')
      first?.focus()
      return
    }
    setQuoteDraft(quote)
    onContinue(quote)
  }

  const selectedContainer = CONTAINERS.find((item) => item.id === quote.containerId)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Yêu cầu báo giá</h1>
          <p className={styles.lede}>
            Mô tả lô hàng một lần để nhận các phương án vận chuyển phù hợp. Thông tin sẽ được giữ
            nguyên khi bạn chuyển sang đặt chỗ.
          </p>
        </div>
        <span className="badge">Bản nháp · dữ liệu mô phỏng</span>
      </div>

      <div className={styles.layout}>
        <div className={styles.column}>
          <section className={`card ${styles.section}`}>
            <div className="sectionTitle">
              <h2>
                <span className={styles.sectionIndex}>1</span> Điểm đi
              </h2>
              <span className="badge">Bắt buộc</span>
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.handoffGrid} role="radiogroup" aria-label="Hình thức lấy hàng">
                {[
                  {
                    id: 'deliver-to-warehouse' as const,
                    title: 'Bạn sẽ giao hàng đến kho',
                    hint: 'Kho gửi cut-off nhập hàng; hệ thống tự xác nhận khi qua mốc này.',
                  },
                  {
                    id: 'carrier-pickup' as const,
                    title: 'Chúng tôi sẽ đến lấy',
                    hint: 'Theo dõi xe lấy hàng và thời gian dự kiến đến điểm hẹn.',
                  },
                ].map((option) => {
                  const active = quote.handoff === option.id
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      className={`${styles.handoff} ${active ? styles.handoffActive : ''}`}
                      onClick={() => update({ handoff: option.id })}
                    >
                      <span className={`${styles.radio} ${active ? styles.radioOn : ''}`} />
                      <span>
                        <span className={styles.handoffTitle}>{option.title}</span>
                        <span className={styles.handoffHint}>{option.hint}</span>
                      </span>
                    </button>
                  )
                })}
              </div>

              <div className={styles.routeCard}>
                <p className={styles.routeTag}>
                  <i /> Bạn muốn lô hàng được lấy tại đâu?
                </p>
                <AddressFields
                  idPrefix="pickup"
                  address={quote.pickup}
                  onChange={(pickup) => update({ pickup })}
                  errors={submitted ? mapErrors(errors, 'pickup') : {}}
                />
              </div>
            </div>
          </section>

          <section className={`card ${styles.section}`}>
            <div className="sectionTitle">
              <h2>
                <span className={styles.sectionIndex}>2</span> Điểm đến
              </h2>
              <span className="badge">Bắt buộc</span>
            </div>
            <div className={styles.sectionBody}>
              <div className={`${styles.routeCard} ${styles.routeCardTo}`}>
                <p className={styles.routeTag}>
                  <i /> Bạn muốn lô hàng được đặt ở đâu?
                </p>
                <AddressFields
                  idPrefix="delivery"
                  address={quote.delivery}
                  onChange={(delivery) => update({ delivery })}
                  errors={submitted ? mapErrors(errors, 'delivery') : {}}
                />
              </div>
            </div>
          </section>

          <section className={`card ${styles.section}`}>
            <div className="sectionTitle">
              <h2>
                <span className={styles.sectionIndex}>3</span> Điều kiện thương mại
              </h2>
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.twoCol}>
                <div className="field">
                  <span className="label">Thanh toán cước</span>
                  <div className={styles.optionRow} role="radiogroup" aria-label="Điều kiện cước">
                    {[
                      { id: 'prepaid' as const, label: 'Freight Prepaid' },
                      { id: 'collect' as const, label: 'Freight Collect' },
                    ].map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={quote.freightTerm === option.id}
                        className={`${styles.option} ${quote.freightTerm === option.id ? styles.optionActive : ''}`}
                        onClick={() => update({ freightTerm: option.id })}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <span className="label">Loại hình hàng</span>
                  <div className={styles.optionRow} role="radiogroup" aria-label="Cargo type">
                    {[
                      { id: 'quick-estimation' as const, label: 'Quick Estimation' },
                      { id: 'fcl' as const, label: 'FCL' },
                      { id: 'lcl' as const, label: 'LCL' },
                    ].map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        role="radio"
                        aria-checked={quote.cargoType === option.id}
                        className={`${styles.option} ${quote.cargoType === option.id ? styles.optionActive : ''}`}
                        onClick={() => update({ cargoType: option.id })}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className={`card ${styles.section}`}>
            <div className="sectionTitle">
              <h2>
                <span className={styles.sectionIndex}>4</span> Thông tin hàng hoá
              </h2>
              <div className={styles.optionRow} role="radiogroup" aria-label="Đơn vị đo">
                {(['metric', 'imperial'] as const).map((unit) => (
                  <button
                    key={unit}
                    type="button"
                    role="radio"
                    aria-checked={quote.unitSystem === unit}
                    className={`${styles.option} ${quote.unitSystem === unit ? styles.optionActive : ''}`}
                    onClick={() => update({ unitSystem: unit })}
                  >
                    {unit === 'metric' ? 'kg / cm' : 'lb / in'}
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.lines}>
                {quote.lines.map((line, index) => (
                  <div key={line.id} className={styles.lineCard}>
                    <div className={styles.lineHead}>
                      <span className={styles.lineTitle}>Dòng hàng {index + 1}</span>
                      {quote.lines.length > 1 && (
                        <button
                          type="button"
                          className={styles.iconBtn}
                          aria-label={`Xoá dòng hàng ${index + 1}`}
                          onClick={() => update({ lines: quote.lines.filter((item) => item.id !== line.id) })}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    <div className={styles.lineGrid}>
                      <div className="field">
                        <label className="label" htmlFor={`package-${line.id}`}>
                          Loại bao bì
                        </label>
                        <select
                          id={`package-${line.id}`}
                          className="select"
                          value={line.packageType}
                          onChange={(event) => updateLine(line.id, { packageType: event.target.value })}
                        >
                          {PACKAGE_TYPES.map((type) => (
                            <option key={type}>{type}</option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label className="label" htmlFor={`qty-${line.id}`}>
                          Số kiện
                        </label>
                        <input
                          id={`qty-${line.id}`}
                          className="input mono"
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(event) => updateLine(line.id, { quantity: Number(event.target.value) })}
                        />
                      </div>
                      <div className="field">
                        <label className="label" htmlFor={`weight-${line.id}`}>
                          KL/kiện ({units.weight})
                        </label>
                        <input
                          id={`weight-${line.id}`}
                          className="input mono"
                          type="number"
                          min={0}
                          value={line.weightKg}
                          onChange={(event) => updateLine(line.id, { weightKg: Number(event.target.value) })}
                        />
                      </div>
                      <div className="field">
                        <label className="label" htmlFor={`length-${line.id}`}>
                          Dài ({units.dim})
                        </label>
                        <input
                          id={`length-${line.id}`}
                          className="input mono"
                          type="number"
                          min={0}
                          value={line.lengthCm}
                          onChange={(event) => updateLine(line.id, { lengthCm: Number(event.target.value) })}
                        />
                      </div>
                      <div className="field">
                        <label className="label" htmlFor={`width-${line.id}`}>
                          Rộng ({units.dim})
                        </label>
                        <input
                          id={`width-${line.id}`}
                          className="input mono"
                          type="number"
                          min={0}
                          value={line.widthCm}
                          onChange={(event) => updateLine(line.id, { widthCm: Number(event.target.value) })}
                        />
                      </div>
                      <div className="field">
                        <label className="label" htmlFor={`height-${line.id}`}>
                          Cao ({units.dim})
                        </label>
                        <input
                          id={`height-${line.id}`}
                          className="input mono"
                          type="number"
                          min={0}
                          value={line.heightCm}
                          onChange={(event) => updateLine(line.id, { heightCm: Number(event.target.value) })}
                        />
                      </div>
                    </div>
                    <p className={styles.volumeTag}>
                      Thể tích dòng:
                      <span className={styles.volumeValue}>
                        {formatVolume(toMetricVolume(line, quote.unitSystem))}
                      </span>
                      <span className="muted">
                        (D × R × C × số kiện, quy đổi m³)
                      </span>
                    </p>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className={`btn btnSm ${styles.addLine}`}
                onClick={() =>
                  update({ lines: [...quote.lines, newLine(quote.lines.length)] })
                }
              >
                <Plus size={14} /> Thêm dòng hàng
              </button>

              <div className={styles.twoCol}>
                <div className="field">
                  <label className="label" htmlFor="container-select">
                    Loại container sử dụng
                  </label>
                  <select
                    id="container-select"
                    className="select"
                    value={quote.containerId}
                    onChange={(event) => update({ containerId: event.target.value })}
                  >
                    {CONTAINERS.map((container) => (
                      <option key={container.id} value={container.id}>
                        {container.name} · {container.suit}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedContainer && (
                  <div className={styles.containerHint}>
                    <span>
                      Tải tham khảo <strong>{selectedContainer.payloadTon || 'Theo booking'} tấn</strong>
                    </span>
                    <span>
                      Thể tích tham khảo{' '}
                      <strong>{selectedContainer.volumeM3 ? `${selectedContainer.volumeM3} m³` : '—'}</strong>
                    </span>
                    <span>Phù hợp: {selectedContainer.suit}</span>
                  </div>
                )}
              </div>

              <div className="field">
                <span className="label">Tính chất hàng hoá</span>
                <div className={styles.optionRow} role="radiogroup" aria-label="Tính chất hàng hoá">
                  {[
                    { id: 'general' as const, label: 'Hàng thông thường' },
                    { id: 'special' as const, label: 'Hàng hoá đặc biệt' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={quote.handling === option.id}
                      className={`${styles.option} ${quote.handling === option.id ? styles.optionActive : ''}`}
                      onClick={() =>
                        update({
                          handling: option.id,
                          specialTypes: option.id === 'general' ? [] : quote.specialTypes,
                        })
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {quote.handling === 'special' && (
                <div className={styles.specialGrid}>
                  {SPECIAL_CARGO.map((item) => (
                    <label key={item.id} className="checkRow">
                      <input
                        type="checkbox"
                        checked={quote.specialTypes.includes(item.id)}
                        onChange={(event) =>
                          update({
                            specialTypes: event.target.checked
                              ? [...quote.specialTypes, item.id]
                              : quote.specialTypes.filter((id) => id !== item.id),
                          })
                        }
                      />
                      {item.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className={`card ${styles.section}`}>
            <div className="sectionTitle">
              <h2>
                <span className={styles.sectionIndex}>5</span> Thông tin liên hệ
              </h2>
            </div>
            <div className={styles.sectionBody}>
              <div className={styles.optionRow} role="radiogroup" aria-label="Loại khách hàng">
                {[
                  { id: 'business' as const, label: 'Khách hàng doanh nghiệp' },
                  { id: 'individual' as const, label: 'Khách hàng cá nhân' },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={quote.customerType === option.id}
                    className={`${styles.option} ${quote.customerType === option.id ? styles.optionActive : ''}`}
                    onClick={() => update({ customerType: option.id })}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className={styles.threeCol}>
                <div className="field">
                  <label className="label" htmlFor="quote-company">
                    Tên công ty
                  </label>
                  <input
                    id="quote-company"
                    className="input"
                    value={quote.companyName}
                    disabled={quote.customerType === 'individual'}
                    onChange={(event) => update({ companyName: event.target.value })}
                  />
                </div>
                <div className="field">
                  <label className="label" htmlFor="quote-name">
                    Họ và tên người liên hệ
                  </label>
                  <input
                    id="quote-name"
                    className="input"
                    value={quote.contactName}
                    onChange={(event) => update({ contactName: event.target.value })}
                    aria-invalid={Boolean(submitted && errors.contactName)}
                  />
                  {submitted && errors.contactName && (
                    <span className="errorText">{errors.contactName}</span>
                  )}
                </div>
                <div className="field">
                  <label className="label" htmlFor="quote-phone">
                    Số điện thoại
                  </label>
                  <input
                    id="quote-phone"
                    className="input mono"
                    value={quote.phone}
                    onChange={(event) => update({ phone: event.target.value })}
                    aria-invalid={Boolean(submitted && errors.phone)}
                  />
                  {submitted && errors.phone && <span className="errorText">{errors.phone}</span>}
                </div>
              </div>
              <div className={styles.twoCol}>
                <div className="field">
                  <label className="label" htmlFor="quote-email">
                    Email
                  </label>
                  <input
                    id="quote-email"
                    className="input"
                    type="email"
                    value={quote.email}
                    onChange={(event) => update({ email: event.target.value })}
                    aria-invalid={Boolean(submitted && errors.email)}
                  />
                  {submitted && errors.email && <span className="errorText">{errors.email}</span>}
                </div>
                <label className="checkRow" style={{ alignSelf: 'end', paddingBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={quote.marketingOptIn}
                    onChange={(event) => update({ marketingOptIn: event.target.checked })}
                  />
                  Đồng ý nhận thông tin cập nhật tuyến và biểu giá.
                </label>
              </div>
            </div>
          </section>
        </div>

        <aside className={styles.aside}>
          <section className={`card ${styles.summary}`}>
            <div className="sectionTitle">
              <h3>Thông tin đã nhập</h3>
              <span className="badge">{totals.pieces} kiện</span>
            </div>
            <div className={styles.summaryBody}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryLabel}>TUYẾN ĐƯỜNG</span>
                <span className={styles.summaryValue}>
                  {quote.pickup.city || 'Chưa nhập'} → {quote.delivery.city || 'Chưa nhập'}
                </span>
                <span className={styles.summaryMeta}>
                  {quote.pickup.postalCode || '—'} · {quote.delivery.postalCode || '—'} ·{' '}
                  {quote.handoff === 'carrier-pickup' ? 'Lấy tận nơi' : 'Giao đến kho'}
                </span>
              </div>
              <div className={styles.metricRow}>
                <span>Tổng trọng lượng</span>
                <strong>{formatKg(totals.weight)}</strong>
              </div>
              <div className={styles.metricRow}>
                <span>Tổng thể tích</span>
                <strong>{formatVolume(totals.volume)}</strong>
              </div>
              <div className={styles.metricRow}>
                <span>Loại hàng</span>
                <strong style={{ fontFamily: 'var(--font-sans)' }}>
                  {quote.cargoType === 'quick-estimation' ? 'Quick Estimation' : quote.cargoType.toUpperCase()}
                </strong>
              </div>
              <div className={styles.metricRow}>
                <span>Phương án dự kiến</span>
                <strong style={{ fontFamily: 'var(--font-sans)' }}>
                  {serviceById('sea-lcl').name.split(' — ')[0]}
                </strong>
              </div>
            </div>
            <div className={styles.consent}>
              <label className="checkRow">
                <input
                  type="checkbox"
                  checked={quote.termsAccepted}
                  onChange={(event) => update({ termsAccepted: event.target.checked })}
                  data-error={submitted && !quote.termsAccepted}
                />
                Tôi là khách hàng doanh nghiệp, đã đọc và đồng ý toàn bộ điều khoản của doanh nghiệp.
              </label>
              {submitted && errors.terms && <span className="errorText">{errors.terms}</span>}
              <button
                type="button"
                className="btn btnPrimary"
                onClick={submit}
                disabled={!quote.termsAccepted}
                title={!quote.termsAccepted ? 'Cần đồng ý điều khoản trước khi gửi' : undefined}
              >
                Gửi yêu cầu báo giá
              </button>
              <p className="hint" style={{ display: 'flex', gap: 6 }}>
                <CircleHelp size={13} style={{ marginTop: 2, flex: 'none' }} />
                Bản mockup: yêu cầu không được gửi tới hệ thống thật.
              </p>
            </div>
          </section>

          <div className={styles.notice}>
            <Info size={15} />
            <span>
              Giá và lịch tàu ở bước sau là dữ liệu mô phỏng phục vụ demo, không phải báo giá chính
              thức.
            </span>
          </div>
        </aside>
      </div>
    </div>
  )
}

function mapErrors(errors: Record<string, string>, prefix: string): Record<string, string> {
  const mapped: Record<string, string> = {}
  for (const [key, value] of Object.entries(errors)) {
    if (key.startsWith(`${prefix}.`)) mapped[key.slice(prefix.length + 1)] = value
  }
  return mapped
}
