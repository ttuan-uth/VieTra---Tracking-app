import type {
  HandoffMode,
  RouteLeg,
  Shipment,
  ShipmentStatus,
  TransportMode,
  Waypoint,
} from '../types/domain'
import { addDays, addHours, dateTimeLabel } from '../utils/date'
import { preparePath } from '../sim/geo'

const SPEED = { road: 38, ocean: 21, air: 700, rail: 17 } as const

function wp(
  name: string,
  code: string | undefined,
  kind: Waypoint['kind'],
  lat: number,
  lng: number,
): Waypoint {
  return { name, code, kind, lat, lng }
}

interface LegSpec {
  mode: TransportMode
  label: string
  from: Waypoint
  to: Waypoint
  path: Array<[number, number]>
  waitAfterHours?: number
}

function makeLegs(shipmentId: string, startAt: string, specs: LegSpec[]): RouteLeg[] {
  let cursor = startAt
  return specs.map((spec, index) => {
    const points = spec.path.map(([lat, lng]) => ({ lat, lng }))
    const distanceKm = preparePath(points).totalKm
    const speedKmh = SPEED[spec.mode]
    const plannedDeparture = cursor
    const plannedArrival = addHours(cursor, distanceKm / speedKmh)
    const waitAfterHours = spec.waitAfterHours ?? 0
    cursor = addHours(plannedArrival, waitAfterHours)
    return {
      id: `${shipmentId}-leg-${index + 1}`,
      mode: spec.mode,
      label: spec.label,
      from: spec.from,
      to: spec.to,
      path: points,
      plannedDeparture,
      plannedArrival,
      speedKmh,
      waitAfterHours,
    }
  })
}

const PICKUP = wp('Kho Bắc Ninh', 'WAREHOUSE-BN', 'warehouse', 21.1861, 106.0763)
const CONSIGNEE = wp('Kho người nhận — Billbrook', 'CONSIGNEE-HH', 'consignee', 53.5292, 10.1012)

function oceanSpecs(): LegSpec[] {
  const haiPhong = wp('Cảng Hải Phòng', 'VNDDU', 'port', 20.865, 106.7)
  const singapore = wp('Cảng Singapore', 'SGSIN', 'hub', 1.2644, 103.8403)
  const hamburg = wp('Cảng Hamburg', 'DEHAM', 'port', 53.5461, 9.9661)

  return [
    {
      mode: 'road',
      label: 'Chặng nội địa Việt Nam',
      from: PICKUP,
      to: haiPhong,
      path: [
        [21.1861, 106.0763],
        [21.06, 106.32],
        [20.95, 106.55],
        [20.865, 106.7],
      ],
    },
    {
      mode: 'ocean',
      label: 'Hải Phòng → Singapore',
      from: haiPhong,
      to: singapore,
      waitAfterHours: 18,
      path: [
        [20.865, 106.7],
        [16.2, 108.6],
        [11.5, 107.0],
        [6.0, 105.5],
        [1.2644, 103.8403],
      ],
    },
    {
      mode: 'ocean',
      label: 'Singapore → Hamburg (Suez)',
      from: singapore,
      to: hamburg,
      waitAfterHours: 6,
      path: [
        [1.2644, 103.8403],
        [5.5, 95.0],
        [8.0, 78.0],
        [12.6, 43.5],
        [19.5, 37.5],
        [27.5, 34.0],
        [30.5, 32.5],
        [33.0, 31.5],
        [35.5, 24.0],
        [37.0, 12.0],
        [36.0, -5.6],
        [35.5, -9.5],
        [43.0, -9.5],
        [48.0, -6.0],
        [49.8, -4.0],
        [50.0, 0.0],
        [51.0, 2.5],
        [53.5, 8.0],
        [53.5461, 9.9661],
      ],
    },
    {
      mode: 'road',
      label: 'Giao hàng chặng cuối',
      from: hamburg,
      to: CONSIGNEE,
      path: [
        [53.5461, 9.9661],
        [53.54, 10.03],
        [53.5292, 10.1012],
      ],
    },
  ]
}

function airSpecs(): LegSpec[] {
  const noiBai = wp('Sân bay Nội Bài', 'HAN', 'airport', 21.2187, 105.8042)
  const frankfurt = wp('Sân bay Frankfurt', 'FRA', 'hub', 50.0379, 8.5622)
  const hamburgAirport = wp('Sân bay Hamburg', 'HAM', 'airport', 53.6304, 9.9882)

  return [
    {
      mode: 'road',
      label: 'Chặng nội địa Việt Nam',
      from: PICKUP,
      to: noiBai,
      waitAfterHours: 60,
      path: [
        [21.1861, 106.0763],
        [21.21, 105.95],
        [21.2187, 105.8042],
      ],
    },
    {
      mode: 'air',
      label: 'Nội Bài → Frankfurt',
      from: noiBai,
      to: frankfurt,
      waitAfterHours: 4,
      path: [
        [21.2187, 105.8042],
        [27.0, 100.0],
        [34.0, 90.0],
        [41.0, 76.0],
        [46.5, 60.0],
        [49.5, 40.0],
        [50.5, 20.0],
        [50.0379, 8.5622],
      ],
    },
    {
      mode: 'air',
      label: 'Frankfurt → Hamburg',
      from: frankfurt,
      to: hamburgAirport,
      waitAfterHours: 3,
      path: [
        [50.0379, 8.5622],
        [51.8, 9.2],
        [52.8, 9.7],
        [53.6304, 9.9882],
      ],
    },
    {
      mode: 'road',
      label: 'Giao hàng chặng cuối',
      from: hamburgAirport,
      to: CONSIGNEE,
      path: [
        [53.6304, 9.9882],
        [53.58, 10.05],
        [53.5292, 10.1012],
      ],
    },
  ]
}

function railSpecs(): LegSpec[] {
  const haNoiStation = wp('Ga Hà Nội', 'VN-HAN', 'hub', 21.0245, 105.8412)
  const zhengzhou = wp('Ga Trịnh Châu', 'CN-ZZ', 'hub', 34.7466, 113.6254)
  const hamburgStation = wp('Ga Hamburg', 'DE-HH', 'hub', 53.5526, 10.0067)

  return [
    {
      mode: 'road',
      label: 'Chặng nội địa Việt Nam',
      from: PICKUP,
      to: haNoiStation,
      waitAfterHours: 8,
      path: [
        [21.1861, 106.0763],
        [21.1, 105.95],
        [21.0245, 105.8412],
      ],
    },
    {
      mode: 'rail',
      label: 'Hà Nội → Trịnh Châu',
      from: haNoiStation,
      to: zhengzhou,
      waitAfterHours: 10,
      path: [
        [21.0245, 105.8412],
        [23.5, 108.3],
        [26.0, 110.5],
        [30.0, 112.0],
        [34.7466, 113.6254],
      ],
    },
    {
      mode: 'rail',
      label: 'Trịnh Châu → Hamburg',
      from: zhengzhou,
      to: hamburgStation,
      path: [
        [34.7466, 113.6254],
        [40.0, 105.0],
        [45.0, 98.0],
        [48.0, 85.0],
        [51.0, 70.0],
        [52.5, 50.0],
        [53.0, 30.0],
        [53.2, 15.0],
        [53.5526, 10.0067],
      ],
    },
    {
      mode: 'road',
      label: 'Giao hàng chặng cuối',
      from: hamburgStation,
      to: CONSIGNEE,
      path: [
        [53.5526, 10.0067],
        [53.54, 10.06],
        [53.5292, 10.1012],
      ],
    },
  ]
}

export function buildLegs(
  shipmentId: string,
  mode: 'ocean' | 'air' | 'rail',
  startAt: string,
): RouteLeg[] {
  if (mode === 'air') return makeLegs(shipmentId, startAt, airSpecs())
  if (mode === 'rail') return makeLegs(shipmentId, startAt, railSpecs())
  return makeLegs(shipmentId, startAt, oceanSpecs())
}

export interface ShipmentSeed {
  id: string
  code: string
  customer: string
  serviceName: string
  mode: 'ocean' | 'air' | 'rail'
  handoff: HandoffMode
  startAt: string
  handoverAt: string
  handoverConfirmedAt: string | null
  status: ShipmentStatus
  cargoSummary: string
  specialCargo: string[]
  vehicleName: string
  vehiclePlate: string
}

export function buildShipment(seed: ShipmentSeed): Shipment {
  const legs = buildLegs(seed.id, seed.mode, seed.startAt)
  return {
    id: seed.id,
    code: seed.code,
    customer: seed.customer,
    serviceName: seed.serviceName,
    mode: seed.mode,
    handoff: seed.handoff,
    handoverNote:
      seed.handoff === 'deliver-to-warehouse'
        ? `Cut-off nhập kho: ${dateTimeLabel(seed.handoverAt)}`
        : `Xe ${seed.vehicleName} dự kiến đến lấy hàng: ${dateTimeLabel(seed.handoverAt)}`,
    handoverAt: seed.handoverAt,
    handoverConfirmedAt: seed.handoverConfirmedAt,
    status: seed.status,
    legs,
    origin: legs[0].from.name,
    destination: legs[legs.length - 1].to.name,
    cargoSummary: seed.cargoSummary,
    specialCargo: seed.specialCargo,
    vehicleName: seed.vehicleName,
    vehiclePlate: seed.vehiclePlate,
    createdAt: addDays(seed.startAt, -2),
  }
}

export function shipmentForBooking(options: {
  id: string
  code: string
  mode: 'ocean' | 'air' | 'rail'
  handoff: HandoffMode
  startAt: string
  customer: string
  serviceName: string
  cargoSummary: string
  specialCargo: string[]
}): Shipment {
  return buildShipment({
    id: options.id,
    code: options.code,
    customer: options.customer,
    serviceName: options.serviceName,
    mode: options.mode,
    handoff: options.handoff,
    startAt: options.startAt,
    handoverAt: addHours(options.startAt, options.handoff === 'deliver-to-warehouse' ? -6 : -2),
    handoverConfirmedAt: options.startAt,
    status: 'in-transit',
    cargoSummary: options.cargoSummary,
    specialCargo: options.specialCargo,
    vehicleName: 'Xe tải 8T — đội Miền Bắc',
    vehiclePlate: '15C-228.14',
  })
}

export const LEG_MODE_LABEL: Record<TransportMode, string> = {
  road: 'Đường bộ',
  ocean: 'Đường biển',
  air: 'Đường hàng không',
  rail: 'Đường sắt',
}
