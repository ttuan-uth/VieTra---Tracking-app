import type { TransportAlertNotice, UserNotification } from '../types/domain'

function alertKey(notification: { shipmentCode?: string; alertId?: string }): string | null {
  if (!notification.shipmentCode || !notification.alertId) return null
  return `${notification.shipmentCode.toUpperCase()}::${notification.alertId}`
}

/**
 * Keeps one notification per shipment alert, even if the simulation crosses the same
 * alert again after a reverse or replay.
 */
export function freshTransportAlerts(
  existing: UserNotification[],
  incoming: TransportAlertNotice[],
): TransportAlertNotice[] {
  const seen = new Set<string>()
  for (const notification of existing) {
    if (notification.type !== 'transport-alert') continue
    const key = alertKey(notification)
    if (key) seen.add(key)
  }

  return incoming.filter((alert) => {
    const key = alertKey(alert)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}
