import type { Shipment, TransportAlertNotice } from '../../types/domain'
import type { JourneyAlert } from '../../sim/types'

/**
 * Converts actionable simulation alerts into notification payloads.
 * Informational alerts stay on the tracking screen only.
 */
export function transportAlertNotices(
  shipment: Shipment,
  alerts: JourneyAlert[],
): TransportAlertNotice[] {
  return alerts
    .filter(
      (alert): alert is JourneyAlert & { severity: 'warning' | 'critical' } =>
        alert.severity !== 'info',
    )
    .map((alert) => {
      const leg = shipment.legs.find((item) => item.id === alert.legId)
      return {
        shipmentCode: shipment.code,
        alertId: alert.id,
        legId: alert.legId,
        legLabel: leg?.label ?? 'Chặng chưa xác định',
        title: alert.title,
        detail: alert.detail,
        severity: alert.severity,
        simAt: new Date(alert.at).toISOString(),
      }
    })
}
