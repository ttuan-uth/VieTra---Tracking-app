import { useEffect, useRef, useState } from 'react'
import { FileText, Info, Plus, Radar, ShieldCheck } from 'lucide-react'
import styles from './BookingsPage.module.css'
import { useAppStore } from '../../store/AppStore'
import { useAuth } from '../../store/AuthStore'
import { serviceById } from '../../data/services'
import { dateLabel } from '../../utils/date'
import { countryName } from '../../data/countries'
import type { Booking } from '../../types/domain'
import { documentState, requiredDocumentSlots } from './documents'
import { DocumentPanel } from './DocumentPanel'

interface BookingsPageProps {
  highlightId?: string | null
  focusBookingId?: string | null
  onFocusHandled?: () => void
  onTrack: (code: string) => void
  onNewBooking: () => void
}

const STATUS_LABEL: Record<Booking['status'], { label: string; tone: string }> = {
  'awaiting-documents': { label: 'Chờ xác minh chứng từ', tone: 'badgeWarning' },
  'needs-docs': { label: 'Cần bổ sung chứng từ', tone: 'badgeDanger' },
  confirmed: { label: 'Đã cấp mã vận tải', tone: 'badgeSuccess' },
}

export function BookingsPage({
  highlightId,
  focusBookingId,
  onFocusHandled,
  onTrack,
  onNewBooking,
}: BookingsPageProps) {
  const {
    bookings,
    verifyDocument,
    requestDocumentFix,
    attachDocument,
    resetDemo,
  } = useAppStore()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [panelBookingId, setPanelBookingId] = useState<string | null>(null)
  const panelTriggerRef = useRef<HTMLButtonElement | null>(null)

  const openPanel = (bookingId: string, trigger: HTMLButtonElement) => {
    panelTriggerRef.current = trigger
    setPanelBookingId(bookingId)
  }

  const closePanel = () => {
    setPanelBookingId(null)
    window.setTimeout(() => panelTriggerRef.current?.focus(), 0)
  }

  useEffect(() => {
    if (!focusBookingId) return
    panelTriggerRef.current = null
    setPanelBookingId(focusBookingId)
    onFocusHandled?.()
  }, [focusBookingId, onFocusHandled])

  const enriched = bookings.map((booking) => {
    const service = serviceById(booking.serviceId)
    const slots = requiredDocumentSlots({
      mode: service.mode,
      specialTypes: booking.quote.specialTypes,
      cargoInsurance: booking.addons.cargoInsurance,
    })
    return { booking, service, state: documentState(booking.documents, slots) }
  })

  const awaiting = bookings.filter((booking) => booking.status === 'awaiting-documents').length
  const needsDocs = bookings.filter((booking) => booking.status === 'needs-docs').length
  const confirmed = bookings.filter((booking) => booking.status === 'confirmed').length

  const panelBooking = bookings.find((booking) => booking.id === panelBookingId) ?? null
  const highlighted = enriched.find((item) => item.booking.id === highlightId)

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <h1>Đơn đặt chỗ</h1>
          <p className={styles.lede}>
            Theo dõi tiến độ xác minh chứng từ và mã vận tải. Mã chỉ được cấp khi mọi tài liệu bắt
            buộc đã được xác minh.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isAdmin && (
            <button
              type="button"
              className="btn btnSm"
              onClick={() => {
                void resetDemo()
              }}
            >
              Đặt lại dữ liệu mô phỏng
            </button>
          )}
          <button type="button" className="btn btnPrimary" onClick={onNewBooking}>
            <Plus size={14} /> Tạo yêu cầu mới
          </button>
        </div>
      </div>

      {highlighted && (
        <section className={styles.banner} aria-live="polite">
          <ShieldCheck size={17} />
          <div className={styles.bannerText}>
            <strong>
              {highlighted.booking.status === 'confirmed'
                ? `Đã cấp mã ${highlighted.booking.code}`
                : 'Yêu cầu đã được gửi — đang chờ xác minh chứng từ'}
            </strong>
            <p>
              {highlighted.state.verified}/{highlighted.state.required} tài liệu đã xác minh
              {highlighted.booking.status === 'confirmed'
                ? ' · mở trang Theo dõi để xem lô hàng.'
                : ' · mã vận tải được cấp tự động khi đủ tài liệu bắt buộc.'}
            </p>
          </div>
          <div className={styles.bannerActions}>
            <button
              type="button"
              className="btn btnSm"
              onClick={(event) => openPanel(highlighted.booking.id, event.currentTarget)}
            >
              <FileText size={13} /> Mở hồ sơ chứng từ
            </button>
            {highlighted.booking.code && (
              <button
                type="button"
                className="btn btnSm btnPrimary"
                onClick={() => onTrack(highlighted.booking.code as string)}
              >
                Theo dõi
              </button>
            )}
          </div>
        </section>
      )}

      <div className={styles.notice}>
        <Info size={15} />
        <span>
          {isAdmin ? (
            <>
              Admin <strong>chỉ xác minh chứng từ</strong> và xem toàn bộ đơn. Không có
              duyệt/từ chối booking hay xác nhận bàn giao thủ công. Mã{' '}
              <span className="mono">VIEXXXXXX</span> được cấp tự động khi đủ tài liệu.
            </>
          ) : (
            <>
              Bạn chỉ thấy đơn của mình. Admin xác minh chứng từ; mã{' '}
              <span className="mono">VIEXXXXXX</span> được cấp tự động khi mọi tài liệu bắt
              buộc đã xác minh.
            </>
          )}
        </span>
      </div>

      <section className={`card ${styles.tableCard}`}>
        <div className={styles.summaryBar}>
          <span>
            Tổng yêu cầu: <strong>{bookings.length}</strong>
          </span>
          <span>
            Chờ xác minh: <strong>{awaiting}</strong>
          </span>
          <span>
            Cần bổ sung: <strong>{needsDocs}</strong>
          </span>
          <span>
            Đã cấp mã: <strong>{confirmed}</strong>
          </span>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Mã / tham chiếu</th>
                {isAdmin && <th scope="col">Khách hàng</th>}
                <th scope="col">Dịch vụ</th>
                <th scope="col">Chứng từ</th>
                <th scope="col">Ngày tạo</th>
                <th scope="col">Trạng thái</th>
                <th scope="col" style={{ textAlign: 'right' }}>
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className={styles.emptyCell}>
                    Chưa có yêu cầu đặt chỗ nào.
                  </td>
                </tr>
              )}
              {enriched.map(({ booking, service, state }) => {
                const status = STATUS_LABEL[booking.status]
                const isHighlight = booking.id === highlightId
                const missing = state.missing.length + state.needsFix.length
                const progress = state.required
                  ? Math.round((state.verified / state.required) * 100)
                  : 0
                return (
                  <tr key={booking.id} className={isHighlight ? styles.highlight : undefined}>
                    <td>
                      <span className={`${styles.code} ${!booking.code ? styles.codePending : ''}`}>
                        {booking.code ?? 'Chưa cấp mã'}
                      </span>
                      <div className={styles.hintRow}>
                        {booking.code
                          ? 'Sẵn sàng theo dõi'
                          : isHighlight
                            ? 'Yêu cầu vừa hoàn tất trong phiên này'
                            : 'Cấp sau khi đủ chứng từ'}
                      </div>
                    </td>
                    {isAdmin && (
                      <td>
                        <div className={styles.serviceCell}>
                          <span className={styles.serviceName}>
                            {booking.contact.companyName || booking.contact.fullName}
                          </span>
                          <span className={styles.route}>{booking.contact.fullName}</span>
                        </div>
                      </td>
                    )}
                    <td>
                      <div className={styles.serviceCell}>
                        <span className={styles.serviceName}>{service.name}</span>
                        <span className={styles.route}>
                          {booking.quote.pickup.city} → {booking.quote.delivery.city} ·{' '}
                          {countryName(booking.quote.pickup.countryCode)} →{' '}
                          {countryName(booking.quote.delivery.countryCode)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className={styles.docProgress}>
                        <span className={styles.docCount}>
                          {state.verified}/{state.required} đã xác minh
                        </span>
                        <span className={styles.docBar} aria-hidden="true">
                          <span className={styles.docBarFill} style={{ width: `${progress}%` }} />
                        </span>
                        <span className={styles.docMeta}>
                          {missing > 0
                            ? `${missing} mục cần xử lý`
                            : state.pending > 0
                              ? `${state.pending} tệp chờ xác minh`
                              : 'Đủ chứng từ'}
                        </span>
                      </div>
                    </td>
                    <td className="mono">{dateLabel(booking.createdAt)}</td>
                    <td className={styles.statusCell}>
                      <span className={`badge ${status.tone}`}>{status.label}</span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={`btn btnSm ${booking.status === 'needs-docs' ? 'btnAccent' : ''}`}
                          onClick={(event) => openPanel(booking.id, event.currentTarget)}
                        >
                          <FileText size={13} />
                          {booking.status === 'needs-docs'
                            ? 'Bổ sung chứng từ'
                            : booking.status === 'confirmed'
                              ? 'Chứng từ'
                              : 'Xác minh chứng từ'}
                        </button>
                        {booking.status === 'confirmed' && booking.code && (
                          <button
                            type="button"
                            className="btn btnSm"
                            onClick={() => onTrack(booking.code as string)}
                          >
                            <Radar size={14} /> Theo dõi
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {panelBooking && (
        <DocumentPanel
          booking={panelBooking}
          canReview={isAdmin}
          canUpload={!isAdmin}
          onClose={closePanel}
          onVerify={(documentId) => verifyDocument(panelBooking.id, documentId)}
          onRequestFix={(documentId, note) =>
            requestDocumentFix(panelBooking.id, documentId, note)
          }
          onUpload={(upload) => attachDocument(panelBooking.id, upload)}
        />
      )}
    </div>
  )
}
