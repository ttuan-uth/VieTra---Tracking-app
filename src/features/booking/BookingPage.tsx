import { useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Info,
  Leaf,
  Package,
  ShieldCheck,
  UploadCloud,
  X,
} from 'lucide-react'
import styles from './BookingPage.module.css'
import { useAppStore } from '../../store/AppStore'
import { INCOTERMS, serviceById } from '../../data/services'
import type {
  BillingDetails,
  ContactDetails,
  DemoDocument,
  RouteBooking,
  ServiceAddons,
} from '../../types/domain'
import { AddressFields } from '../../components/AddressFields'
import { addDays, dateLabel, nowIso } from '../../utils/date'
import {
  formatFileSize,
  formatMoney,
  formatVolume,
  totalVolume,
  totalWeight,
} from '../../utils/format'
import { bookingPriceLines, bookingTotal } from './pricing'
import { documentForSlot, requiredDocumentSlots } from '../bookings/documents'
import { countryName } from '../../data/countries'
import { errorMessage } from '../../api/client'

interface BookingPageProps {
  contact: ContactDetails
  onBackToServices: () => void
  onEditQuote: () => void
  onComplete: (bookingId: string) => void
}

const STEPS = [
  { id: 'service', label: 'Dịch vụ' },
  { id: 'route', label: 'Tuyến đường' },
  { id: 'cargo', label: 'Hàng hoá' },
  { id: 'documents', label: 'Chứng từ' },
  { id: 'billing', label: 'Thanh toán' },
] as const

const MAX_FILE_BYTES = 10 * 1024 * 1024

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      className={`${styles.switch} ${checked ? styles.switchOn : ''}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span className={styles.switchKnob} />
    </button>
  )
}

export function BookingPage({
  contact,
  onBackToServices,
  onEditQuote,
  onComplete,
}: BookingPageProps) {
  const { quoteDraft, selectedServiceId, submitBooking } = useAppStore()
  const service = serviceById(selectedServiceId)

  const [stepIndex, setStepIndex] = useState(0)
  const [maxVisited, setMaxVisited] = useState(0)
  const [showReview, setShowReview] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [contactState, setContactState] = useState<ContactDetails>(contact)
  const [addons, setAddons] = useState<ServiceAddons>({
    exportCustoms: true,
    importCustoms: false,
    declarationLines: 2,
    cargoInsurance: true,
    insuredValue: 48_000,
    insuredCurrency: 'USD',
    sustainability: 'fuel',
    incoterm: 'CIF',
  })
  const [route, setRoute] = useState<RouteBooking>({
    shipperSameAsPickup: true,
    consigneeSameAsDelivery: true,
    shipperAddress: { ...quoteDraft.pickup },
    consigneeAddress: { ...quoteDraft.delivery },
    pickupDate: addDays(nowIso(), 6).slice(0, 10),
  })
  const [billing, setBilling] = useState<BillingDetails>({
    companyName: contact.companyName || contact.fullName,
    reference: '',
    invoiceEmail: contact.email,
    taxId: '',
    addressMode: 'shipper',
    billingCompanyName: '',
    billingStreet: '',
    billingCity: '',
    billingState: '',
    billingPostalCode: '',
    billingCountry: 'VN',
    recipients: [],
    shareConfirmed: false,
  })
  const [recipientInput, setRecipientInput] = useState('')
  const [documents, setDocuments] = useState<DemoDocument[]>([])
  const [dragActiveSlot, setDragActiveSlot] = useState<string | null>(null)
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null)
  const [fileError, setFileError] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const documentSlots = useMemo(
    () =>
      requiredDocumentSlots({
        mode: service.mode,
        specialTypes: quoteDraft.specialTypes,
        cargoInsurance: addons.cargoInsurance,
      }),
    [service.mode, quoteDraft.specialTypes, addons.cargoInsurance],
  )

  const priceLines = useMemo(() => bookingPriceLines(service, addons), [service, addons])
  const total = useMemo(() => bookingTotal(service, addons), [service, addons])
  const volume = totalVolume(quoteDraft.lines)
  const weight = totalWeight(quoteDraft.lines)
  const pieces = quoteDraft.lines.reduce((sum, line) => sum + line.quantity, 0)

  const validateStep = (index: number): Record<string, string> => {
    const next: Record<string, string> = {}
    if (index === 1) {
      if (!route.pickupDate) next.pickupDate = 'Chọn ngày lấy hàng dự kiến.'
      if (!route.shipperSameAsPickup) {
        if (route.shipperAddress.street.trim().length < 3)
          next.shipperStreet = 'Nhập địa chỉ người gửi.'
        if (route.shipperAddress.city.trim().length < 2)
          next.shipperCity = 'Nhập thành phố người gửi.'
      }
      if (!route.consigneeSameAsDelivery) {
        if (route.consigneeAddress.street.trim().length < 3)
          next.consigneeStreet = 'Nhập địa chỉ người nhận.'
        if (route.consigneeAddress.city.trim().length < 2)
          next.consigneeCity = 'Nhập thành phố người nhận.'
      }
    }
    if (index === 3) {
      const missing = documentSlots.filter(
        (slot) => slot.required && !documentForSlot(documents, slot.id),
      )
      if (missing.length > 0) {
        next.documents = `Còn ${missing.length} tài liệu bắt buộc chưa được tải lên.`
      }
    }
    if (index === 4) {
      if (billing.companyName.trim().length < 2) next.billingCompany = 'Nhập tên doanh nghiệp.'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(billing.invoiceEmail))
        next.invoiceEmail = 'Email nhận hoá đơn chưa đúng định dạng.'
      if (billing.addressMode === 'new') {
        if (!billing.billingCompanyName.trim())
          next.billingCompanyName = 'Nhập tên doanh nghiệp xuất hoá đơn.'
        if (!billing.billingStreet.trim()) next.billingStreet = 'Nhập địa chỉ xuất hoá đơn.'
        if (!billing.billingCity.trim()) next.billingCity = 'Nhập thành phố.'
        if (!billing.billingPostalCode.trim()) next.billingPostalCode = 'Nhập mã bưu chính.'
        if (!billing.billingCountry.trim()) next.billingCountry = 'Chọn quốc gia.'
      }
    }
    return next
  }

  const goNext = () => {
    const nextErrors = validateStep(stepIndex)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    if (stepIndex === STEPS.length - 1) {
      setShowReview(true)
      return
    }
    const nextIndex = stepIndex + 1
    setStepIndex(nextIndex)
    setMaxVisited((prev) => Math.max(prev, nextIndex))
  }

  const goBack = () => {
    if (showReview) {
      setShowReview(false)
      return
    }
    setStepIndex((prev) => Math.max(0, prev - 1))
  }

  const goToStep = (index: number) => {
    if (index > maxVisited) return
    setShowReview(false)
    setStepIndex(index)
  }

  const uploadToSlot = (slotId: string, files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setFileError('')
    if (file.size > MAX_FILE_BYTES) {
      setFileError(`"${file.name}" vượt quá 10 MB nên chưa được thêm.`)
      return
    }
    setDocuments((prev) => {
      const existing = prev.find((item) => item.slotId === slotId)
      const document: DemoDocument = {
        id: existing?.id ?? `doc-${slotId}-${Date.now()}`,
        slotId,
        name: file.name,
        sizeBytes: file.size,
        status: 'pending',
        uploadedAt: nowIso(),
      }
      return existing
        ? prev.map((item) => (item.slotId === slotId ? document : item))
        : [...prev, document]
    })
    setErrors((prev) => ({ ...prev, documents: '' }))
  }

  const addRecipient = () => {
    const email = recipientInput.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors((prev) => ({ ...prev, recipient: 'Email người nhận chưa đúng định dạng.' }))
      return
    }
    if (!billing.recipients.includes(email)) {
      setBilling((prev) => ({ ...prev, recipients: [...prev.recipients, email] }))
    }
    setRecipientInput('')
    setErrors((prev) => ({ ...prev, recipient: '' }))
  }

  const completeBooking = async () => {
    if (!termsAccepted) {
      setErrors({ terms: 'Cần đồng ý điều khoản trước khi hoàn tất.' })
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      const booking = await submitBooking({
        quote: quoteDraft,
        contact: contactState,
        serviceId: service.id,
        addons,
        route,
        billing,
        documents,
      })
      onComplete(booking.id)
    } catch (error) {
      setSubmitError(errorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  const stepTitle = showReview
    ? 'Xem lại và xác nhận đặt chỗ'
    : `Bước ${stepIndex + 1} · ${STEPS[stepIndex].label}`

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1>Hoàn tất đặt chỗ</h1>
          <p className={styles.lede}>
            Thông tin báo giá và liên hệ đã được điền sẵn. Chỉ cần bổ sung dịch vụ, tuyến đường,
            chứng từ và thanh toán.
          </p>
        </div>
        <button type="button" className="btn" onClick={onBackToServices}>
          <ArrowLeft size={14} /> Đổi dịch vụ
        </button>
      </div>

      <nav className={styles.stepper} aria-label="Các bước đặt chỗ">
        {STEPS.map((step, index) => {
          const active = !showReview && index === stepIndex
          const done = showReview || index < stepIndex
          return (
            <button
              key={step.id}
              type="button"
              className={`${styles.step} ${active ? styles.stepActive : ''} ${done ? styles.stepDone : ''}`}
              onClick={() => goToStep(index)}
              disabled={index > maxVisited}
              aria-current={active ? 'step' : undefined}
            >
              <span className={styles.stepIndex}>{done ? <Check size={11} /> : index + 1}</span>
              {step.label}
            </button>
          )
        })}
      </nav>

      <div className={styles.layout}>
        <div className={styles.main}>
          <section className="card">
            <div className={styles.cardHead}>
              <div className={styles.cardHeadText}>
                <span className={styles.cardTitle}>{stepTitle}</span>
                <span className={styles.cardSub}>
                  {showReview
                    ? 'Kiểm tra lại toàn bộ trước khi gửi yêu cầu.'
                    : 'Dữ liệu được giữ nguyên khi quay lại các bước trước.'}
                </span>
              </div>
              {stepIndex === 2 && !showReview && (
                <button type="button" className="btn btnSm" onClick={onEditQuote}>
                  Chỉnh sửa hàng hoá
                </button>
              )}
            </div>

            {!showReview && stepIndex === 0 && (
              <div className={styles.body}>
                <div>
                  <p className={styles.summaryLabel} style={{ marginBottom: 8 }}>
                    THÔNG QUAN HẢI QUAN
                  </p>
                  <div className={styles.choiceGrid}>
                    <div className={styles.toggleRow}>
                      <div>
                        <p className={styles.choiceTitle}>Thông quan xuất khẩu</p>
                        <p className={styles.choiceHint}>Bao gồm thủ tục tại Việt Nam.</p>
                      </div>
                      <Toggle
                        checked={addons.exportCustoms}
                        label="Thông quan xuất khẩu"
                        onChange={(next) => setAddons({ ...addons, exportCustoms: next })}
                      />
                    </div>
                    <div className={styles.toggleRow}>
                      <div>
                        <p className={styles.choiceTitle}>Thông quan nhập khẩu</p>
                        <p className={styles.choiceHint}>Thủ tục tại EU do VieTra thực hiện.</p>
                      </div>
                      <Toggle
                        checked={addons.importCustoms}
                        label="Thông quan nhập khẩu"
                        onChange={(next) => setAddons({ ...addons, importCustoms: next })}
                      />
                    </div>
                  </div>

                  <div className={styles.grid2} style={{ marginTop: 12 }}>
                    <div className={styles.toggleRow}>
                      <div>
                        <p className={styles.choiceTitle}>Số dòng khai báo hải quan</p>
                        <p className={styles.choiceHint}>Điều chỉnh bằng nút − / +.</p>
                      </div>
                      <div className={styles.stepperControl}>
                        <button
                          type="button"
                          className={styles.stepperButton}
                          aria-label="Giảm số dòng khai báo"
                          onClick={() =>
                            setAddons({
                              ...addons,
                              declarationLines: Math.max(0, addons.declarationLines - 1),
                            })
                          }
                        >
                          −
                        </button>
                        <span className={styles.stepperValue}>{addons.declarationLines}</span>
                        <button
                          type="button"
                          className={styles.stepperButton}
                          aria-label="Tăng số dòng khai báo"
                          onClick={() =>
                            setAddons({ ...addons, declarationLines: addons.declarationLines + 1 })
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className={styles.toggleRow}>
                      <div>
                        <p className={styles.choiceTitle}>Incoterm</p>
                        <p className={styles.choiceHint}>Điều kiện giao hàng áp dụng.</p>
                      </div>
                      <select
                        className="select"
                        style={{ width: 106 }}
                        aria-label="Incoterm"
                        value={addons.incoterm}
                        onChange={(event) => setAddons({ ...addons, incoterm: event.target.value })}
                      >
                        {INCOTERMS.map((term) => (
                          <option key={term}>{term}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <hr className={styles.sectionRule} />

                <div>
                  <p className={styles.summaryLabel} style={{ marginBottom: 8 }}>
                    BẢO HIỂM HÀNG HOÁ
                  </p>
                  <div className={styles.toggleRow}>
                    <div>
                      <p className={styles.choiceTitle}>Cargo Insurance</p>
                      <p className={styles.choiceHint}>Tính phí minh hoạ theo giá trị khai báo.</p>
                    </div>
                    <Toggle
                      checked={addons.cargoInsurance}
                      label="Bảo hiểm hàng hoá"
                      onChange={(next) => setAddons({ ...addons, cargoInsurance: next })}
                    />
                  </div>
                  {addons.cargoInsurance && (
                    <div className={styles.grid3} style={{ marginTop: 10 }}>
                      <div className="field">
                        <label className="label" htmlFor="insured-value">
                          Giá trị hàng cần bảo hiểm
                        </label>
                        <input
                          id="insured-value"
                          className="input mono"
                          type="number"
                          min={0}
                          value={addons.insuredValue}
                          onChange={(event) =>
                            setAddons({ ...addons, insuredValue: Number(event.target.value) })
                          }
                        />
                      </div>
                      <div className="field">
                        <label className="label" htmlFor="insured-currency">
                          Loại tiền tệ
                        </label>
                        <select
                          id="insured-currency"
                          className="select"
                          value={addons.insuredCurrency}
                          onChange={(event) =>
                            setAddons({
                              ...addons,
                              insuredCurrency: event.target
                                .value as ServiceAddons['insuredCurrency'],
                            })
                          }
                        >
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                          <option value="VND">VND</option>
                        </select>
                      </div>
                      <div className="field">
                        <span className="label">Phí bảo hiểm dự kiến</span>
                        <p className="mono" style={{ paddingTop: 8, fontWeight: 600 }}>
                          {formatMoney(
                            priceLines.find((line) => line.key === 'insurance')?.amount ?? 0,
                            'VND',
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <hr className={styles.sectionRule} />

                <div>
                  <p className={styles.summaryLabel} style={{ marginBottom: 8 }}>
                    VẬN TẢI XANH HƠN
                  </p>
                  <div className={styles.grid3}>
                    <div className={styles.cargoMetric}>
                      <span className={styles.cargoLabel}>PHÁT THẢI CO₂e ƯỚC TÍNH</span>
                      <span className={styles.cargoValue}>
                        {service.emissionsKg.toLocaleString('vi-VN')} kg
                      </span>
                      <span className={styles.inlineNote}>{service.emissionsNote}</span>
                    </div>
                    <div className="field">
                      <label className="label" htmlFor="sustainability">
                        Phương án phát triển bền vững
                      </label>
                      <select
                        id="sustainability"
                        className="select"
                        value={addons.sustainability}
                        onChange={(event) =>
                          setAddons({
                            ...addons,
                            sustainability: event.target
                              .value as ServiceAddons['sustainability'],
                          })
                        }
                      >
                        <option value="none">Không chọn</option>
                        <option value="fuel">Nhiên liệu bền vững · 1,5% cước</option>
                        <option value="offset">Bù đắp carbon · 0,8% cước</option>
                      </select>
                    </div>
                    <div className={styles.cargoMetric}>
                      <span className={styles.cargoLabel}>PHÍ DỊCH VỤ BỀN VỮNG</span>
                      <span className={styles.cargoValue}>
                        {formatMoney(
                          priceLines.find((line) => line.key === 'sustainability')?.amount ?? 0,
                          'VND',
                        )}
                      </span>
                      <span className={styles.inlineNote}>
                        <Leaf size={12} style={{ verticalAlign: -2, marginRight: 3 }} />
                        Khoản phí chỉ áp dụng khi được chọn.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!showReview && stepIndex === 1 && (
              <div className={styles.body}>
                <div className={styles.grid2}>
                  <div className={styles.routeCard}>
                    <p className={styles.routeCardHead}>
                      <Package size={15} /> Người gửi · điểm đi
                    </p>
                    <p className={styles.routeCity}>
                      {quoteDraft.pickup.city}, {countryName(quoteDraft.pickup.countryCode)}
                    </p>
                    <p className={styles.routeMeta}>
                      {quoteDraft.pickup.street} · {quoteDraft.pickup.postalCode}
                    </p>
                    <p className={styles.routeMeta} style={{ marginTop: 6 }}>
                      {quoteDraft.handoff === 'carrier-pickup'
                        ? 'Hình thức: chúng tôi đến lấy hàng.'
                        : 'Hình thức: bạn giao hàng đến kho.'}
                    </p>
                    <label className="checkRow" style={{ marginTop: 12 }}>
                      <input
                        type="checkbox"
                        checked={route.shipperSameAsPickup}
                        onChange={(event) =>
                          setRoute({ ...route, shipperSameAsPickup: event.target.checked })
                        }
                      />
                      Shipper address same as pick-up address
                    </label>
                    {!route.shipperSameAsPickup && (
                      <div className={styles.addresses}>
                        <AddressFields
                          idPrefix="shipper"
                          address={route.shipperAddress}
                          onChange={(shipperAddress) => setRoute({ ...route, shipperAddress })}
                          errors={errors}
                        />
                      </div>
                    )}
                  </div>

                  <div className={styles.routeCard}>
                    <p className={styles.routeCardHead}>
                      <Package size={15} /> Người nhận · điểm đến
                    </p>
                    <p className={styles.routeCity}>
                      {quoteDraft.delivery.city}, {countryName(quoteDraft.delivery.countryCode)}
                    </p>
                    <p className={styles.routeMeta}>
                      {quoteDraft.delivery.street} · {quoteDraft.delivery.postalCode}
                    </p>
                    <p className={styles.routeMeta} style={{ marginTop: 6 }}>
                      Liên hệ: {contactState.fullName} · {contactState.phone}
                    </p>
                    <label className="checkRow" style={{ marginTop: 12 }}>
                      <input
                        type="checkbox"
                        checked={route.consigneeSameAsDelivery}
                        onChange={(event) =>
                          setRoute({ ...route, consigneeSameAsDelivery: event.target.checked })
                        }
                      />
                      Consignee address same as delivery address
                    </label>
                    {!route.consigneeSameAsDelivery && (
                      <div className={styles.addresses}>
                        <AddressFields
                          idPrefix="consignee"
                          address={route.consigneeAddress}
                          onChange={(consigneeAddress) => setRoute({ ...route, consigneeAddress })}
                          errors={errors}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.grid2}>
                  <div className="field">
                    <label className="label" htmlFor="pickup-date">
                      Pick up date
                    </label>
                    <input
                      id="pickup-date"
                      className="input mono"
                      type="date"
                      value={route.pickupDate}
                      onChange={(event) => setRoute({ ...route, pickupDate: event.target.value })}
                      aria-invalid={Boolean(errors.pickupDate)}
                    />
                    {errors.pickupDate && <span className="errorText">{errors.pickupDate}</span>}
                  </div>
                  <div className={styles.cargoMetric} style={{ alignSelf: 'end' }}>
                    <span className={styles.cargoLabel}>LỘ TRÌNH NỘI ĐỊA CHẶNG ĐẦU</span>
                    <span className={styles.inlineNote}>
                      {service.mode === 'air' ? 'Nội Bài' : 'Cảng Hải Phòng'} → trung chuyển{' '}
                      {service.mode === 'air' ? 'Frankfurt' : 'Singapore'} → Hamburg. Bản đồ chi
                      tiết nằm trong trang Theo dõi sau khi booking được cấp mã.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {!showReview && stepIndex === 2 && (
              <div className={styles.body}>
                <div className={styles.cargoSummary}>
                  <div className={styles.cargoMetric}>
                    <span className={styles.cargoLabel}>SỐ KIỆN</span>
                    <span className={styles.cargoValue}>{pieces}</span>
                  </div>
                  <div className={styles.cargoMetric}>
                    <span className={styles.cargoLabel}>TỔNG TRỌNG LƯỢNG</span>
                    <span className={styles.cargoValue}>
                      {Math.round(weight).toLocaleString('vi-VN')} kg
                    </span>
                  </div>
                  <div className={styles.cargoMetric}>
                    <span className={styles.cargoLabel}>TỔNG THỂ TÍCH</span>
                    <span className={styles.cargoValue}>{formatVolume(volume)}</span>
                  </div>
                </div>

                <div className={styles.lineList}>
                  <div className={`${styles.lineRow} ${styles.lineRowHead}`} aria-hidden="true">
                    <span>Loại bao bì</span>
                    <span>Số kiện</span>
                    <span>KL/kiện</span>
                    <span>Kích thước</span>
                    <span>Thể tích</span>
                  </div>
                  {quoteDraft.lines.map((line) => (
                    <div key={line.id} className={styles.lineRow}>
                      <span>{line.packageType}</span>
                      <span className="mono">{line.quantity}</span>
                      <span className="mono">{line.weightKg} kg</span>
                      <span className="mono">
                        {line.lengthCm} × {line.widthCm} × {line.heightCm} cm
                      </span>
                      <span className="mono">
                        {(
                          (line.lengthCm * line.widthCm * line.heightCm * line.quantity) /
                          1_000_000
                        ).toFixed(2)}{' '}
                        m³
                      </span>
                    </div>
                  ))}
                </div>

                <p className={styles.inlineNote}>
                  Thông tin hàng hoá được lấy từ bước báo giá. Nếu thay đổi loại hàng hoặc kích
                  thước, hãy chỉnh sửa báo giá trước khi tiếp tục.
                </p>
              </div>
            )}

            {!showReview && stepIndex === 3 && (
              <div className={styles.body}>
                <p className={styles.inlineNote}>
                  Tải đủ tài liệu bắt buộc cho lô hàng. Mỗi mục chỉ nhận một tệp; tối đa 10 MB mỗi
                  tệp. Bạn có thể thay tệp sau khi gửi nếu admin yêu cầu bổ sung.
                </p>

                <div className={styles.docSlotList}>
                  {documentSlots.map((slot) => {
                    const document = documentForSlot(documents, slot.id)
                    const isDragging = dragActiveSlot === slot.id
                    return (
                      <div
                        key={slot.id}
                        className={`${styles.docSlot} ${isDragging ? styles.docSlotActive : ''}`}
                        onDragOver={(event) => {
                          event.preventDefault()
                          setDragActiveSlot(slot.id)
                        }}
                        onDragLeave={() => setDragActiveSlot(null)}
                        onDrop={(event) => {
                          event.preventDefault()
                          setDragActiveSlot(null)
                          uploadToSlot(slot.id, event.dataTransfer.files)
                        }}
                      >
                        <div className={styles.docSlotHead}>
                          <span className={styles.docSlotTitle}>
                            {slot.label}
                            {slot.required && <span className="badge">Bắt buộc</span>}
                          </span>
                          <button
                            type="button"
                            className="btn btnSm"
                            onClick={() => {
                              setUploadingSlot(slot.id)
                              inputRef.current?.click()
                            }}
                          >
                            {document ? 'Thay tệp' : <><UploadCloud size={13} /> Tải tệp</>}
                          </button>
                        </div>
                        <p className={styles.docSlotHint}>{slot.hint}</p>

                        {document ? (
                          <div className={styles.docItem}>
                            <span className={styles.docInfo}>
                              <FileText size={15} />
                              <span className={styles.docName}>{document.name}</span>
                              <span className={styles.docSize}>
                                {formatFileSize(document.sizeBytes)}
                              </span>
                              <span className="badge badgeWarning">Chờ xác minh</span>
                            </span>
                            <button
                              type="button"
                              className={styles.removeButton}
                              aria-label={`Xoá ${slot.label}`}
                              onClick={() =>
                                setDocuments((prev) =>
                                  prev.filter((item) => item.slotId !== slot.id),
                                )
                              }
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <p className={styles.docEmpty}>Chưa có tệp cho mục này.</p>
                        )}
                      </div>
                    )
                  })}
                </div>

                <input
                  ref={inputRef}
                  type="file"
                  className="srOnly"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
                  onChange={(event) => {
                    if (uploadingSlot) uploadToSlot(uploadingSlot, event.target.files)
                    event.target.value = ''
                    setUploadingSlot(null)
                  }}
                />
                {fileError && <p className="errorText">{fileError}</p>}
                {errors.documents && <p className="errorText">{errors.documents}</p>}

                <div className={styles.statusNote}>
                  <Info size={15} />
                  <span>
                    Bản mockup chỉ ghi nhận tên tệp trong trình duyệt. Chứng từ được admin xác minh
                    sau khi bạn hoàn tất; mã vận tải chỉ được cấp khi toàn bộ tài liệu bắt buộc đã
                    xác minh.
                  </span>
                </div>
              </div>
            )}

            {!showReview && stepIndex === 4 && (
              <div className={styles.body}>
                <div>
                  <p className={styles.summaryLabel} style={{ marginBottom: 8 }}>
                    A · YOUR CONTACT DETAILS
                  </p>
                  <div className={styles.grid3}>
                    <div className="field">
                      <label className="label" htmlFor="billing-name">
                        Họ và tên
                      </label>
                      <input
                        id="billing-name"
                        className="input"
                        value={contactState.fullName}
                        onChange={(event) =>
                          setContactState({ ...contactState, fullName: event.target.value })
                        }
                      />
                    </div>
                    <div className="field">
                      <label className="label" htmlFor="billing-email">
                        Email liên hệ
                      </label>
                      <input
                        id="billing-email"
                        className="input"
                        type="email"
                        value={contactState.email}
                        onChange={(event) =>
                          setContactState({ ...contactState, email: event.target.value })
                        }
                      />
                    </div>
                    <div className="field">
                      <label className="label" htmlFor="billing-phone">
                        Số điện thoại
                      </label>
                      <input
                        id="billing-phone"
                        className="input mono"
                        value={contactState.phone}
                        onChange={(event) =>
                          setContactState({ ...contactState, phone: event.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>

                <hr className={styles.sectionRule} />

                <div>
                  <p className={styles.summaryLabel} style={{ marginBottom: 8 }}>
                    B · SHARE QUOTE
                  </p>
                  <div className={styles.chipInputRow}>
                    <input
                      className="input"
                      placeholder="Nhập email người nhận"
                      value={recipientInput}
                      onChange={(event) => setRecipientInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          addRecipient()
                        }
                      }}
                      aria-label="Email người nhận báo giá"
                    />
                    <button type="button" className="btn" onClick={addRecipient}>
                      Thêm email
                    </button>
                  </div>
                  {errors.recipient && <span className="errorText">{errors.recipient}</span>}
                  <div className={styles.chips}>
                    {billing.recipients.map((email) => (
                      <span key={email} className={styles.chip}>
                        {email}
                        <button
                          type="button"
                          className={styles.chipRemove}
                          aria-label={`Xoá ${email}`}
                          onClick={() =>
                            setBilling((prev) => ({
                              ...prev,
                              recipients: prev.recipients.filter((item) => item !== email),
                              shareConfirmed: false,
                            }))
                          }
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="btn btnSm"
                    style={{ marginTop: 10 }}
                    disabled={billing.recipients.length === 0}
                    onClick={() => setBilling((prev) => ({ ...prev, shareConfirmed: true }))}
                  >
                    {billing.shareConfirmed ? (
                      <>
                        <Check size={13} /> Đã xác nhận chia sẻ (mô phỏng)
                      </>
                    ) : (
                      'Xác nhận chia sẻ báo giá'
                    )}
                  </button>
                  <p className={styles.inlineNote} style={{ marginTop: 6 }}>
                    Bản demo không gửi email. Xác nhận chỉ đánh dấu trong phiên làm việc.
                  </p>
                </div>

                <hr className={styles.sectionRule} />

                <div>
                  <p className={styles.summaryLabel} style={{ marginBottom: 8 }}>
                    C · COMPANY DETAILS
                  </p>
                  <div className={styles.grid2}>
                    <div className="field">
                      <label className="label" htmlFor="billing-company">
                        Tên doanh nghiệp
                      </label>
                      <input
                        id="billing-company"
                        className="input"
                        value={billing.companyName}
                        onChange={(event) =>
                          setBilling({ ...billing, companyName: event.target.value })
                        }
                        aria-invalid={Boolean(errors.billingCompany)}
                      />
                      {errors.billingCompany && (
                        <span className="errorText">{errors.billingCompany}</span>
                      )}
                    </div>
                    <div className="field">
                      <label className="label" htmlFor="billing-reference">
                        Your reference (không bắt buộc)
                      </label>
                      <input
                        id="billing-reference"
                        className="input"
                        value={billing.reference}
                        onChange={(event) =>
                          setBilling({ ...billing, reference: event.target.value })
                        }
                      />
                    </div>
                    <div className="field">
                      <label className="label" htmlFor="billing-invoice-email">
                        Email nhận hoá đơn
                      </label>
                      <input
                        id="billing-invoice-email"
                        className="input"
                        type="email"
                        value={billing.invoiceEmail}
                        onChange={(event) =>
                          setBilling({ ...billing, invoiceEmail: event.target.value })
                        }
                        aria-invalid={Boolean(errors.invoiceEmail)}
                      />
                      {errors.invoiceEmail && (
                        <span className="errorText">{errors.invoiceEmail}</span>
                      )}
                    </div>
                    <div className="field">
                      <label className="label" htmlFor="billing-tax">
                        Mã số thuế
                      </label>
                      <input
                        id="billing-tax"
                        className="input mono"
                        value={billing.taxId}
                        onChange={(event) => setBilling({ ...billing, taxId: event.target.value })}
                      />
                    </div>
                  </div>

                  <p className={styles.summaryLabel} style={{ margin: '14px 0 8px' }}>
                    BILLING ADDRESS
                  </p>
                  <label className={styles.radioCard}>
                    <input
                      type="radio"
                      name="billing-address"
                      checked={billing.addressMode === 'shipper'}
                      onChange={() => setBilling({ ...billing, addressMode: 'shipper' })}
                    />
                    <span>
                      <strong style={{ fontSize: 13 }}>Sử dụng địa chỉ người gửi hàng</strong>
                      <span className={styles.inlineNote} style={{ display: 'block', marginTop: 3 }}>
                        {route.shipperSameAsPickup
                          ? quoteDraft.pickup.street
                          : route.shipperAddress.street}
                        ,{' '}
                        {route.shipperSameAsPickup
                          ? quoteDraft.pickup.city
                          : route.shipperAddress.city}
                      </span>
                    </span>
                  </label>
                  <label className={styles.radioCard}>
                    <input
                      type="radio"
                      name="billing-address"
                      checked={billing.addressMode === 'new'}
                      onChange={() => setBilling({ ...billing, addressMode: 'new' })}
                    />
                    <span>
                      <strong style={{ fontSize: 13 }}>Nhập địa chỉ xuất hoá đơn khác</strong>
                    </span>
                  </label>
                  {billing.addressMode === 'new' && (
                    <div className={styles.grid2}>
                      <div className="field">
                        <label className="label" htmlFor="billing-new-company">
                          Tên doanh nghiệp xuất hoá đơn
                        </label>
                        <input
                          id="billing-new-company"
                          className="input"
                          value={billing.billingCompanyName}
                          onChange={(event) =>
                            setBilling({ ...billing, billingCompanyName: event.target.value })
                          }
                        />
                        {errors.billingCompanyName && (
                          <span className="errorText">{errors.billingCompanyName}</span>
                        )}
                      </div>
                      <div className="field">
                        <label className="label" htmlFor="billing-new-street">
                          Địa chỉ đường
                        </label>
                        <input
                          id="billing-new-street"
                          className="input"
                          value={billing.billingStreet}
                          onChange={(event) =>
                            setBilling({ ...billing, billingStreet: event.target.value })
                          }
                        />
                        {errors.billingStreet && (
                          <span className="errorText">{errors.billingStreet}</span>
                        )}
                      </div>
                      <div className="field">
                        <label className="label" htmlFor="billing-new-city">
                          Thành phố
                        </label>
                        <input
                          id="billing-new-city"
                          className="input"
                          value={billing.billingCity}
                          onChange={(event) =>
                            setBilling({ ...billing, billingCity: event.target.value })
                          }
                        />
                        {errors.billingCity && (
                          <span className="errorText">{errors.billingCity}</span>
                        )}
                      </div>
                      <div className="field">
                        <label className="label" htmlFor="billing-new-state">
                          Tỉnh/thành hoặc bang
                        </label>
                        <input
                          id="billing-new-state"
                          className="input"
                          value={billing.billingState}
                          onChange={(event) =>
                            setBilling({ ...billing, billingState: event.target.value })
                          }
                        />
                      </div>
                      <div className="field">
                        <label className="label" htmlFor="billing-new-postal">
                          Mã bưu chính
                        </label>
                        <input
                          id="billing-new-postal"
                          className="input mono"
                          value={billing.billingPostalCode}
                          onChange={(event) =>
                            setBilling({ ...billing, billingPostalCode: event.target.value })
                          }
                        />
                        {errors.billingPostalCode && (
                          <span className="errorText">{errors.billingPostalCode}</span>
                        )}
                      </div>
                      <div className="field">
                        <label className="label" htmlFor="billing-new-country">
                          Quốc gia/vùng lãnh thổ
                        </label>
                        <input
                          id="billing-new-country"
                          className="input"
                          value={billing.billingCountry}
                          onChange={(event) =>
                            setBilling({ ...billing, billingCountry: event.target.value })
                          }
                        />
                        {errors.billingCountry && (
                          <span className="errorText">{errors.billingCountry}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {showReview && (
              <>
                <div className={styles.reviewGrid}>
                  <div className={styles.reviewSection}>
                    <span className={styles.reviewLabel}>ROUTE SUMMARY</span>
                    <div className={styles.reviewContent}>
                      <span className={styles.reviewStrong}>
                        {quoteDraft.pickup.city}, {countryName(quoteDraft.pickup.countryCode)} →{' '}
                        {quoteDraft.delivery.city}, {countryName(quoteDraft.delivery.countryCode)}
                      </span>
                      <span>Lấy hàng: {quoteDraft.pickup.street}</span>
                      <span>Giao hàng: {quoteDraft.delivery.street}</span>
                      <span>
                        Ngày lấy hàng dự kiến: {dateLabel(route.pickupDate)} · Giao dự kiến:{' '}
                        {service.arrival}
                      </span>
                    </div>
                    <button type="button" className="btnLink" onClick={() => goToStep(1)}>
                      Chỉnh sửa
                    </button>
                  </div>

                  <div className={styles.reviewSection}>
                    <span className={styles.reviewLabel}>CARGO SUMMARY</span>
                    <div className={`${styles.reviewContent} ${styles.reviewGrid2}`}>
                      <span>{pieces} kiện</span>
                      <span>{formatVolume(volume)}</span>
                      <span>{Math.round(weight).toLocaleString('vi-VN')} kg</span>
                      <span>{quoteDraft.lines.length} dòng hàng</span>
                      <span>Bao bì: {quoteDraft.lines[0]?.packageType ?? '—'}</span>
                      <span>
                        Đặc biệt:{' '}
                        {quoteDraft.specialTypes.length > 0 ? 'Pin lithium nhóm 9' : 'Không có'}
                      </span>
                    </div>
                    <button type="button" className="btnLink" onClick={onEditQuote}>
                      Chỉnh sửa
                    </button>
                  </div>

                  <div className={styles.reviewSection}>
                    <span className={styles.reviewLabel}>SERVICE SUMMARY</span>
                    <div className={styles.reviewContent}>
                      <span className={styles.reviewStrong}>{service.name}</span>
                      <span>
                        {service.modeLabel} · {service.scope}
                      </span>
                      <span>
                        Incoterm: {addons.incoterm} · Thời gian vận chuyển dự kiến:{' '}
                        {service.transitDays[0]}–{service.transitDays[1]} ngày
                      </span>
                    </div>
                    <button type="button" className="btnLink" onClick={onBackToServices}>
                      Đổi dịch vụ
                    </button>
                  </div>

                  <div className={styles.reviewSection}>
                    <span className={styles.reviewLabel}>ADDITIONAL SERVICES</span>
                    <div className={styles.reviewGrid2}>
                      <span className={addons.exportCustoms ? styles.reviewFlag : styles.reviewFlagOff}>
                        {addons.exportCustoms ? <Check size={12} /> : null} Thông quan xuất khẩu:{' '}
                        {addons.exportCustoms ? 'Có' : 'Không sử dụng'}
                      </span>
                      <span className={addons.importCustoms ? styles.reviewFlag : styles.reviewFlagOff}>
                        {addons.importCustoms ? <Check size={12} /> : null} Thông quan nhập khẩu:{' '}
                        {addons.importCustoms ? 'Có' : 'Không sử dụng'}
                      </span>
                      <span className={addons.cargoInsurance ? styles.reviewFlag : styles.reviewFlagOff}>
                        {addons.cargoInsurance ? <Check size={12} /> : null} Bảo hiểm hàng hoá:{' '}
                        {addons.cargoInsurance ? 'Có' : 'Không sử dụng'}
                      </span>
                      <span
                        className={
                          addons.sustainability !== 'none' ? styles.reviewFlag : styles.reviewFlagOff
                        }
                      >
                        {addons.sustainability !== 'none' ? <Check size={12} /> : null} Bền vững:{' '}
                        {addons.sustainability === 'none'
                          ? 'Không sử dụng'
                          : addons.sustainability === 'fuel'
                            ? 'Nhiên liệu bền vững'
                            : 'Bù đắp carbon'}
                      </span>
                    </div>
                    <button type="button" className="btnLink" onClick={() => goToStep(0)}>
                      Chỉnh sửa
                    </button>
                  </div>

                  <div className={styles.reviewSection}>
                    <span className={styles.reviewLabel}>PRICE SUMMARY</span>
                    <div className={styles.priceSummary}>
                      {priceLines.map((line) => (
                        <div key={line.key} className={styles.priceRow}>
                          <span>{line.label}</span>
                          <span
                            className={`${styles.moneyRight} ${!line.included ? styles.moneyExcluded : ''}`}
                          >
                            {line.included ? formatMoney(line.amount, 'VND') : 'Không tính phí'}
                          </span>
                        </div>
                      ))}
                      <div className={styles.totalRow}>
                        <span className={styles.totalLabel}>Tổng chi phí (chưa gồm thuế)</span>
                        <span className={styles.totalValue}>{formatMoney(total, 'VND')}</span>
                      </div>
                    </div>
                    <button type="button" className="btnLink" onClick={() => goToStep(4)}>
                      Chỉnh sửa
                    </button>
                  </div>
                </div>

                <div className={styles.termsBox}>
                  <label className="checkRow">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(event) => setTermsAccepted(event.target.checked)}
                    />
                    Tôi đã đọc và đồng ý với mọi điều khoản của doanh nghiệp.
                  </label>
                  {errors.terms && <span className="errorText">{errors.terms}</span>}
                  <div className={styles.statusNote}>
                    <Info size={15} />
                    <span>
                      Sau khi hoàn tất, yêu cầu ở trạng thái{' '}
                      <strong>chờ xác minh chứng từ</strong>. Mã vận tải <span className="mono">VIEXXXXXX</span>{' '}
                      được cấp tự động khi toàn bộ tài liệu bắt buộc đã được xác minh.
                    </span>
                  </div>
                </div>
              </>
            )}

            {submitError && (
              <p className="errorText" role="alert" style={{ marginBottom: 8 }}>
                {submitError}
              </p>
            )}

            <div className={styles.footer}>
              <button type="button" className="btn" onClick={goBack}>
                <ArrowLeft size={14} /> Quay lại
              </button>
              <div className={styles.footerActions}>
                {showReview ? (
                  <button
                    type="button"
                    className="btn btnPrimary"
                    disabled={submitting}
                    onClick={() => {
                      void completeBooking()
                    }}
                  >
                    {submitting ? 'Đang gửi…' : 'Complete booking'}
                    <ArrowRight size={15} />
                  </button>
                ) : (
                  <button type="button" className="btn btnPrimary" onClick={goNext}>
                    {stepIndex === STEPS.length - 1
                      ? 'Go summary'
                      : `Tiếp tục · ${STEPS[stepIndex + 1].label}`}
                    <ArrowRight size={15} />
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>

        <aside className={styles.summary}>
          <section className="card">
            <div className="sectionTitle">
              <h3>Chuyến đang đặt</h3>
              <span className="badge">mô phỏng</span>
            </div>
            <div className={styles.summaryBody}>
              <span className={styles.summaryLabel}>DỊCH VỤ</span>
              <span className={styles.summaryService}>{service.name}</span>
              <span className={styles.summaryRoute}>
                {quoteDraft.pickup.city} → {quoteDraft.delivery.city}
              </span>
              <span className={styles.summaryMeta}>
                {pieces} kiện · {formatVolume(volume)} ·{' '}
                {Math.round(weight).toLocaleString('vi-VN')} kg
              </span>
              <span className={styles.summaryMeta}>
                {addons.incoterm} · {service.transitDays[0]}–{service.transitDays[1]} ngày
              </span>
            </div>
            <div className={styles.priceList}>
              {priceLines.map((line) => (
                <div key={line.key} className={styles.priceRow}>
                  <span>{line.label}</span>
                  <strong className={!line.included ? styles.priceExcluded : undefined}>
                    {line.included ? formatMoney(line.amount, 'VND') : '—'}
                  </strong>
                </div>
              ))}
              <div className={styles.totalRow}>
                <span className={styles.totalLabel}>Tổng cộng</span>
                <span className={styles.totalValue}>{formatMoney(total, 'VND')}</span>
              </div>
            </div>
            <p className={styles.taxNote}>
              Giá chưa gồm thuế. Các khoản không chọn hiển thị “—”. Số liệu tính từ dữ liệu demo.
            </p>
          </section>

          <div className={styles.statusNote} style={{ marginTop: 12 }}>
            <ShieldCheck size={15} />
            <span>
              Đây là bản mockup cục bộ. Không có thanh toán, email hay booking thật nào được tạo.
            </span>
          </div>
        </aside>
      </div>
    </div>
  )
}
