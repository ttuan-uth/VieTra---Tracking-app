const ISO_CODES = [
  'AD', 'AE', 'AF', 'AG', 'AL', 'AM', 'AO', 'AR', 'AT', 'AU', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF',
  'BG', 'BH', 'BI', 'BJ', 'BN', 'BO', 'BR', 'BS', 'BT', 'BW', 'BY', 'BZ', 'CA', 'CD', 'CF', 'CG',
  'CH', 'CI', 'CL', 'CM', 'CN', 'CO', 'CR', 'CU', 'CV', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM', 'DO',
  'DZ', 'EC', 'EE', 'EG', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK', 'FM', 'FR', 'GA', 'GB', 'GD', 'GE',
  'GH', 'GI', 'GL', 'GM', 'GN', 'GQ', 'GR', 'GT', 'GW', 'GY', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE',
  'IL', 'IN', 'IQ', 'IR', 'IS', 'IT', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN', 'KP',
  'KR', 'KW', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU', 'LV', 'LY', 'MA', 'MC',
  'MD', 'ME', 'MG', 'MH', 'MK', 'ML', 'MM', 'MN', 'MR', 'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ',
  'NA', 'NE', 'NG', 'NI', 'NL', 'NO', 'NP', 'NR', 'NZ', 'OM', 'PA', 'PE', 'PG', 'PH', 'PK', 'PL',
  'PT', 'PW', 'PY', 'QA', 'RO', 'RS', 'RU', 'RW', 'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SI', 'SK',
  'SL', 'SM', 'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SY', 'SZ', 'TD', 'TG', 'TH', 'TJ', 'TL', 'TM',
  'TN', 'TO', 'TR', 'TT', 'TV', 'TW', 'TZ', 'UA', 'UG', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VN',
  'VU', 'WS', 'YE', 'ZA', 'ZM', 'ZW',
]

const displayNames = new Intl.DisplayNames(['vi'], { type: 'region' })

export interface CountryOption {
  code: string
  name: string
}

export const COUNTRIES: CountryOption[] = ISO_CODES.map((code) => ({
  code,
  name: displayNames.of(code) ?? code,
})).sort((a, b) => a.name.localeCompare(b.name, 'vi'))

export function countryName(code: string): string {
  if (!code) return ''
  return displayNames.of(code) ?? code
}

/** Local demo address suggestions — no network, no API key. */
const SUGGESTION_SEED: Record<string, Array<{ street: string; city: string; postalCode: string }>> = {
  VN: [
    { street: 'Lô C2, Khu công nghiệp Quế Võ', city: 'Bắc Ninh', postalCode: '220000' },
    { street: 'Số 8 Tràng Tiền, Hoàn Kiếm', city: 'Hà Nội', postalCode: '100000' },
    { street: 'Đường Lạch Tray, Ngô Quyền', city: 'Hải Phòng', postalCode: '180000' },
    { street: 'Khu công nghiệp Tân Bình, Tân Phú', city: 'Hồ Chí Minh', postalCode: '700000' },
    { street: 'Số 12 Nguyễn Văn Linh, Hải Châu', city: 'Đà Nẵng', postalCode: '550000' },
  ],
  DE: [
    { street: 'Bei den St. Pauli-Landungsbrücken 1', city: 'Hamburg', postalCode: '20359' },
    { street: 'Hafenstraße 24', city: 'Hamburg', postalCode: '20359' },
    { street: 'Industriestraße 12, Billbrook', city: 'Hamburg', postalCode: '22113' },
    { street: 'Mainzer Landstraße 40', city: 'Frankfurt am Main', postalCode: '60325' },
  ],
  CN: [
    { street: 'Yiwu International Trade City, Chouzhou Rd', city: 'Yiwu', postalCode: '322000' },
    { street: 'No. 8 Zhengzhou East Station', city: 'Zhengzhou', postalCode: '450000' },
  ],
  SG: [{ street: '1 Harbour Front Avenue, Keppel Bay', city: 'Singapore', postalCode: '098632' }],
  NL: [{ street: 'Erasmusweg 1, Europoort', city: 'Rotterdam', postalCode: '3198' }],
  US: [
    { street: '1 World Trade Center, Lower Manhattan', city: 'New York', postalCode: '10007' },
    { street: 'Pier J, Port of Long Beach', city: 'Long Beach', postalCode: '90802' },
  ],
}

export function suggestAddresses(countryCode: string, query: string) {
  const base = SUGGESTION_SEED[countryCode] ?? SUGGESTION_SEED.DE
  const normalized = query.trim().toLowerCase()
  if (normalized.length < 3) return []
  return base
    .filter(
      (item) =>
        item.street.toLowerCase().includes(normalized) ||
        item.city.toLowerCase().includes(normalized) ||
        countryName(countryCode).toLowerCase().includes(normalized),
    )
    .slice(0, 5)
    .map((item) => ({ ...item, countryCode }))
}
