import type { Address, QuoteDraft, ServiceOption } from '../types/domain'
import { addDays, dateLabel, nowIso } from '../utils/date'

const pickup: Address = {
  countryCode: 'VN',
  search: 'Lô C2, Khu công nghiệp Quế Võ',
  street: 'Lô C2, Khu công nghiệp Quế Võ',
  postalCode: '220000',
  city: 'Bắc Ninh',
  placeId: 'demo-vn-bacninh-1',
  lat: 21.1861,
  lng: 106.0763,
}

const delivery: Address = {
  countryCode: 'DE',
  search: 'Bei den St. Pauli-Landungsbrücken 1',
  street: 'Bei den St. Pauli-Landungsbrücken 1',
  postalCode: '20359',
  city: 'Hamburg',
  placeId: 'demo-de-hamburg-1',
  lat: 53.5461,
  lng: 9.9661,
}

export const PACKAGE_TYPES = [
  'Pallet tiêu chuẩn châu Âu 120 × 80 cm',
  'Pallet 120 × 100 cm',
  'Pallet 80 × 60 cm',
  'Bao',
  'Thùng carton',
  'Thùng phuy',
  'Thùng kiện',
  'Cuộn',
  'Bồn chứa IBC',
  'Thùng gỗ',
]

export const CONTAINERS = [
  { id: '20GP', name: '20GP / 20DC', payloadTon: 28.2, volumeM3: 33.2, suit: 'Hàng khô' },
  { id: '40GP', name: '40GP / 40DC', payloadTon: 28.8, volumeM3: 67.7, suit: 'Hàng khô' },
  { id: '40HC', name: '40HC · High Cube', payloadTon: 28.6, volumeM3: 76.3, suit: 'Hàng nhẹ/cồng kềnh' },
  { id: '45HC', name: '45HC · High Cube', payloadTon: 27.5, volumeM3: 86, suit: 'Hàng nhẹ/cồng kềnh' },
  { id: '20RF', name: '20RF · Reefer', payloadTon: 27.4, volumeM3: 28.3, suit: 'Hàng lạnh' },
  { id: '40RF', name: '40RF / 40HR · Reefer HC', payloadTon: 29, volumeM3: 67, suit: 'Hàng lạnh' },
  { id: '20OT', name: '20OT · Open Top', payloadTon: 28, volumeM3: 32, suit: 'Hàng quá khổ nóc' },
  { id: '40OT', name: '40OT · Open Top', payloadTon: 28, volumeM3: 66, suit: 'Hàng quá khổ nóc' },
  { id: '20FR', name: '20FR · Flat Rack', payloadTon: 31, volumeM3: 0, suit: 'Máy móc/quá khổ' },
  { id: '40FR', name: '40FR · Flat Rack', payloadTon: 39, volumeM3: 0, suit: 'Máy móc/quá khổ' },
  { id: 'FCL', name: 'FCL', payloadTon: 0, volumeM3: 0, suit: 'Hàng nguyên cont' },
  { id: 'LCL', name: 'LCL', payloadTon: 0, volumeM3: 0, suit: 'Hàng lẻ' },
  { id: 'BULK', name: 'Bulk / Breakbulk', payloadTon: 0, volumeM3: 0, suit: 'Hàng rời/dự án' },
]

export const SPECIAL_CARGO = [
  { id: 'temperature', label: 'Hàng cần kiểm soát nhiệt độ' },
  { id: 'dangerous', label: 'Hàng nguy hiểm (DG)' },
  { id: 'pharmaceutical', label: 'Dược phẩm, y tế' },
  { id: 'out-of-gauge', label: 'Hàng quá khổ (OOG)' },
  { id: 'heavy', label: 'Hàng nặng' },
  { id: 'high-value', label: 'Hàng giá trị cao' },
  { id: 'perishable', label: 'Hàng dễ hư hỏng' },
  { id: 'fragile', label: 'Hàng dễ vỡ' },
  { id: 'live-animals', label: 'Động vật sống' },
  { id: 'other', label: 'Yêu cầu đặc biệt khác' },
]

export const INCOTERMS = ['EXW', 'FCA', 'FAS', 'FOB', 'CFR', 'CIF', 'CPT', 'CIP', 'DAP', 'DPU', 'DDP']

export const DEMO_READY = addDays(nowIso(), 1)
export const DEMO_DEPARTURE = addDays(nowIso(), 6)

const departureDate = dateLabel(DEMO_DEPARTURE)

export const SERVICES: ServiceOption[] = [
  {
    id: 'sea-lcl',
    name: 'Đường biển LCL — hàng ghép',
    mode: 'ocean',
    modeLabel: 'Đường biển · LCL, ghép container',
    scope: 'Cảng đi → Cảng đến (CFS → CFS), gồm phí nâng hạ tại Hải Phòng.',
    customs: 'Thủ tục xuất khẩu đã bao gồm; thủ tục nhập khẩu tại EU bạn tự thực hiện.',
    transitDays: [34, 38],
    emissionsKg: 620,
    emissionsNote: 'CO₂e / 1.850 kg',
    priceVnd: 48_900_000,
    priceNote: 'Giá ví dụ, chưa gồm phụ phí cảng. THC Hamburg 145 USD trả tại cảng đến.',
    eligible: true,
    badges: [
      { label: 'Giá thấp nhất', tone: 'success' },
      { label: 'Cần khai IMDG', tone: 'warning' },
    ],
    conditions: [
      'Pin lithium nhóm 9 chỉ có bản khi khai IMDG.',
      'Phụ phí THC Hamburg 145 USD trả tại cảng đến.',
    ],
    exclusions: ['Chưa gồm phí cảng phát sinh tại điểm đến ngoài THC.'],
    departure: departureDate,
    arrival: dateLabel(addDays(DEMO_DEPARTURE, 36)),
  },
  {
    id: 'sea-fcl',
    name: 'Đường biển FCL — container 20’DC',
    mode: 'ocean',
    modeLabel: 'Đường biển · FCL, 1 × 20’DC',
    scope: 'Cảng đi → Cảng đến (CY → CY), không gồm phí nâng hạ tại Hamburg.',
    customs: 'Thủ tục xuất khẩu đã bao gồm; thủ tục nhập khẩu tại EU bạn tự thực hiện.',
    transitDays: [30, 34],
    emissionsKg: 480,
    emissionsNote: 'CO₂e / 1.850 kg',
    priceVnd: 76_400_000,
    priceNote: 'Giá cho container đầy đủ.',
    eligible: true,
    badges: [{ label: 'Đóng nguyên container', tone: 'accent' }],
    conditions: [
      '4,2 m³ chiếm khoảng 14% thể tích container 20’DC — bạn trả cho phần chưa dùng.',
    ],
    exclusions: ['Không gồm phí nâng hạ tại Hamburg.'],
    departure: departureDate,
    arrival: dateLabel(addDays(DEMO_DEPARTURE, 32)),
  },
  {
    id: 'rail',
    name: 'Đường sắt Trung Quốc – Châu Âu',
    mode: 'rail',
    modeLabel: 'Đường sắt · Ga → Ga, quá cảnh Trung Quốc',
    scope: 'Ga Hà Nội → Ga Hamburg, gồm trung chuyển tại Trịnh Châu.',
    customs: 'Quá cảnh Trung Quốc đã bao gồm; thủ tục nhập khẩu EU bạn tự thực hiện.',
    transitDays: [22, 26],
    emissionsKg: 410,
    emissionsNote: 'CO₂e / 1.850 kg',
    priceVnd: 63_200_000,
    priceNote: 'Giá ví dụ, chưa gồm lưu ga.',
    eligible: true,
    badges: [{ label: 'Phát thải thấp nhất', tone: 'success' }],
    conditions: [
      'Có thể lệch 3–5 ngày khi tắc biên.',
      'Cần bản khai hàng nguy hiểm nhóm 9 và chứng từ quá cảnh.',
    ],
    exclusions: ['Chưa gồm lưu ga.'],
    departure: departureDate,
    arrival: dateLabel(addDays(DEMO_DEPARTURE, 24)),
  },
  {
    id: 'air',
    name: 'Đường hàng không — bay tiết kiệm',
    mode: 'air',
    modeLabel: 'Đường hàng không · Sân bay → Sân bay',
    scope: 'Sân bay Nội Bài → Sân bay Hamburg, trung chuyển tại Frankfurt.',
    customs: 'Không bao gồm thủ tục xuất khẩu và nhập khẩu.',
    transitDays: [4, 6],
    emissionsKg: 3120,
    emissionsNote: 'CO₂e / 1.850 kg',
    priceVnd: 214_500_000,
    priceNote: 'Giá ví dụ theo cân nặng tính phí.',
    eligible: false,
    eligibilityNote:
      'Loại trừ: tuyến này không nhận pin lithium nhóm 9. Nếu vẫn cần gửi nhanh, hãy tách kiện chứa pin thành lô riêng hoặc dùng đường sắt.',
    badges: [{ label: 'Không nhận pin lithium nhóm 9', tone: 'danger' }],
    conditions: [],
    exclusions: ['Không nhận pin lithium nhóm 9.'],
    departure: departureDate,
    arrival: dateLabel(addDays(DEMO_DEPARTURE, 5)),
  },
]

export function serviceById(id: string): ServiceOption {
  return SERVICES.find((service) => service.id === id) ?? SERVICES[0]
}

export const INITIAL_QUOTE: QuoteDraft = {
  handoff: 'carrier-pickup',
  pickup,
  delivery,
  freightTerm: 'prepaid',
  cargoType: 'lcl',
  unitSystem: 'metric',
  lines: [
    {
      id: 'line-1',
      packageType: 'Thùng carton',
      quantity: 12,
      weightKg: 154,
      lengthCm: 120,
      widthCm: 80,
      heightCm: 36,
    },
  ],
  containerId: 'LCL',
  handling: 'special',
  specialTypes: ['dangerous'],
  customerType: 'business',
  companyName: 'An Phát Logistics',
  contactName: 'Nguyễn Thu Hà',
  email: 'ha.nguyen@anphatlog.vn',
  phone: '+84 912 448 703',
  marketingOptIn: true,
  termsAccepted: false,
}
