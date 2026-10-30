import { useEffect, useMemo, useState } from 'react'
import { MapPin } from 'lucide-react'
import styles from './AddressFields.module.css'
import type { Address } from '../types/domain'
import { COUNTRIES, suggestAddresses } from '../data/countries'

interface AddressFieldsProps {
  idPrefix: string
  address: Address
  onChange: (address: Address) => void
  errors?: Record<string, string>
  disabled?: boolean
}

export function AddressFields({
  idPrefix,
  address,
  onChange,
  errors = {},
  disabled = false,
}: AddressFieldsProps) {
  const [query, setQuery] = useState(address.search)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setQuery(address.search)
  }, [address.search])

  const [debounced, setDebounced] = useState(query)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  const suggestions = useMemo(
    () => (open ? suggestAddresses(address.countryCode, debounced) : []),
    [open, debounced, address.countryCode],
  )

  const update = (patch: Partial<Address>) => onChange({ ...address, ...patch })

  return (
    <div className={styles.grid}>
      <div className={`field ${styles.full}`}>
        <label className="label" htmlFor={`${idPrefix}-country`}>
          Quốc gia
        </label>
        <select
          id={`${idPrefix}-country`}
          className="select"
          value={address.countryCode}
          disabled={disabled}
          onChange={(event) => {
            update({ countryCode: event.target.value, placeId: undefined })
            setOpen(false)
          }}
        >
          {COUNTRIES.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
        {errors.country ? <span className="errorText">{errors.country}</span> : null}
      </div>

      <div className={`field ${styles.full} ${styles.searchWrap}`}>
        <label className="label" htmlFor={`${idPrefix}-search`}>
          Địa chỉ tìm kiếm
        </label>
        <div className={styles.searchRow}>
          <MapPin size={15} className={styles.pin} aria-hidden="true" />
          <input
            id={`${idPrefix}-search`}
            className="input"
            placeholder="Nhập từ 3 ký tự để xem gợi ý địa chỉ mẫu"
            value={query}
            disabled={disabled}
            autoComplete="off"
            onChange={(event) => {
              setQuery(event.target.value)
              update({ search: event.target.value })
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => window.setTimeout(() => setOpen(false), 160)}
            aria-expanded={open && suggestions.length > 0}
            aria-controls={`${idPrefix}-suggestions`}
            aria-describedby={`${idPrefix}-search-hint`}
          />
        </div>
        <span id={`${idPrefix}-search-hint`} className="hint">
          Gợi ý địa chỉ cục bộ dùng cho bản mockup — không gọi dịch vụ định vị thật.
        </span>
        {open && debounced.trim().length >= 3 && (
          <div
            className={styles.suggestions}
            id={`${idPrefix}-suggestions`}
            role="listbox"
            aria-label="Gợi ý địa chỉ"
          >
            {suggestions.length === 0 ? (
              <p className={styles.empty}>Không có gợi ý phù hợp. Bạn có thể nhập địa chỉ thủ công.</p>
            ) : (
              suggestions.map((item) => (
                <button
                  key={`${item.countryCode}-${item.street}`}
                  type="button"
                  role="option"
                  aria-selected={false}
                  className={styles.suggestion}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    update({
                      search: item.street,
                      street: item.street,
                      city: item.city,
                      postalCode: item.postalCode,
                      placeId: `${item.countryCode}-${item.postalCode}`,
                    })
                    setQuery(item.street)
                    setOpen(false)
                  }}
                >
                  <span className={styles.suggestionStreet}>{item.street}</span>
                  <span className={styles.suggestionMeta}>
                    {item.city} · {item.postalCode}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
        {errors.search ? <span className="errorText">{errors.search}</span> : null}
      </div>

      <div className={`field ${styles.full}`}>
        <label className="label" htmlFor={`${idPrefix}-street`}>
          Địa chỉ cụ thể
        </label>
        <input
          id={`${idPrefix}-street`}
          className="input"
          value={address.street}
          disabled={disabled}
          onChange={(event) => update({ street: event.target.value })}
          aria-invalid={Boolean(errors.street)}
        />
        {errors.street ? <span className="errorText">{errors.street}</span> : null}
      </div>

      <div className="field">
        <label className="label" htmlFor={`${idPrefix}-postal`}>
          Mã bưu chính
        </label>
        <input
          id={`${idPrefix}-postal`}
          className="input mono"
          value={address.postalCode}
          disabled={disabled}
          onChange={(event) => update({ postalCode: event.target.value })}
          aria-invalid={Boolean(errors.postalCode)}
        />
        {errors.postalCode ? <span className="errorText">{errors.postalCode}</span> : null}
      </div>

      <div className="field">
        <label className="label" htmlFor={`${idPrefix}-city`}>
          Thành phố
        </label>
        <input
          id={`${idPrefix}-city`}
          className="input"
          value={address.city}
          disabled={disabled}
          onChange={(event) => update({ city: event.target.value })}
          aria-invalid={Boolean(errors.city)}
        />
        {errors.city ? <span className="errorText">{errors.city}</span> : null}
      </div>
    </div>
  )
}
