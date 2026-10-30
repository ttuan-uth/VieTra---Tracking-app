import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  FileText,
  Info,
  ShieldCheck,
  TriangleAlert,
  UploadCloud,
  X,
} from 'lucide-react'
import styles from './DocumentPanel.module.css'
import type { Booking } from '../../types/domain'
import { serviceById } from '../../data/services'
import {
  documentForSlot,
  documentState,
  requiredDocumentSlots,
} from './documents'
import { formatFileSize } from '../../utils/format'
import { dateTimeLabel } from '../../utils/date'
import type { DocumentUpload } from '../../store/AppStore'
import { errorMessage } from '../../api/client'

interface DocumentPanelProps {
  booking: Booking
  canReview: boolean
  canUpload: boolean
  onClose: () => void
  onVerify: (documentId: string) => Promise<void> | void
  onRequestFix: (documentId: string, note: string) => Promise<void> | void
  onUpload: (upload: DocumentUpload) => Promise<void> | void
}

const MAX_FILE_BYTES = 10 * 1024 * 1024

export function DocumentPanel({
  booking,
  canReview,
  canUpload,
  onClose,
  onVerify,
  onRequestFix,
  onUpload,
}: DocumentPanelProps) {
  const service = serviceById(booking.serviceId)
  const slots = useMemo(
    () =>
      requiredDocumentSlots({
        mode: service.mode,
        specialTypes: booking.quote.specialTypes,
        cargoInsurance: booking.addons.cargoInsurance,
      }),
    [service.mode, booking.quote.specialTypes, booking.addons.cargoInsurance],
  )
  const state = useMemo(
    () => documentState(booking.documents, slots),
    [booking.documents, slots],
  )
  const panelRef = useRef<HTMLElement | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const closeRef = useRef(onClose)
  const [uploadSlot, setUploadSlot] = useState<string | null>(null)
  const [fixDocumentId, setFixDocumentId] = useState<string | null>(null)
  const [fixNote, setFixNote] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    closeRef.current = onClose
  }, [onClose])

  useEffect(() => {
    panelRef.current?.focus()
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeRef.current()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]',
        ),
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const openUpload = (slotId: string) => {
    setError('')
    setUploadSlot(slotId)
    fileRef.current?.click()
  }

  const handleFile = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file || !uploadSlot) return
    if (file.size > MAX_FILE_BYTES) {
      setError(`"${file.name}" vượt quá 10 MB nên chưa được thay.`)
      return
    }
    setBusy(true)
    setError('')
    try {
      await onUpload({ slotId: uploadSlot, name: file.name, sizeBytes: file.size })
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setBusy(false)
      setUploadSlot(null)
    }
  }

  const handleVerify = async (documentId: string) => {
    setBusy(true)
    setError('')
    try {
      await onVerify(documentId)
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  const submitFix = async (documentId: string) => {
    if (!fixNote.trim()) {
      setError('Nhập lý do cần bổ sung để người gửi biết phải sửa gì.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await onRequestFix(documentId, fixNote)
      setFixDocumentId(null)
      setFixNote('')
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  const locked = Boolean(booking.code)
  const progressLabel = booking.code
    ? `Đã cấp mã ${booking.code}`
    : state.ready
      ? 'Đủ điều kiện cấp mã'
      : state.needsFix.length > 0
        ? `${state.needsFix.length} tệp cần bổ sung`
        : `${state.pending} tệp chờ xác minh`

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-panel-title"
        tabIndex={-1}
      >
        <header className={styles.head}>
          <div>
            <p className={styles.eyebrow}>Hồ sơ chứng từ</p>
            <h2 id="document-panel-title">{booking.code ?? booking.id.toUpperCase()}</h2>
            <p className={styles.sub}>
              {service.name} · {booking.quote.pickup.city} → {booking.quote.delivery.city}
            </p>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Đóng hồ sơ chứng từ"
          >
            <X size={17} />
          </button>
        </header>

        <div className={styles.progressBand}>
          <div>
            <strong>
              {state.verified}/{state.required} tài liệu đã xác minh
            </strong>
            <span className={styles.progressMeta}>{progressLabel}</span>
          </div>
          <span
            className={
              booking.code || state.ready
                ? 'badge badgeSuccess'
                : state.needsFix.length > 0
                  ? 'badge badgeDanger'
                  : 'badge badgeWarning'
            }
          >
            {booking.code ? 'Đã cấp mã' : state.ready ? 'Sẵn sàng cấp mã' : 'Chưa đủ chứng từ'}
          </span>
        </div>

        <div className={styles.body}>
          <div className={styles.adminNote}>
            <ShieldCheck size={14} />
            <span>
              {canReview
                ? 'Admin xác minh chứng từ. Không duyệt/từ chối booking và không xác nhận bàn giao.'
                : 'Chứng từ được admin xác minh. Bạn có thể thay tệp khi có yêu cầu bổ sung; mã vận tải được cấp tự động khi đủ tài liệu.'}
            </span>
          </div>

          {slots.map((slot) => {
            const document = documentForSlot(booking.documents, slot.id)
            const fixing = fixDocumentId === document?.id
            return (
              <article
                key={slot.id}
                className={`${styles.doc} ${
                  document?.status === 'verified'
                    ? styles.docVerified
                    : document?.status === 'needs-fix'
                      ? styles.docNeedsFix
                      : ''
                }`}
              >
                <div className={styles.docHead}>
                  <div className={styles.docTitle}>
                    <FileText size={15} />
                    <span>{slot.label}</span>
                    {slot.required && <span className="badge">Bắt buộc</span>}
                  </div>
                  {document ? (
                    <span
                      className={
                        document.status === 'verified'
                          ? 'badge badgeSuccess'
                          : document.status === 'needs-fix'
                            ? 'badge badgeDanger'
                            : 'badge badgeWarning'
                      }
                    >
                      {document.status === 'verified'
                        ? 'Đã xác minh'
                        : document.status === 'needs-fix'
                          ? 'Cần bổ sung'
                          : 'Chờ xác minh'}
                    </span>
                  ) : (
                    <span className="badge">Chưa tải</span>
                  )}
                </div>

                <p className={styles.docHint}>{slot.hint}</p>

                {document ? (
                  <div className={styles.fileRow}>
                    <span className={styles.fileName}>{document.name}</span>
                    <span className={styles.fileMeta}>
                      {formatFileSize(document.sizeBytes)} · tải lên{' '}
                      {dateTimeLabel(document.uploadedAt)}
                    </span>
                    {document.verifiedAt && (
                      <span className={styles.fileMeta}>
                        xác minh {dateTimeLabel(document.verifiedAt)}
                      </span>
                    )}
                  </div>
                ) : (
                  <p className={styles.missingText}>
                    <TriangleAlert size={13} /> Chưa có tệp cho mục này.
                  </p>
                )}

                {document?.note && (
                  <p className={styles.fixNote}>
                    <strong>Yêu cầu bổ sung:</strong> {document.note}
                  </p>
                )}

                {!locked && (canReview || canUpload) && (
                  <div className={styles.actions}>
                    {canReview && document && document.status === 'pending' && (
                      <button
                        type="button"
                        className="btn btnSm btnPrimary"
                        disabled={busy}
                        onClick={() => {
                          void handleVerify(document.id)
                        }}
                        aria-label={`Xác minh ${slot.label}`}
                      >
                        <Check size={13} /> Xác minh
                      </button>
                    )}
                    {canReview && document && document.status !== 'needs-fix' && !fixing && (
                      <button
                        type="button"
                        className="btn btnSm"
                        disabled={busy}
                        onClick={() => {
                          setFixDocumentId(document.id)
                          setFixNote('')
                        }}
                      >
                        Cần bổ sung
                      </button>
                    )}
                    {canUpload && (!document || document.status !== 'pending') && !fixing && (
                      <button
                        type="button"
                        className="btn btnSm"
                        disabled={busy}
                        onClick={() => openUpload(slot.id)}
                      >
                        <UploadCloud size={13} /> {document ? 'Thay tệp' : 'Tải tệp'}
                      </button>
                    )}
                  </div>
                )}

                {fixing && (
                  <div className={styles.fixForm}>
                    <label className="label" htmlFor={`fix-${slot.id}`}>
                      Lý do cần bổ sung (hiển thị cho người gửi)
                    </label>
                    <textarea
                      id={`fix-${slot.id}`}
                      className="textarea"
                      value={fixNote}
                      onChange={(event) => setFixNote(event.target.value)}
                      placeholder="Ví dụ: Thiếu trang 4 mô tả phân loại UN3481."
                    />
                    <div className={styles.fixActions}>
                      <button
                        type="button"
                        className="btn btnSm btnPrimary"
                        disabled={busy}
                        onClick={() => {
                          if (document) void submitFix(document.id)
                        }}
                      >
                        Gửi yêu cầu bổ sung
                      </button>
                      <button
                        type="button"
                        className="btn btnSm"
                        onClick={() => {
                          setFixDocumentId(null)
                          setFixNote('')
                        }}
                      >
                        Huỷ
                      </button>
                    </div>
                  </div>
                )}

                {document?.verifiedAt && !fixing && (
                  <p className={styles.lockedHint}>
                    <Check size={12} /> Đã xác minh {dateTimeLabel(document.verifiedAt)}
                  </p>
                )}
              </article>
            )
          })}

          {error && <p className="errorText">{error}</p>}
        </div>

        <footer className={styles.footer}>
          <Info size={14} />
          <p>
            {booking.code
              ? `Đã cấp mã ${booking.code}. Hồ sơ chứng từ được khoá sau khi cấp mã.`
              : state.ready
                ? 'Toàn bộ chứng từ bắt buộc đã xác minh. Mã vận tải được cấp tự động.'
                : 'Mã vận tải chỉ được cấp khi mọi tài liệu bắt buộc ở trạng thái Đã xác minh.'}
          </p>
        </footer>

        <input
          ref={fileRef}
          type="file"
          tabIndex={-1}
          className="srOnly"
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
          onChange={(event) => {
            void handleFile(event.target.files)
            event.target.value = ''
          }}
        />
      </section>
    </div>
  )
}
