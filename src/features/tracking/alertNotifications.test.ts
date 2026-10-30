import { describe, expect, it } from 'vitest'
import { buildShipment } from '../../data/routes'
import type { JourneyAlert } from '../../sim/types'
import { transportAlertNotices } from './alertNotifications'

const shipment = buildShipment({
  id: 'shp-test',
  code: 'VIETEST01',
  customer: 'Khách thử',
  serviceName: 'Tuyến thử',
  mode: 'rail',
  handoff: 'carrier-pickup',
  startAt: '2026-10-01T00:00:00.000Z',
  handoverAt: '2026-09-30T20:00:00.000Z',
  handoverConfirmedAt: '2026-09-30T20:00:00.000Z',
  status: 'in-transit',
  cargoSummary: '1 kiện',
  specialCargo: [],
  vehicleName: 'Xe thử',
  vehiclePlate: '00A-0000',
})

const warning: JourneyAlert = {
  id: 'alert-sc-1',
  type: 'congestion',
  severity: 'warning',
  title: 'Ùn tắc',
  detail: 'Giảm tốc trên chặng.',
  at: Date.parse('2026-10-01T01:00:00.000Z'),
  legId: 'shp-test-leg-1',
  impactMinutes: 90,
  status: 'open',
}

describe('transportAlertNotices', () => {
  it('maps an actionable alert to the exact shipment leg', () => {
    const [notice] = transportAlertNotices(shipment, [warning])
    expect(notice.legId).toBe('shp-test-leg-1')
    expect(notice.shipmentCode).toBe('VIETEST01')
    expect(notice.severity).toBe('warning')
    expect(notice.simAt).toBe('2026-10-01T01:00:00.000Z')
    expect(notice.legLabel).toBe(shipment.legs[0].label)
  })

  it('does not turn informational alerts into notifications', () => {
    expect(
      transportAlertNotices(shipment, [{ ...warning, id: 'alert-info', severity: 'info' }]),
    ).toEqual([])
  })
})
