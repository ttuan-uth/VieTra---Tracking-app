import { describe, expect, it } from 'vitest'
import { freshTransportAlerts } from './notifications'
import type { TransportAlertNotice, UserNotification } from '../types/domain'

const existingAlert: UserNotification = {
  id: 'notif-1',
  type: 'transport-alert',
  title: 'Ùn tắc',
  detail: 'Chi tiết',
  createdAt: '2026-10-01T08:00:00.000Z',
  read: false,
  shipmentCode: 'VIE7K2M4A',
  alertId: 'alert-sc-1',
}

const notice: TransportAlertNotice = {
  shipmentCode: 'VIE7K2M4A',
  alertId: 'alert-sc-1',
  legId: 'shp-ocean-1-leg-1',
  legLabel: 'Chặng nội địa Việt Nam',
  title: 'Ùn tắc',
  detail: 'Chi tiết',
  severity: 'warning',
  simAt: '2026-10-01T08:00:00.000Z',
}

describe('freshTransportAlerts', () => {
  it('skips alerts already notified for the same shipment', () => {
    expect(freshTransportAlerts([existingAlert], [notice])).toEqual([])
  })

  it('deduplicates the same alert inside one batch', () => {
    expect(freshTransportAlerts([], [notice, notice])).toHaveLength(1)
  })

  it('allows the same alert id on another shipment', () => {
    const other = { ...notice, shipmentCode: 'VIE5R8T1C' }
    expect(freshTransportAlerts([existingAlert], [other])).toEqual([other])
  })

  it('ignores other notification types with a matching alert id', () => {
    const codeIssued: UserNotification = {
      ...existingAlert,
      id: 'notif-2',
      type: 'code-issued',
    }
    expect(freshTransportAlerts([codeIssued], [notice])).toEqual([notice])
  })
})
