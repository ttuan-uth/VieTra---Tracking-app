import { describe, expect, it } from 'vitest'
import { buildJourney, snapshotAt } from './engine'
import type { Scenario } from './types'
import type { RouteLeg, Shipment, TransportMode, Waypoint } from '../types/domain'
import { addHours, toMs } from '../utils/date'
import { preparePath } from './geo'

const START = '2026-11-02T00:00:00.000Z'
const HOUR = 3_600_000

function waypoint(name: string, lat: number, lng: number): Waypoint {
  return { name, kind: 'port', lat, lng }
}

function leg(
  id: string,
  mode: TransportMode,
  from: Waypoint,
  to: Waypoint,
  path: Array<[number, number]>,
  speedKmh: number,
  waitAfterHours = 0,
): RouteLeg {
  const points = path.map(([lat, lng]) => ({ lat, lng }))
  const distance = preparePath(points).totalKm
  return {
    id,
    mode,
    label: id,
    from,
    to,
    path: points,
    plannedDeparture: START,
    plannedArrival: addHours(START, distance / speedKmh),
    speedKmh,
    waitAfterHours,
  }
}

function makeShipment(mode: 'ocean' | 'air' = 'ocean'): Shipment {
  const a = waypoint('A', 0, 0)
  const b = waypoint('B', 0, 10)
  const c = waypoint('C', 0, 20)
  const first = leg('leg-1', mode === 'air' ? 'air' : 'ocean', a, b, [[0, 0], [0, 5], [0, 10]], mode === 'air' ? 200 : 40)
  const second = leg(
    'leg-2',
    mode === 'air' ? 'air' : 'ocean',
    b,
    c,
    [[0, 10], [0, 15], [0, 20]],
    mode === 'air' ? 200 : 30,
    2,
  )
  const startTimes = [START, addHours(first.plannedArrival, 2)]
  return {
    id: 'ship-test',
    code: 'VIE TEST 1',
    customer: 'Test',
    serviceName: 'Test service',
    mode,
    handoff: 'carrier-pickup',
    handoverNote: '',
    handoverAt: addHours(START, -2),
    handoverConfirmedAt: addHours(START, -2),
    status: 'in-transit',
    legs: [first, second].map((item, index) => ({
      ...item,
      plannedDeparture: startTimes[index],
      plannedArrival: addHours(startTimes[index], preparePath(item.path).totalKm / item.speedKmh),
    })),
    origin: 'A',
    destination: 'C',
    cargoSummary: '',
    specialCargo: [],
    vehicleName: 'Truck',
    vehiclePlate: 'TEST',
    createdAt: START,
  }
}

function scenario(overrides: Partial<Scenario>): Scenario {
  return {
    id: 'scenario-1',
    shipmentId: 'ship-test',
    legId: 'leg-1',
    mode: 'ocean',
    type: 'congestion',
    label: 'Test scenario',
    severity: 'medium',
    startAt: addHours(START, 1),
    endAt: addHours(START, 40),
    speedFactor: 0.5,
    extraWaitHours: 0,
    detourKm: 0,
    radiusKm: 50,
    active: true,
    createdAt: START,
    ...overrides,
  }
}

describe('simulation engine', () => {
  it('builds a deterministic journey with ordered samples', () => {
    const shipment = makeShipment()
    const journey = buildJourney({ shipment, scenarios: [] })

    expect(journey.legs).toHaveLength(2)
    expect(journey.samples.length).toBeGreaterThan(10)
    expect(journey.delayMinutes).toBe(0)
    expect(journey.projectedEnd).toBeGreaterThanOrEqual(journey.plannedEnd)
    for (let index = 1; index < journey.samples.length; index += 1) {
      expect(journey.samples[index].t).toBeGreaterThanOrEqual(journey.samples[index - 1].t)
    }
  })

  it('restores the exact state when time is reversed', () => {
    const shipment = makeShipment()
    const journey = buildJourney({ shipment, scenarios: [] })
    const target = journey.plannedStart + 20 * HOUR

    const before = snapshotAt(journey, target)
    snapshotAt(journey, target + 15 * HOUR)
    const after = snapshotAt(journey, target)

    expect(after.point).toEqual(before.point)
    expect(after.speedKmh).toBe(before.speedKmh)
    expect(after.legIndex).toBe(before.legIndex)
    expect(after.eta).toBe(before.eta)
  })

  it('delays arrival when a congestion scenario reduces speed', () => {
    const shipment = makeShipment()
    const base = buildJourney({ shipment, scenarios: [] })
    const delayed = buildJourney({
      shipment,
      scenarios: [
        scenario({
          startAt: addHours(START, -1),
          endAt: addHours(START, 60),
          speedFactor: 0.5,
          radiusKm: 20_000,
        }),
      ],
    })

    expect(delayed.projectedEnd).toBeGreaterThan(base.projectedEnd)
    const moment = base.plannedStart + 12 * HOUR
    expect(snapshotAt(delayed, moment).progress).toBeLessThan(
      snapshotAt(base, moment).progress,
    )
  })

  it('holds the vehicle inside a road-closure zone', () => {
    const shipment = makeShipment()
    const journey = buildJourney({
      shipment,
      scenarios: [
        scenario({
          type: 'road-closure',
          mode: 'ocean',
          startAt: addHours(START, 1),
          endAt: addHours(START, 4),
          speedFactor: 0,
          radiusKm: 20_000,
        }),
      ],
    })
    const inside = snapshotAt(journey, journey.plannedStart + 2 * HOUR)
    expect(inside.speedKmh).toBe(0)
  })

  it('adds travel time when a reroute increases distance', () => {
    const shipment = makeShipment()
    const base = buildJourney({ shipment, scenarios: [] })
    const rerouted = buildJourney({
      shipment,
      scenarios: [
        scenario({
          type: 'reroute',
          detourKm: 300,
          speedFactor: 1,
          startAt: addHours(START, -1),
          endAt: addHours(START, 60),
          radiusKm: 20_000,
        }),
      ],
    })
    expect(rerouted.projectedEnd).toBeGreaterThan(base.projectedEnd)
  })

  it('ignores departure changes for a flight that already took off', () => {
    const shipment = makeShipment('air')
    const base = buildJourney({ shipment, scenarios: [] })
    const journey = buildJourney({
      shipment,
      scenarios: [
        scenario({
          mode: 'air',
          type: 'air-delay',
          legId: 'leg-1',
          startAt: addHours(START, 2),
          endAt: addHours(START, 6),
          speedFactor: 1,
          extraWaitHours: 10,
        }),
      ],
    })

    expect(journey.projectedEnd).toBe(base.projectedEnd)
    expect(
      journey.events.some((event) => event.title.startsWith('Không áp dụng')),
    ).toBe(true)
  })

  it('applies extra port waiting time to the projected arrival', () => {
    const shipment = makeShipment()
    const base = buildJourney({ shipment, scenarios: [] })
    const journey = buildJourney({
      shipment,
      scenarios: [
        scenario({
          type: 'port-congestion',
          startAt: addHours(START, 0),
          endAt: addHours(START, 200),
          speedFactor: 1,
          extraWaitHours: 12,
        }),
      ],
    })

    expect(journey.projectedEnd - base.projectedEnd).toBeGreaterThanOrEqual(11 * HOUR)
    expect(toMs(journey.legs[0].actualStart)).toBeGreaterThanOrEqual(toMs(START))
  })
})
