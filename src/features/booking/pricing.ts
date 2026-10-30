import type { ServiceAddons, ServiceOption } from '../../types/domain'

const FX: Record<ServiceAddons['insuredCurrency'], number> = {
  VND: 1,
  USD: 25_500,
  EUR: 27_200,
}

export interface PriceLine {
  key: string
  label: string
  detail?: string
  amount: number
  included: boolean
}

export const CUSTOMS_EXPORT_FEE = 1_200_000
export const CUSTOMS_IMPORT_FEE = 1_800_000
export const CUSTOMS_LINE_FEE = 150_000
export const INSURANCE_RATE = 0.0035
export const SUSTAINABILITY_FUEL_RATE = 0.015
export const SUSTAINABILITY_OFFSET_RATE = 0.008

export function insuranceFee(addons: ServiceAddons): number {
  if (!addons.cargoInsurance || addons.insuredValue <= 0) return 0
  const vnd = addons.insuredValue * FX[addons.insuredCurrency]
  return Math.round(vnd * INSURANCE_RATE)
}

export function customsFee(addons: ServiceAddons): number {
  if (!addons.exportCustoms && !addons.importCustoms) return 0
  let fee = 0
  if (addons.exportCustoms) fee += CUSTOMS_EXPORT_FEE
  if (addons.importCustoms) fee += CUSTOMS_IMPORT_FEE
  return fee + Math.max(0, addons.declarationLines) * CUSTOMS_LINE_FEE
}

export function sustainabilityFee(service: ServiceOption, addons: ServiceAddons): number {
  if (addons.sustainability === 'fuel') {
    return Math.round(service.priceVnd * SUSTAINABILITY_FUEL_RATE)
  }
  if (addons.sustainability === 'offset') {
    return Math.round(service.priceVnd * SUSTAINABILITY_OFFSET_RATE)
  }
  return 0
}

export function bookingPriceLines(service: ServiceOption, addons: ServiceAddons): PriceLine[] {
  const customs = customsFee(addons)
  const insurance = insuranceFee(addons)
  const sustainability = sustainabilityFee(service, addons)

  return [
    {
      key: 'freight',
      label: 'Cước vận chuyển',
      detail: `${service.name} · ${service.modeLabel}`,
      amount: service.priceVnd,
      included: true,
    },
    {
      key: 'customs',
      label: 'Phí thông quan',
      detail:
        customs > 0
          ? `${addons.exportCustoms ? 'Xuất khẩu' : ''}${
              addons.exportCustoms && addons.importCustoms ? ' + ' : ''
            }${addons.importCustoms ? 'Nhập khẩu' : ''} · ${addons.declarationLines} dòng khai báo`
          : 'Không sử dụng',
      amount: customs,
      included: customs > 0,
    },
    {
      key: 'insurance',
      label: 'Phí bảo hiểm hàng hoá',
      detail:
        insurance > 0
          ? `${addons.insuredValue.toLocaleString('vi-VN')} ${addons.insuredCurrency} · tỉ lệ minh hoạ 0,35%`
          : 'Không sử dụng',
      amount: insurance,
      included: insurance > 0,
    },
    {
      key: 'sustainability',
      label: 'Phí dịch vụ bền vững',
      detail:
        sustainability > 0
          ? addons.sustainability === 'fuel'
            ? 'Nhiên liệu bền vững · 1,5% cước'
            : 'Bù đắp carbon · 0,8% cước'
          : 'Không sử dụng',
      amount: sustainability,
      included: sustainability > 0,
    },
  ]
}

export function bookingTotal(service: ServiceOption, addons: ServiceAddons): number {
  return bookingPriceLines(service, addons).reduce(
    (sum, line) => sum + (line.included ? line.amount : 0),
    0,
  )
}
