import type {
  Booking,
  DemoDocument,
  DocumentStatus,
  QuoteDraft,
  Shipment,
  UserNotification,
} from '../types/domain'
import { addDays, addHours, nowIso } from '../utils/date'
import { buildShipment } from './routes'
import { INITIAL_QUOTE } from './services'
import type { Scenario } from '../sim/types'

const anchor = nowIso()

function seedQuote(overrides: Partial<QuoteDraft> = {}): QuoteDraft {
  return {
    ...structuredClone(INITIAL_QUOTE),
    termsAccepted: true,
    ...overrides,
  }
}

function seedDocument(
  slotId: string,
  name: string,
  sizeBytes: number,
  status: DocumentStatus = 'verified',
  note?: string,
): DemoDocument {
  return {
    id: `doc-${slotId}`,
    slotId,
    name,
    sizeBytes,
    status,
    note,
    uploadedAt: addDays(anchor, -1),
    verifiedAt: status === 'verified' ? addDays(anchor, -1) : undefined,
  }
}

function seedBooking(overrides: Partial<Booking> & Pick<Booking, 'id'>): Booking {
  const base: Booking = {
    id: overrides.id,
    status: 'confirmed',
    createdAt: addDays(anchor, -16),
    quote: seedQuote(),
    contact: {
      customerType: 'business',
      companyName: 'An Phát Logistics',
      fullName: 'Nguyễn Thu Hà',
      email: 'ha.nguyen@anphatlog.vn',
      phone: '+84 912 448 703',
      marketingOptIn: true,
      termsAccepted: true,
    },
    serviceId: 'sea-lcl',
    addons: {
      exportCustoms: true,
      importCustoms: false,
      declarationLines: 2,
      cargoInsurance: true,
      insuredValue: 48_000,
      insuredCurrency: 'USD',
      sustainability: 'fuel',
      incoterm: 'CIF',
    },
    route: {
      shipperSameAsPickup: true,
      consigneeSameAsDelivery: true,
      shipperAddress: structuredClone(INITIAL_QUOTE.pickup),
      consigneeAddress: structuredClone(INITIAL_QUOTE.delivery),
      pickupDate: addDays(anchor, -14),
    },
    billing: {
      companyName: 'An Phát Logistics',
      reference: 'PO-2026-118',
      invoiceEmail: 'invoice@anphatlog.vn',
      taxId: '0109876543',
      addressMode: 'shipper',
      billingCompanyName: '',
      billingStreet: '',
      billingCity: '',
      billingState: '',
      billingPostalCode: '',
      billingCountry: 'VN',
      recipients: ['procurement@anphatlog.vn'],
      shareConfirmed: true,
    },
    documents: [
      seedDocument('invoice', 'Hoa-don-thuong-mai.pdf', 311_000),
      seedDocument('packing', 'Packing-list.pdf', 268_000),
      seedDocument('transport', 'BL-draft.pdf', 1_180_000),
      seedDocument('msds', 'MSDS-pin-lithium.pdf', 842_000),
      seedDocument('dg-declaration', 'Khai-bao-hang-nguy-hiem.pdf', 410_000),
      seedDocument('insurance', 'Chung-nhan-bao-hiem.pdf', 196_000),
    ],
  }
  return { ...base, ...overrides }
}

export interface SeedState {
  bookings: Booking[]
  shipments: Shipment[]
  scenarios: Scenario[]
  notifications: UserNotification[]
}

export function createSeedState(): SeedState {
  const oceanStart = addDays(anchor, -14)
  const oceanShipment = buildShipment({
    id: 'shp-ocean-1',
    code: 'VIE7K2M4A',
    customer: 'An Phát Logistics',
    serviceName: 'Đường biển LCL — hàng ghép',
    mode: 'ocean',
    handoff: 'carrier-pickup',
    startAt: oceanStart,
    handoverAt: addHours(oceanStart, -3),
    handoverConfirmedAt: addHours(oceanStart, -3),
    status: 'in-transit',
    cargoSummary: '12 kiện · 4,2 m³ · 1.850 kg',
    specialCargo: ['Pin lithium UN3481 — nhóm 9'],
    vehicleName: 'Xe tải 8T — đội Miền Bắc',
    vehiclePlate: '15C-228.14',
  })

  const airStart = addDays(anchor, -7)
  const airShipment = buildShipment({
    id: 'shp-air-1',
    code: 'VIE5R8T1C',
    customer: 'An Phát Logistics',
    serviceName: 'Đường hàng không — bay tiết kiệm',
    mode: 'air',
    handoff: 'deliver-to-warehouse',
    startAt: airStart,
    handoverAt: addHours(airStart, -8),
    handoverConfirmedAt: addHours(airStart, -8),
    status: 'delivered',
    cargoSummary: '6 kiện · 1,1 m³ · 410 kg',
    specialCargo: [],
    vehicleName: 'Xe tải 5T — đội Hà Nội',
    vehiclePlate: '29C-664.03',
  })

  const awaitingStart = addHours(anchor, 22)
  const awaitingShipment = buildShipment({
    id: 'shp-ocean-2',
    code: 'VIE3N6B9D',
    customer: 'An Phát Logistics',
    serviceName: 'Đường biển FCL — container 20’DC',
    mode: 'ocean',
    handoff: 'deliver-to-warehouse',
    startAt: awaitingStart,
    handoverAt: addHours(anchor, 6),
    handoverConfirmedAt: null,
    status: 'awaiting-handover',
    cargoSummary: '1 container 20’DC · 4,2 m³ · 1.850 kg',
    specialCargo: ['Pin lithium UN3481 — nhóm 9'],
    vehicleName: 'Xe tải 8T — đội Miền Bắc',
    vehiclePlate: '15C-228.14',
  })

  const bookings: Booking[] = [
    seedBooking({
      id: 'bk-1',
      code: 'VIE7K2M4A',
      shipmentId: oceanShipment.id,
      createdAt: addDays(anchor, -16),
      serviceId: 'sea-lcl',
      route: {
        shipperSameAsPickup: true,
        consigneeSameAsDelivery: true,
        shipperAddress: structuredClone(INITIAL_QUOTE.pickup),
        consigneeAddress: structuredClone(INITIAL_QUOTE.delivery),
        pickupDate: oceanStart,
      },
    }),
    seedBooking({
      id: 'bk-2',
      code: 'VIE5R8T1C',
      shipmentId: airShipment.id,
      createdAt: addDays(anchor, -9),
      serviceId: 'air',
      quote: seedQuote({ handoff: 'deliver-to-warehouse', handling: 'general', specialTypes: [] }),
      documents: [
        seedDocument('invoice', 'Hoa-don-thuong-mai-air.pdf', 288_000),
        seedDocument('packing', 'Packing-list-air.pdf', 174_000),
        seedDocument('transport', 'AWB-738-2211.pdf', 540_000),
        seedDocument('insurance', 'Chung-nhan-bao-hiem-air.pdf', 202_000),
      ],
      route: {
        shipperSameAsPickup: true,
        consigneeSameAsDelivery: true,
        shipperAddress: structuredClone(INITIAL_QUOTE.pickup),
        consigneeAddress: structuredClone(INITIAL_QUOTE.delivery),
        pickupDate: airStart,
      },
    }),
    seedBooking({
      id: 'bk-3',
      code: 'VIE3N6B9D',
      shipmentId: awaitingShipment.id,
      createdAt: addDays(anchor, -3),
      serviceId: 'sea-fcl',
      quote: seedQuote({ handoff: 'deliver-to-warehouse', cargoType: 'fcl', containerId: '20GP' }),
      route: {
        shipperSameAsPickup: true,
        consigneeSameAsDelivery: true,
        shipperAddress: structuredClone(INITIAL_QUOTE.pickup),
        consigneeAddress: structuredClone(INITIAL_QUOTE.delivery),
        pickupDate: awaitingStart,
      },
    }),
    seedBooking({
      id: 'bk-4',
      status: 'needs-docs',
      createdAt: addHours(anchor, -2),
      serviceId: 'rail',
      quote: seedQuote({ handoff: 'carrier-pickup' }),
      documents: [
        seedDocument('invoice', 'Hoa-don-thuong-mai-rail.pdf', 301_000),
        seedDocument('packing', 'Packing-list-rail.pdf', 212_000, 'pending'),
        seedDocument('transport', 'SMGS-draft.pdf', 780_000, 'pending'),
        seedDocument(
          'msds',
          'MSDS-pin-lithium.pdf',
          842_000,
          'needs-fix',
          'Thiếu trang 4 mô tả phân loại UN3481 — cần bản MSDS đầy đủ.',
        ),
      ],
      route: {
        shipperSameAsPickup: true,
        consigneeSameAsDelivery: true,
        shipperAddress: structuredClone(INITIAL_QUOTE.pickup),
        consigneeAddress: structuredClone(INITIAL_QUOTE.delivery),
        pickupDate: addDays(anchor, 6),
      },
    }),
  ]

  const scenarios: Scenario[] = [
    {
      id: 'sc-1',
      shipmentId: oceanShipment.id,
      legId: `${oceanShipment.id}-leg-1`,
      mode: 'road',
      type: 'congestion',
      label: 'Ùn tắc giờ cao điểm tại Hải Phòng',
      severity: 'medium',
      startAt: addHours(oceanStart, 1),
      endAt: addHours(oceanStart, 4),
      speedFactor: 0.45,
      extraWaitHours: 0,
      detourKm: 0,
      center: { lat: 20.95, lng: 106.55 },
      radiusKm: 22,
      active: true,
      createdAt: addDays(anchor, -17),
    },
    {
      id: 'sc-2',
      shipmentId: oceanShipment.id,
      legId: `${oceanShipment.id}-leg-3`,
      mode: 'ocean',
      type: 'storm',
      label: 'Bão gần Biển Đỏ — giảm tốc 40%',
      severity: 'high',
      startAt: addHours(anchor, -24),
      endAt: addHours(anchor, 168),
      speedFactor: 0.6,
      extraWaitHours: 0,
      detourKm: 0,
      center: { lat: 23, lng: 39 },
      radiusKm: 2600,
      active: true,
      createdAt: addHours(anchor, -40),
    },
    {
      id: 'sc-3',
      shipmentId: oceanShipment.id,
      legId: `${oceanShipment.id}-leg-3`,
      mode: 'ocean',
      type: 'port-congestion',
      label: 'Ùn cảng Hamburg — chờ cập cảng',
      severity: 'medium',
      startAt: addHours(anchor, 456),
      endAt: addHours(anchor, 500),
      speedFactor: 0.75,
      extraWaitHours: 18,
      detourKm: 0,
      center: { lat: 53.5461, lng: 9.9661 },
      radiusKm: 120,
      active: true,
      createdAt: addHours(anchor, -20),
    },
    {
      id: 'sc-4',
      shipmentId: oceanShipment.id,
      legId: `${oceanShipment.id}-leg-4`,
      mode: 'road',
      type: 'reroute',
      label: 'Đóng đường A7 — đi tuyến vòng',
      severity: 'medium',
      startAt: addHours(anchor, 500),
      endAt: addHours(anchor, 514),
      speedFactor: 0.8,
      extraWaitHours: 0,
      detourKm: 28,
      center: { lat: 53.54, lng: 10.03 },
      radiusKm: 12,
      active: true,
      createdAt: addHours(anchor, -10),
    },
    {
      id: 'sc-5',
      shipmentId: airShipment.id,
      legId: `${airShipment.id}-leg-2`,
      mode: 'air',
      type: 'air-delay',
      label: 'Hoãn chuyến bay sau khi đã cất cánh',
      severity: 'medium',
      startAt: addHours(airStart, 8),
      endAt: addHours(airStart, 12),
      speedFactor: 0.9,
      extraWaitHours: 0,
      detourKm: 0,
      radiusKm: 500,
      active: true,
      createdAt: addDays(anchor, -8),
    },
  ]

  const notifications: UserNotification[] = [
    {
      id: 'notif-seed-docfix',
      type: 'document-fix',
      title: 'Cần bổ sung: MSDS pin lithium',
      detail: 'Thiếu trang 4 mô tả phân loại UN3481 — cần bản MSDS đầy đủ.',
      createdAt: addHours(anchor, -2),
      read: false,
      bookingId: 'bk-4',
    },
    {
      id: 'notif-seed-alert-storm',
      type: 'transport-alert',
      title: 'Bão gần Biển Đỏ — giảm tốc 40%',
      detail:
        'Chặng Singapore → Hamburg (Suez) giảm tốc 40% do bão. ETA toàn hành trình được tính lại theo tình huống đang hiệu lực.',
      createdAt: addHours(anchor, -24),
      read: false,
      severity: 'critical',
      shipmentCode: 'VIE7K2M4A',
      legId: `${oceanShipment.id}-leg-3`,
      legLabel: 'Singapore → Hamburg (Suez)',
      alertId: 'alert-sc-2',
      simAt: addHours(anchor, -24),
    },
    {
      id: 'notif-seed-code',
      type: 'code-issued',
      title: 'Đã cấp mã VIE3N6B9D',
      detail: 'Đường biển FCL — container 20’DC · Bắc Ninh → Hamburg.',
      createdAt: addDays(anchor, -3),
      read: true,
      bookingId: 'bk-3',
      shipmentCode: 'VIE3N6B9D',
    },
    {
      id: 'notif-seed-handover',
      type: 'handover',
      title: 'Đã bàn giao tự động · VIE7K2M4A',
      detail: 'Xe tải 8T đã lấy hàng theo mốc bàn giao của lịch mô phỏng.',
      createdAt: addHours(oceanStart, -3),
      read: true,
      bookingId: 'bk-1',
      shipmentCode: 'VIE7K2M4A',
    },
    {
      id: 'notif-seed-alert-congestion',
      type: 'transport-alert',
      title: 'Ùn tắc giờ cao điểm tại Hải Phòng',
      detail:
        'Chặng nội địa Việt Nam quanh Hải Phòng giảm tốc còn 45% trong 3 giờ. Xe vào vùng ùn tắc nên ETA được tính lại.',
      createdAt: addHours(oceanStart, 1),
      read: true,
      severity: 'warning',
      shipmentCode: 'VIE7K2M4A',
      legId: `${oceanShipment.id}-leg-1`,
      legLabel: 'Chặng nội địa Việt Nam',
      alertId: 'alert-sc-1',
      simAt: addHours(oceanStart, 1),
    },
  ]

  return {
    bookings,
    shipments: [oceanShipment, airShipment, awaitingShipment],
    scenarios,
    notifications,
  }
}
