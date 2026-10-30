import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Check,
  CircleSlash,
  Clock,
  Coins,
  FlaskConical,
  Info,
  Leaf,
  Pencil,
  Plane,
  Ship,
  TrainFront,
  TriangleAlert,
} from 'lucide-react'
import styles from './ServicesPage.module.css'
import { useAppStore } from '../../store/AppStore'
import { DEMO_DEPARTURE, DEMO_READY, SERVICES, serviceById } from '../../data/services'
import { dateLabel } from '../../utils/date'
import type { ContactDetails, ServiceOption, ServiceSort, TransportMode } from '../../types/domain'
import { formatMoney } from '../../utils/format'
import { contactErrors } from '../quote/validation'
import { countryName } from '../../data/countries'

interface ServicesPageProps {
  onEditQuote: () => void
  onContinue: (contact: ContactDetails) => void
}

function ModeIcon({ mode, size = 14 }: { mode: TransportMode; size?: number }) {
  if (mode === 'air') return <Plane size={size} aria-hidden="true" />
  if (mode === 'rail') return <TrainFront size={size} aria-hidden="true" />
  return <Ship size={size} aria-hidden="true" />
}

const SORTS: Array<{ id: ServiceSort; label: string; icon: typeof Clock }> = [
  { id: 'recommended', label: 'Đề xuất', icon: Check },
  { id: 'earliest', label: 'Đến sớm nhất', icon: Clock },
  { id: 'cheapest', label: 'Giá thấp nhất', icon: Coins },
  { id: 'cleanest', label: 'Phát thải thấp nhất', icon: Leaf },
]

export function ServicesPage({ onEditQuote, onContinue }: ServicesPageProps) {
  const { quoteDraft, selectedServiceId, selectService } = useAppStore()
  const [sort, setSort] = useState<ServiceSort>('recommended')
  const [eligibleOnly, setEligibleOnly] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [contact, setContact] = useState<ContactDetails>({
    customerType: quoteDraft.customerType,
    companyName: quoteDraft.companyName,
    fullName: quoteDraft.contactName,
    email: quoteDraft.email,
    phone: quoteDraft.phone,
    marketingOptIn: quoteDraft.marketingOptIn,
    termsAccepted: false,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tried, setTried] = useState(false)

  const services = useMemo(() => {
    const list = eligibleOnly ? SERVICES.filter((service) => service.eligible) : [...SERVICES]
    if (sort === 'earliest') return list.sort((a, b) => a.transitDays[0] - b.transitDays[0])
    if (sort === 'cheapest') return list.sort((a, b) => a.priceVnd - b.priceVnd)
    if (sort === 'cleanest') return list.sort((a, b) => a.emissionsKg - b.emissionsKg)
    return list
  }, [sort, eligibleOnly])

  const selected = serviceById(selectedServiceId)

  const submitContact = () => {
    setTried(true)
    const nextErrors = contactErrors(contact)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    onContinue(contact)
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <div>
          <h1>Phương án vận chuyển</h1>
          <p className={styles.lede}>
            {SERVICES.length} phương án được lập từ thông tin báo giá bạn đã nhập. Mỗi phương án
            khác nhau ở thời gian, phát thải và phạm vi dịch vụ.
          </p>
        </div>
        <button type="button" className="btn" onClick={onEditQuote}>
          <Pencil size={14} /> Sửa thông tin báo giá
        </button>
      </div>

      <section className={`card ${styles.contextStrip}`} aria-label="Thông tin lô hàng đã nhập">
        <div className={styles.contextGrid}>
          <div className={styles.contextCell}>
            <p className={styles.contextLabel}>Tuyến đường</p>
            <div className={styles.routeLine}>
              <div className={styles.routeEnd}>
                <p className={styles.routeCity}>{quoteDraft.pickup.city}</p>
                <p className={styles.routeCode}>
                  {countryName(quoteDraft.pickup.countryCode)} · {quoteDraft.pickup.postalCode}
                </p>
              </div>
              <div className={styles.routeConnector} aria-hidden="true">
                <span />
                <ModeIcon mode={selected.mode} size={13} />
                <span />
              </div>
              <div className={styles.routeEnd}>
                <p className={styles.routeCity}>{quoteDraft.delivery.city}</p>
                <p className={styles.routeCode}>
                  {countryName(quoteDraft.delivery.countryCode)} · {quoteDraft.delivery.postalCode}
                </p>
              </div>
            </div>
          </div>
          <div className={styles.contextCell}>
            <p className={styles.contextLabel}>Hàng hoá</p>
            <p className={styles.contextStrong}>
              {quoteDraft.lines.reduce((sum, line) => sum + line.quantity, 0)} kiện ·{' '}
              {quoteDraft.cargoType === 'quick-estimation' ? 'Quick Estimation' : quoteDraft.cargoType.toUpperCase()}
            </p>
            <p className={styles.contextMeta}>
              {quoteDraft.lines.reduce((sum, line) => sum + line.weightKg * line.quantity, 0).toLocaleString('vi-VN')} kg ·
              Hàng điện tử · mã HS 8517.62
            </p>
          </div>
          <div className={styles.contextCell}>
            <p className={styles.contextLabel}>Lịch trình</p>
            <p className={styles.contextMeta}>
              Hàng sẵn sàng:{' '}
              <strong style={{ color: 'var(--color-ink)' }}>{dateLabel(DEMO_READY)}</strong>
            </p>
            <p className={styles.contextMeta}>
              Lấy hàng dự kiến:{' '}
              <strong style={{ color: 'var(--color-ink)' }}>{dateLabel(DEMO_DEPARTURE)}</strong>
            </p>
          </div>
          <div className={styles.contextCell}>
            <p className={styles.contextLabel}>Yêu cầu đặc biệt</p>
            <p className={styles.warnChip}>
              <TriangleAlert size={12} />
              Pin lithium UN3481 — nhóm 9
            </p>
            <p className={styles.contextMeta}>
              {quoteDraft.handoff === 'carrier-pickup' ? 'Lấy hàng tại kho' : 'Giao đến kho'} ·{' '}
              {quoteDraft.lines.length} dòng hàng
            </p>
          </div>
        </div>
      </section>

      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <div className={styles.segmentGroup}>
            <span className={styles.segmentLabel}>Hiển thị</span>
            <div className={styles.segment}>
              <button
                type="button"
                className={`${styles.segmentButton} ${!eligibleOnly ? styles.segmentActive : ''}`}
                aria-pressed={!eligibleOnly}
                onClick={() => setEligibleOnly(false)}
              >
                Tất cả
              </button>
              <button
                type="button"
                className={`${styles.segmentButton} ${eligibleOnly ? styles.segmentActive : ''}`}
                aria-pressed={eligibleOnly}
                onClick={() => setEligibleOnly(true)}
              >
                Chỉ phương án phù hợp
              </button>
            </div>
          </div>
          <div className={styles.segmentGroup}>
            <span className={styles.segmentLabel}>Sắp xếp theo</span>
            <div className={styles.segment}>
              {SORTS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  className={`${styles.segmentButton} ${sort === id ? styles.segmentActive : ''}`}
                  aria-pressed={sort === id}
                  onClick={() => setSort(id)}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <span className={styles.resultCount}>
          {services.length} phương án · thứ tự {sort === 'recommended' ? 'đề xuất' : 'đã sắp xếp'}
        </span>
      </div>

      <div className={styles.disclaimer}>
        <FlaskConical size={15} />
        <p>
          <strong>Dữ liệu mô phỏng — không phải báo giá chính thức.</strong> Giá, ngày đến, thời gian
          vận chuyển và phát thải dưới đây là ví dụ từ dữ liệu mẫu, không phản ánh tình trạng chỗ thực
          tế.
        </p>
      </div>

      <section className={`card ${styles.table}`} aria-label="So sánh các phương án vận chuyển">
        <div className={styles.headRow} aria-hidden="true">
          <span>Dịch vụ</span>
          <span>Thời gian vận chuyển</span>
          <span>CO₂e</span>
          <span>Phạm vi &amp; điều kiện riêng</span>
          <span>Giá (ví dụ)</span>
          <span>Lựa chọn</span>
        </div>
        {services.map((service) => (
          <ServiceRow
            key={service.id}
            service={service}
            selected={service.id === selectedServiceId}
            expanded={expanded === service.id}
            onSelect={() => service.eligible && selectService(service.id)}
            onToggle={() => setExpanded((prev) => (prev === service.id ? null : service.id))}
          />
        ))}
        <div className={styles.footnotes}>
          <p>
            <Info size={14} />
            Giống nhau ở cả 4 phương án: thủ tục xuất khẩu đã bao gồm; thủ tục nhập khẩu tại EU bạn
            tự thực hiện.
          </p>
          <p>
            <Leaf size={14} />
            Phát thải là ước tính CO₂e cho toàn bộ 1.850 kg hàng.
          </p>
        </div>
      </section>

      <section className={`card ${styles.bridge}`}>
        <div className={styles.bridgeGrid}>
          <div className={styles.bridgeLeft}>
            <p className={styles.bridgeLabel}>PHƯƠNG ÁN ĐANG CHỌN</p>
            <p className={styles.selectedService}>
              <span
                aria-hidden="true"
                style={{ height: 8, width: 8, borderRadius: 999, background: 'var(--color-accent)' }}
              />
              {selected.name}
              <span className={styles.selectedPrice}>{formatMoney(selected.priceVnd, 'VND')}</span>
              <span className="badge">ví dụ</span>
            </p>
            <p className={styles.contextMeta} style={{ marginTop: 4 }}>
              {selected.transitDays[0]}–{selected.transitDays[1]} ngày · giao dự kiến {selected.arrival} ·{' '}
              {selected.scope.split(',')[0]}
            </p>

            <div className={styles.docGroup}>
              <p className={styles.bridgeLabel}>CHỨNG TỪ CHO BƯỚC ĐẶT CHỖ</p>
              <div className={styles.docList}>
                <p className={styles.docRow}>
                  <span className={styles.docName}>
                    <Check size={13} className={styles.docOwned} /> MSDS pin lithium
                  </span>
                  <span className={styles.docOwned}>đã có</span>
                </p>
                <p className={styles.docRow}>
                  <span className={styles.docName}>
                    <TriangleAlert size={13} className={styles.docMissing} /> Khai báo hàng nguy hiểm
                  </span>
                  <span className={styles.docMissing}>chưa có</span>
                </p>
                <p className={styles.docRow}>
                  <span className={styles.docName}>
                    <Check size={13} className={styles.docOwned} /> Hoá đơn thương mại
                  </span>
                  <span className={styles.docOwned}>đã có</span>
                </p>
              </div>
              <p className="hint" style={{ marginTop: 10 }}>
                Chứng từ đã tải lên được giữ khi bạn chỉnh sửa tuyến hoặc hàng hoá.
              </p>
            </div>
          </div>

          <div className={styles.bridgeRight}>
            <div className={styles.contactHead}>
              <p className={styles.contactTitle}>Liên hệ cho bước đặt chỗ</p>
              <p className="hint">
                Thông tin dùng cho lô hàng đang chọn. Chứng từ còn thiếu sẽ được nhắc trong quá
                trình đặt chỗ.
              </p>
            </div>

            <div className={styles.contactGrid}>
              <div className={`field ${styles.fullSpan}`}>
                <span className="label">Loại khách hàng</span>
                <div style={{ display: 'flex', gap: 16 }}>
                  {(['business', 'individual'] as const).map((type) => (
                    <label key={type} className="checkRow">
                      <input
                        type="radio"
                        name="contact-type"
                        checked={contact.customerType === type}
                        onChange={() => setContact({ ...contact, customerType: type })}
                      />
                      {type === 'business' ? 'Khách hàng doanh nghiệp' : 'Khách hàng cá nhân'}
                    </label>
                  ))}
                </div>
              </div>
              {contact.customerType === 'business' && (
                <div className="field">
                  <label className="label" htmlFor="bridge-company">
                    Tên công ty
                  </label>
                  <input
                    id="bridge-company"
                    className="input"
                    value={contact.companyName}
                    onChange={(event) => setContact({ ...contact, companyName: event.target.value })}
                    aria-invalid={Boolean(tried && errors.companyName)}
                  />
                  {tried && errors.companyName && <span className="errorText">{errors.companyName}</span>}
                </div>
              )}
              <div className="field">
                <label className="label" htmlFor="bridge-name">
                  Họ và tên
                </label>
                <input
                  id="bridge-name"
                  className="input"
                  value={contact.fullName}
                  onChange={(event) => setContact({ ...contact, fullName: event.target.value })}
                  aria-invalid={Boolean(tried && errors.fullName)}
                />
                {tried && errors.fullName && <span className="errorText">{errors.fullName}</span>}
              </div>
              <div className="field">
                <label className="label" htmlFor="bridge-phone">
                  Số điện thoại
                </label>
                <input
                  id="bridge-phone"
                  className="input mono"
                  value={contact.phone}
                  onChange={(event) => setContact({ ...contact, phone: event.target.value })}
                  aria-invalid={Boolean(tried && errors.phone)}
                />
                {tried && errors.phone && <span className="errorText">{errors.phone}</span>}
              </div>
              <div className={`field ${styles.fullSpan}`}>
                <label className="label" htmlFor="bridge-email">
                  Email công việc
                </label>
                <input
                  id="bridge-email"
                  className="input"
                  type="email"
                  value={contact.email}
                  onChange={(event) => setContact({ ...contact, email: event.target.value })}
                  aria-invalid={Boolean(tried && errors.email)}
                />
                {tried && errors.email && <span className="errorText">{errors.email}</span>}
              </div>
              <label className={`checkRow ${styles.fullSpan}`}>
                <input
                  type="checkbox"
                  checked={contact.marketingOptIn}
                  onChange={(event) => setContact({ ...contact, marketingOptIn: event.target.checked })}
                />
                Đồng ý nhận thông tin cập nhật tuyến và biểu giá.
              </label>
              <label className={`checkRow ${styles.fullSpan}`}>
                <input
                  type="checkbox"
                  checked={contact.termsAccepted}
                  onChange={(event) => setContact({ ...contact, termsAccepted: event.target.checked })}
                />
                Tôi đã đọc và đồng ý toàn bộ điều khoản của doanh nghiệp.
              </label>
              {tried && errors.termsAccepted && (
                <span className={`errorText ${styles.fullSpan}`}>{errors.termsAccepted}</span>
              )}
            </div>
          </div>
        </div>

        <div className={styles.actionBar}>
          <p className={styles.actionHint}>
            Bước tiếp theo: đặt chỗ theo 5 bước — dịch vụ, tuyến đường, hàng hoá, chứng từ, thanh toán.
          </p>
          <div className={styles.actionButtons}>
            <button type="button" className="btnLink" onClick={onEditQuote}>
              Quay lại báo giá
            </button>
            <button type="button" className="btn btnPrimary" onClick={submitContact}>
              Tiếp tục đặt chỗ
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function ServiceRow({
  service,
  selected,
  expanded,
  onSelect,
  onToggle,
}: {
  service: ServiceOption
  selected: boolean
  expanded: boolean
  onSelect: () => void
  onToggle: () => void
}) {
  const condition = service.conditions[0]
  const hasDetail = service.conditions.length > 1 || service.exclusions.length > 0

  return (
    <div
      className={`${styles.row} ${selected ? styles.rowSelected : ''} ${
        !service.eligible ? styles.rowIneligible : ''
      }`}
    >
      <div className={styles.serviceCell}>
        <button
          type="button"
          className={`${styles.radioButton} ${selected ? styles.radioButtonSelected : ''} ${
            !service.eligible ? styles.radioDisabled : ''
          }`}
          aria-label={`Chọn ${service.name}`}
          aria-pressed={selected}
          disabled={!service.eligible}
          onClick={onSelect}
        >
          {selected && <Check size={12} strokeWidth={3} />}
        </button>
        <div style={{ minWidth: 0 }}>
          <p className={styles.serviceName} style={!service.eligible ? { color: 'var(--color-text-secondary)' } : undefined}>
            {service.name}
          </p>
          <p className={styles.serviceMode}>
            <ModeIcon mode={service.mode} />
            {service.modeLabel}
          </p>
          <div className={styles.badges}>
            {service.badges.map((badge) => (
              <span
                key={badge.label}
                className={`badge ${
                  badge.tone === 'success'
                    ? 'badgeSuccess'
                    : badge.tone === 'warning'
                      ? 'badgeWarning'
                      : badge.tone === 'danger'
                        ? 'badgeDanger'
                        : 'badgeAccent'
                }`}
              >
                {badge.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div>
        <p className={styles.metricValue} style={!service.eligible ? { color: 'var(--color-text-secondary)' } : undefined}>
          {service.transitDays[0]}–{service.transitDays[1]} ngày
        </p>
        <p className={styles.metricNote}>Dự kiến giao {service.arrival}</p>
      </div>

      <div>
        <p className={styles.metricValue} style={!service.eligible ? { color: 'var(--color-text-secondary)' } : undefined}>
          {service.emissionsKg.toLocaleString('vi-VN')} kg
        </p>
        <p className={styles.metricNote}>{service.emissionsNote}</p>
      </div>

      <div>
        <p className={styles.scopeText}>{service.scope}</p>
        {condition && <p className={styles.conditionText}>{condition}</p>}
        {service.eligibilityNote && (
          <p className={styles.exclusionText}>{service.eligibilityNote}</p>
        )}
        {expanded && (
          <div style={{ marginTop: 6 }}>
            {service.conditions.slice(1).map((item) => (
              <p key={item} className={styles.conditionText}>
                {item}
              </p>
            ))}
            {service.exclusions.map((item) => (
              <p key={item} className={styles.exclusionText}>
                {item}
              </p>
            ))}
          </div>
        )}
        {hasDetail && (
          <button
            type="button"
            className={`btnLink ${styles.conditionToggle}`}
            aria-expanded={expanded}
            onClick={onToggle}
          >
            {expanded ? 'Thu gọn điều kiện' : 'Điều kiện chi tiết'}
          </button>
        )}
      </div>

      <div className={styles.priceCell}>
        <p className={styles.price}>
          {service.priceVnd.toLocaleString('vi-VN')}{' '}
          <span className={styles.priceCurrency}>VND</span>
        </p>
        <p className={styles.priceNote}>{service.priceNote}</p>
      </div>

      <div className={styles.selectCell}>
        {service.eligible ? (
          selected ? (
            <span className="btn btnSm" style={{ borderColor: 'var(--color-accent)', color: 'var(--color-accent-ink)' }}>
              <Check size={13} /> Đã chọn
            </span>
          ) : (
            <button type="button" className="btn btnSm" onClick={onSelect}>
              Chọn dịch vụ
            </button>
          )
        ) : (
          <div className={styles.notEligible}>
            <span className={styles.notEligibleBadge}>
              <CircleSlash size={13} style={{ marginRight: 5 }} /> Không phù hợp
            </span>
            <span className={styles.notEligibleNote}>Lý do ở cột phạm vi</span>
          </div>
        )}
      </div>
    </div>
  )
}
