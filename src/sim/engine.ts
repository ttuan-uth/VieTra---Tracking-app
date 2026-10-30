import { addHours, diffMinutes, durationLabel, toMs } from '../utils/date'
import { haversineKm, pointAtKm, preparePath } from './geo'
import type {
  BuildContext,
  Journey,
  JourneyAlert,
  JourneyEvent,
  LegState,
  Scenario,
  Snapshot,
  TrackPoint,
} from './types'

const MINUTE = 60_000
const HOUR = 3_600_000

const STEP_MINUTES = { road: 5, ocean: 20, air: 10, rail: 15 } as const

function scenarioWindow(scenario: Scenario) {
  return { from: toMs(scenario.startAt), to: toMs(scenario.endAt) }
}

function scenarioIsAirDepartureLocked(scenario: Scenario, actualStart: number): boolean {
  return (
    scenario.mode === 'air' &&
    (scenario.type === 'air-delay' || scenario.type === 'air-reschedule') &&
    toMs(scenario.startAt) > actualStart + MINUTE
  )
}

function estimateImpactMinutes(
  scenario: Scenario,
  actualStart: number,
  actualEnd: number,
): number {
  if (scenario.extraWaitHours > 0) return Math.round(scenario.extraWaitHours * 60)
  if (!scenario.speedFactor || scenario.speedFactor >= 1) return 0
  const overlapStart = Math.max(toMs(scenario.startAt), actualStart)
  const overlapEnd = Math.min(toMs(scenario.endAt), actualEnd)
  const overlapHours = Math.max(0, (overlapEnd - overlapStart) / HOUR)
  return Math.round(overlapHours * (1 / scenario.speedFactor - 1) * 60)
}

export function buildJourney({ shipment, scenarios }: BuildContext): Journey {
  const activeScenarios = scenarios.filter((s) => s.shipmentId === shipment.id && s.active)
  const samples: TrackPoint[] = []
  const legs: LegState[] = []
  const events: JourneyEvent[] = []
  const alerts: JourneyAlert[] = []
  const obstacles: Journey['obstacles'] = []

  const plannedFirst = toMs(shipment.legs[0].plannedDeparture)
  let cursor = plannedFirst
  if (shipment.handoverConfirmedAt) {
    cursor = Math.max(cursor, toMs(shipment.handoverConfirmedAt))
  }

  shipment.legs.forEach((leg, index) => {
    const prepared = preparePath(leg.path)
    const legScenarios = activeScenarios.filter((s) => s.legId === leg.id)

    const detourScenario = legScenarios.find((s) => s.type === 'reroute' && s.detourKm > 0)
    const distanceKm = prepared.totalKm + (detourScenario ? detourScenario.detourKm : 0)

    const plannedStart = toMs(leg.plannedDeparture)
    // A delay announced before an air leg departs pushes the departure; nothing can move a flight
    // that has already taken off.
    const preDepartureWaitHours = legScenarios.reduce((sum, scenario) => {
      if (
        leg.mode === 'air' &&
        (scenario.type === 'air-delay' || scenario.type === 'air-reschedule') &&
        toMs(scenario.startAt) <= cursor &&
        scenario.extraWaitHours > 0
      ) {
        return sum + scenario.extraWaitHours
      }
      return sum
    }, 0)
    if (preDepartureWaitHours > 0) {
      events.push({
        id: `${leg.id}-prewait`,
        at: cursor,
        type: 'scenario',
        title: `Hoãn khởi hành tại ${leg.from.name}`,
        detail: `Chuyến bay bị hoãn ${preDepartureWaitHours} giờ trước khi cất cánh.`,
        legId: leg.id,
        severity: 'warning',
      })
    }
    const actualStart = cursor + preDepartureWaitHours * HOUR

    let coveredKm = 0
    let time = actualStart
    let affected = false
    let incident = false
    let overshootMinutes = 0
    let guard = 0
    const step = STEP_MINUTES[leg.mode]

    while (coveredKm < distanceKm && guard < 20_000) {
      guard += 1
      const point = pointAtKm(prepared, Math.min(coveredKm, prepared.totalKm))
      let factor = 1
      let stopped = false
      let stepAffected = false

      for (const scenario of legScenarios) {
        const window = scenarioWindow(scenario)
        if (time < window.from || time > window.to) continue
        if (scenarioIsAirDepartureLocked(scenario, actualStart)) continue
        const inZone =
          !scenario.center || haversineKm(point, scenario.center) <= scenario.radiusKm
        if (!inZone) continue
        stepAffected = true
        if (scenario.type === 'road-closure' || scenario.type === 'security') stopped = true
        if (scenario.type === 'accident') factor *= Math.min(factor, scenario.speedFactor || 0.5)
        else factor *= scenario.speedFactor > 0 ? scenario.speedFactor : 1
      }

      if (stepAffected) {
        affected = true
        if (stopped) incident = true
      }

      const speedKmh = stopped ? 0 : Math.max(0, leg.speedKmh * factor)
      samples.push({
        t: time,
        ...point,
        mode: leg.mode,
        legId: leg.id,
        speedKmh,
        legProgress: distanceKm > 0 ? Math.min(1, coveredKm / distanceKm) : 0,
        delayed: stepAffected,
        incident: stopped,
      })

      coveredKm += (speedKmh * step) / 60
      if (coveredKm > distanceKm && speedKmh > 0) {
        overshootMinutes = ((coveredKm - distanceKm) / speedKmh) * 60
      }
      time += step * MINUTE
    }

    // Trim the incomplete final step so planned and simulated timings stay comparable.
    if (overshootMinutes > 0 && overshootMinutes < step) {
      time -= overshootMinutes * MINUTE
    }

    const arrivalPoint = prepared.points[prepared.points.length - 1]
    samples.push({
      t: time,
      ...arrivalPoint,
      mode: leg.mode,
      legId: leg.id,
      speedKmh: 0,
      legProgress: 1,
      delayed: affected,
      incident,
    })

    const delayMinutes = diffMinutes(time, toMs(leg.plannedArrival))
    legs.push({
      legId: leg.id,
      mode: leg.mode,
      label: leg.label,
      plannedStart,
      plannedEnd: toMs(leg.plannedArrival),
      actualStart,
      actualEnd: time,
      delayMinutes,
      affected,
      incident,
      distanceKm,
      status: 'pending',
    })

    events.push({
      id: `${leg.id}-depart`,
      at: actualStart,
      type: 'departure',
      title: index === 0 ? `Rời ${leg.from.name}` : `Khởi hành từ ${leg.from.name}`,
      detail:
        index === 0 && actualStart > plannedStart
          ? `Khởi hành thực tế ${durationLabel(diffMinutes(actualStart, plannedStart))} sau kế hoạch.`
          : `Điểm đi: ${leg.from.name}${leg.from.code ? ` (${leg.from.code})` : ''}.`,
      legId: leg.id,
      severity: index === 0 && actualStart > plannedStart + 30 * MINUTE ? 'warning' : 'info',
    })
    events.push({
      id: `${leg.id}-arrive`,
      at: time,
      type: 'arrival',
      title: `Đến ${leg.to.name}`,
      detail:
        delayMinutes > 30
          ? `Đến trễ ${durationLabel(delayMinutes)} so với kế hoạch.`
          : `Đúng kế hoạch. Điểm đến: ${leg.to.name}${leg.to.code ? ` (${leg.to.code})` : ''}.`,
      legId: leg.id,
      severity: delayMinutes > 30 ? 'warning' : 'info',
    })

    for (const scenario of legScenarios) {
      if (scenarioIsAirDepartureLocked(scenario, actualStart)) {
        events.push({
          id: `${scenario.id}-locked`,
          at: toMs(scenario.startAt),
          type: 'info',
          title: `Không áp dụng: ${scenario.label}`,
          detail:
            'Chuyến bay đã cất cánh nên không thể đổi giờ khởi hành. Tình huống được giữ ở trạng thái tham khảo.',
          legId: leg.id,
          severity: 'info',
        })
        continue
      }
      const impactMinutes = estimateImpactMinutes(scenario, actualStart, time)
      obstacles.push({
        id: scenario.id,
        scenario,
        from: toMs(scenario.startAt),
        to: toMs(scenario.endAt),
        severity: scenario.severity,
      })
      const severity: JourneyAlert['severity'] =
        scenario.severity === 'high' ? 'critical' : scenario.severity === 'medium' ? 'warning' : 'info'
      alerts.push({
        id: `alert-${scenario.id}`,
        type: scenario.type,
        severity,
        title: scenario.type === 'road-closure' ? 'Đóng đường' : scenario.label,
        detail: `${scenario.label}. Ảnh hưởng ước tính ${durationLabel(impactMinutes)}.`,
        at: toMs(scenario.startAt),
        legId: leg.id,
        impactMinutes,
        status: 'open',
      })
    }

    if (delayMinutes > 30) {
      alerts.push({
        id: `alert-delay-${leg.id}`,
        type: 'late-arrival',
        severity: delayMinutes > 240 ? 'critical' : 'warning',
        title: `Chậm đến ${leg.to.name}`,
        detail: `Thực tế đến trễ ${durationLabel(delayMinutes)} so với lịch trình. ETA toàn hành trình được tính lại.`,
        at: time,
        legId: leg.id,
        impactMinutes: delayMinutes,
        status: 'open',
      })
    }

    cursor = time

    const scenarioWaitHours = legScenarios.reduce((sum, scenario) => {
      if (scenarioIsAirDepartureLocked(scenario, actualStart)) return sum
      if (scenario.extraWaitHours <= 0) return sum
      const window = scenarioWindow(scenario)
      const overlaps = window.to >= actualStart && window.from <= time
      return overlaps ? sum + scenario.extraWaitHours : sum
    }, 0)

    if (scenarioWaitHours > 0) {
      events.push({
        id: `${leg.id}-extra-wait`,
        at: time,
        type: 'wait',
        title: `Chờ thêm tại ${leg.to.name}`,
        detail: `Tình huống đang hiệu lực cộng thêm ${scenarioWaitHours} giờ chờ.`,
        legId: leg.id,
        severity: 'warning',
      })
      samples.push({
        t: time,
        ...arrivalPoint,
        mode: leg.mode,
        legId: leg.id,
        speedKmh: 0,
        legProgress: 1,
        delayed: true,
        incident: false,
      })
      time += scenarioWaitHours * HOUR
      cursor = time
    }

    if (leg.waitAfterHours > 0) {
      const waitHours = leg.waitAfterHours
      const waitEnd = cursor + waitHours * HOUR
      events.push({
        id: `${leg.id}-wait`,
        at: time,
        type: 'wait',
        title: `Chờ trung chuyển tại ${leg.to.name}`,
        detail: `Thời gian chờ dự kiến ${waitHours} giờ.`,
        legId: leg.id,
        severity: 'info',
      })
      samples.push({
        t: time,
        ...arrivalPoint,
        mode: leg.mode,
        legId: leg.id,
        speedKmh: 0,
        legProgress: 1,
        delayed: false,
        incident: false,
      })
      samples.push({
        t: waitEnd,
        ...arrivalPoint,
        mode: leg.mode,
        legId: leg.id,
        speedKmh: 0,
        legProgress: 1,
        delayed: false,
        incident: false,
      })
      cursor = waitEnd
    }
  })

  const plannedEnd = toMs(shipment.legs[shipment.legs.length - 1].plannedArrival)
  const projectedEnd = cursor
  const windowStart = Math.min(plannedFirst, toMs(shipment.handoverAt)) - 6 * HOUR
  const windowEnd = Math.max(projectedEnd, plannedEnd) + 12 * HOUR

  if (shipment.handoverConfirmedAt) {
    events.push({
      id: `${shipment.id}-handover`,
      at: toMs(shipment.handoverConfirmedAt),
      type: 'handover',
      title: 'Xác nhận hàng đã được giao',
      detail: `Admin xác nhận lô hàng đã sẵn sàng tại ${shipment.legs[0].from.name}.`,
      severity: 'info',
    })
  }

  if (shipment.handoff === 'deliver-to-warehouse') {
    events.push({
      id: `${shipment.id}-cutoff`,
      at: toMs(shipment.handoverAt),
      type: 'milestone',
      title: 'Cut-off nhập kho',
      detail: 'Hàng phải có mặt tại kho trước mốc này để kịp chuyến đã đặt.',
      severity: 'info',
    })
  } else {
    events.push({
      id: `${shipment.id}-pickup`,
      at: toMs(shipment.handoverAt),
      type: 'milestone',
      title: 'Dự kiến xe đến lấy hàng',
      detail: `Xe ${shipment.vehicleName} · ${shipment.vehiclePlate} đến điểm lấy hàng.`,
      severity: 'info',
    })
  }

  events.sort((a, b) => a.at - b.at)
  alerts.sort((a, b) => a.at - b.at)
  samples.sort((a, b) => a.t - b.t)

  return {
    shipmentId: shipment.id,
    windowStart,
    windowEnd,
    plannedStart: plannedFirst,
    plannedEnd,
    projectedEnd,
    delayMinutes: diffMinutes(projectedEnd, plannedEnd),
    legs,
    samples,
    events,
    alerts,
    obstacles,
  }
}

function sampleIndexAt(samples: TrackPoint[], time: number): number {
  let low = 0
  let high = samples.length - 1
  if (high < 0) return -1
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    if (samples[mid].t <= time) low = mid
    else high = mid - 1
  }
  return low
}

export function snapshotAt(journey: Journey, time: number): Snapshot {
  const delivered = time >= journey.projectedEnd
  const awaiting = time < journey.plannedStart
  const index = sampleIndexAt(journey.samples, time)
  const sample = index >= 0 ? journey.samples[index] : null
  const next = journey.samples[Math.min(index + 1, journey.samples.length - 1)]

  let speedKmh = sample?.speedKmh ?? 0
  let point = sample ?? { lat: 0, lng: 0 }
  if (sample && next && time > sample.t) {
    const ratio = Math.min(1, (time - sample.t) / Math.max(1, next.t - sample.t))
    point = {
      lat: sample.lat + (next.lat - sample.lat) * ratio,
      lng: sample.lng + (next.lng - sample.lng) * ratio,
    }
    speedKmh = sample.speedKmh
  }

  const legStates = journey.legs.map((leg) => {
    let status: LegState['status'] = 'pending'
    if (time >= leg.actualEnd) status = 'completed'
    else if (time >= leg.actualStart) status = 'running'
    return { ...leg, status }
  })
  const activeIndex = legStates.findIndex((leg) => leg.status === 'running')
  const completedIndex = legStates.filter((leg) => leg.status === 'completed').length
  const legIndex = activeIndex >= 0 ? activeIndex : Math.min(completedIndex, legStates.length - 1)
  const activeLeg = legStates[legIndex] ?? null
  const progress = sample?.legProgress ?? (delivered ? 1 : 0)

  return {
    time,
    point,
    speedKmh,
    leg: activeLeg,
    legIndex,
    progress,
    mode: activeLeg?.mode ?? journey.legs[0]?.mode ?? 'ocean',
    eta: journey.projectedEnd,
    delayMinutes: journey.delayMinutes,
    delivered,
    awaiting,
  }
}

export function journeyProgress(journey: Journey, time: number): number {
  const span = journey.projectedEnd - journey.plannedStart
  if (span <= 0) return 1
  return Math.max(0, Math.min(1, (time - journey.plannedStart) / span))
}

export function clampToWindow(journey: Journey, time: number): number {
  return Math.min(journey.windowEnd, Math.max(journey.windowStart, time))
}

export function defaultSimTime(journey: Journey): number {
  const now = Date.now()
  if (now <= journey.windowStart) return journey.windowStart
  if (now >= journey.windowEnd) return journey.windowEnd
  return now
}

export { addHours }
