import { useEffect, useRef } from 'react'
import L from 'leaflet'
import styles from './TrackingPage.module.css'
import type { Journey, Snapshot } from '../../sim/types'
import type { Shipment } from '../../types/domain'
import { MODE_COLOR } from './modeMeta'
import { dateTimeLabel } from '../../utils/date'

interface TrackMapProps {
  shipment: Shipment
  journey: Journey
  snapshot: Snapshot
  selectedLegId: string | null
  focusLegId?: string | null
  onSelectLeg: (legId: string) => void
}

function legStatusColor(affected: boolean, incident: boolean, mode: string): string {
  if (incident) return '#a32217'
  if (affected) return '#b4761a'
  return MODE_COLOR[mode as keyof typeof MODE_COLOR] ?? '#1f5f8b'
}

export function TrackMap({
  shipment,
  journey,
  snapshot,
  selectedLegId,
  focusLegId,
  onSelectLeg,
}: TrackMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const routeLayerRef = useRef<L.LayerGroup | null>(null)
  const vehicleRef = useRef<L.Marker | null>(null)
  const fittedRef = useRef<string>('')
  const fitTimerRef = useRef<number | null>(null)
  const minuteBucket = Math.floor(snapshot.time / 60_000)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      zoomControl: false,
      scrollWheelZoom: false,
      worldCopyJump: true,
    }).setView([25, 70], 3)

    L.control.zoom({ position: 'bottomright' }).addTo(map)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: 'Tuyến mô phỏng · © OpenStreetMap',
    }).addTo(map)

    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(containerRef.current)

    // Offline-friendly geographic context: graticule + ocean/continent labels stay visible
    // even when map tiles cannot be fetched.
    const contextLayer = L.layerGroup().addTo(map)
    for (let lat = -60; lat <= 60; lat += 30) {
      L.polyline(
        [
          [lat, -170],
          [lat, 170],
        ],
        { color: '#c7d5df', weight: 0.8, opacity: 0.7, dashArray: '2 7', interactive: false },
      ).addTo(contextLayer)
    }
    for (let lng = -150; lng <= 150; lng += 30) {
      L.polyline(
        [
          [-70, lng],
          [78, lng],
        ],
        { color: '#c7d5df', weight: 0.8, opacity: 0.7, dashArray: '2 7', interactive: false },
      ).addTo(contextLayer)
    }
    const geoLabels: Array<[string, number, number]> = [
      ['CHÂU ÂU', 52, 16],
      ['CHÂU Á', 38, 92],
      ['CHÂU PHI', 5, 20],
      ['ẤN ĐỘ DƯƠNG', -18, 78],
      ['ĐẠI TÂY DƯƠNG', 28, -38],
    ]
    for (const [label, lat, lng] of geoLabels) {
      L.marker([lat, lng], {
        interactive: false,
        icon: L.divIcon({
          className: '',
          iconSize: [110, 14],
          html: `<span style="font-family:'IBM Plex Sans',sans-serif;font-size:10px;font-weight:600;letter-spacing:.08em;color:#8ea3b2;">${label}</span>`,
        }),
      }).addTo(contextLayer)
    }

    routeLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    return () => {
      observer.disconnect()
      map.remove()
      mapRef.current = null
      routeLayerRef.current = null
      vehicleRef.current = null
      fittedRef.current = ''
      if (fitTimerRef.current) {
        window.clearTimeout(fitTimerRef.current)
        fitTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    const group = routeLayerRef.current
    if (!map || !group) return
    group.clearLayers()
    const bounds = L.latLngBounds([])
    const renderTime = minuteBucket * 60_000
    const currentSamples = journey.samples.filter((sample) => sample.t <= renderTime)
    const currentSample = currentSamples[currentSamples.length - 1]

    // affected zones from active scenarios
    for (const obstacle of journey.obstacles) {
      if (!obstacle.scenario.center) continue
      const color = obstacle.severity === 'high' ? '#a32217' : '#b4761a'
      L.circle([obstacle.scenario.center.lat, obstacle.scenario.center.lng], {
        radius: obstacle.scenario.radiusKm * 1000,
        color,
        weight: 1,
        opacity: 0.65,
        fillColor: color,
        fillOpacity: 0.06,
        dashArray: '4 5',
      })
        .bindTooltip(
          `${obstacle.scenario.label} · ${dateTimeLabel(obstacle.scenario.startAt)} → ${dateTimeLabel(obstacle.scenario.endAt)}`,
          { sticky: true },
        )
        .addTo(group)
    }

    shipment.legs.forEach((leg, index) => {
      const state = journey.legs[index]
      const color = legStatusColor(state.affected, state.incident, leg.mode)
      const isSelected = selectedLegId === leg.id
      const latlngs = leg.path.map((point) => [point.lat, point.lng] as [number, number])

      // Planned route — dashed, muted
      const planned = L.polyline(latlngs, {
        color: MODE_COLOR[leg.mode],
        weight: isSelected ? 2 : 1.4,
        opacity: isSelected ? 0.85 : 0.4,
        dashArray: '4 6',
      })
        .bindTooltip(`Tuyến dự kiến · ${leg.label}`, { sticky: true })
        .on('click', () => onSelectLeg(leg.id))
      planned.addTo(group)

      // Travelled portion — solid, state colored
      const travelled = currentSamples.filter((sample) => sample.legId === leg.id)
      if (travelled.length > 1) {
        L.polyline(
          travelled.map((sample) => [sample.lat, sample.lng] as [number, number]),
          {
            color,
            weight: isSelected ? 5 : 3.5,
            opacity: 0.95,
            lineCap: 'round',
          },
        )
          .bindPopup(
            `<strong>${leg.label}</strong><br/>${leg.from.name} → ${leg.to.name}<br/>` +
              `Khởi hành: ${dateTimeLabel(state.actualStart)}<br/>` +
              `Đến dự kiến: ${dateTimeLabel(state.actualEnd)}<br/>` +
              (state.delayMinutes > 30
                ? `Chậm ${Math.round(state.delayMinutes / 60)} giờ so với kế hoạch`
                : 'Đúng kế hoạch'),
          )
          .on('click', () => onSelectLeg(leg.id))
          .addTo(group)
      }

      // Remaining route of the active leg — fine dashes
      if (state.status === 'running' && travelled.length > 0 && currentSample) {
        const currentPoint = { lat: currentSample.lat, lng: currentSample.lng }
        const progress = Math.max(0, Math.min(1, currentSample.legProgress))
        const startIndex = Math.floor(progress * (latlngs.length - 1))
        const remaining = [currentPoint, ...leg.path.slice(startIndex + 1)].map(
          (point) => [point.lat, point.lng] as [number, number],
        )
        L.polyline(remaining, {
          color: '#8a9aa8',
          weight: 2,
          opacity: 0.7,
          dashArray: '3 5',
        }).addTo(group)
      }

      latlngs.forEach((point) => bounds.extend(point))
      if (isSelected) {
        L.circleMarker(latlngs[0], {
          radius: 6,
          color: MODE_COLOR[leg.mode],
          weight: 2,
          fillColor: '#fff',
          fillOpacity: 1,
        }).addTo(group)
      }
    })

    const waypointKeys = new Set<string>()
    const waypoints = [...shipment.legs.map((leg) => leg.from), shipment.legs[shipment.legs.length - 1].to]
    for (const waypoint of waypoints) {
      const key = `${waypoint.name}-${waypoint.lat}-${waypoint.lng}`
      if (waypointKeys.has(key)) continue
      waypointKeys.add(key)
      L.circleMarker([waypoint.lat, waypoint.lng], {
        radius: 5,
        color: '#0b2239',
        weight: 1.5,
        fillColor: waypoint.kind === 'consignee' ? '#0b2239' : '#ffffff',
        fillOpacity: 1,
      })
        .bindTooltip(
          `<strong>${waypoint.name}</strong>${waypoint.code ? ` · ${waypoint.code}` : ''}<br/>${
            waypoint.kind === 'warehouse'
              ? 'Kho'
              : waypoint.kind === 'port'
                ? 'Cảng biển'
                : waypoint.kind === 'airport'
                  ? 'Sân bay'
                  : waypoint.kind === 'hub'
                    ? 'Trung chuyển'
                    : 'Điểm giao'
          }`,
          { direction: 'top', offset: [0, -6] },
        )
        .addTo(group)
    }

    if (!fittedRef.current.startsWith(shipment.id)) {
      fittedRef.current = shipment.id
      if (fitTimerRef.current) window.clearTimeout(fitTimerRef.current)
      fitTimerRef.current = window.setTimeout(() => {
        if (mapRef.current !== map || !map.getContainer().isConnected) return
        try {
          map.invalidateSize()
          map.fitBounds(bounds.pad(0.16), { animate: false })
        } catch {
          /* the map can be torn down by React StrictMode before this frame runs */
        }
      }, 150)
    }
  }, [shipment, journey, selectedLegId, minuteBucket, onSelectLeg])

  // Deep-link from an alert notification zooms to the affected leg instead of the whole journey.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !focusLegId) return
    const leg = shipment.legs.find((item) => item.id === focusLegId)
    if (!leg) return
    const timer = window.setTimeout(() => {
      if (mapRef.current !== map || !map.getContainer().isConnected) return
      try {
        const bounds = L.latLngBounds(
          leg.path.map((point) => [point.lat, point.lng] as [number, number]),
        )
        map.invalidateSize()
        map.fitBounds(bounds.pad(0.4), { animate: false, maxZoom: 7 })
      } catch {
        /* the map can be torn down by React StrictMode before this frame runs */
      }
    }, 380)
    return () => window.clearTimeout(timer)
  }, [focusLegId, shipment.legs])

  // Vehicle marker — updated independently so the route layers are not rebuilt each frame
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const modeColor = MODE_COLOR[snapshot.mode]
    const icon = L.divIcon({
      className: '',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      html: `<div style="position:relative;width:22px;height:22px;">
        <div style="position:absolute;inset:0;border-radius:50%;background:${modeColor};opacity:.22;"></div>
        <div style="position:absolute;left:5px;top:5px;width:12px;height:12px;border-radius:50%;background:${modeColor};border:2.5px solid #fff;box-shadow:0 1px 4px rgba(11,34,57,.35);"></div>
      </div>`,
    })
    if (!vehicleRef.current) {
      vehicleRef.current = L.marker([snapshot.point.lat, snapshot.point.lng], {
        icon,
        zIndexOffset: 800,
        keyboard: false,
      })
        .bindTooltip('Vị trí mô phỏng hiện tại', { direction: 'top', offset: [0, -10] })
        .addTo(map)
    } else {
      vehicleRef.current.setLatLng([snapshot.point.lat, snapshot.point.lng])
      vehicleRef.current.setIcon(icon)
    }
  }, [snapshot.point.lat, snapshot.point.lng, snapshot.mode])

  return (
    <div className={styles.mapCard}>
      <div ref={containerRef} className={styles.map} aria-label="Bản đồ hành trình lô hàng" />
      <span className={styles.mapChip}>
        <span className={styles.mapChipDot} />
        Bản đồ mô phỏng · không phải GPS thật
      </span>
      <div className={styles.legend} aria-label="Chú giải bản đồ">
        <p className={styles.legendTitle}>Phương thức vận tải</p>
        <div className={styles.legendRows}>
          <span className={styles.legendRow}>
            <span className={styles.legendLine} style={{ borderTopColor: MODE_COLOR.road }} /> Đường bộ
          </span>
          <span className={styles.legendRow}>
            <span className={styles.legendLine} style={{ borderTopColor: MODE_COLOR.ocean }} /> Đường biển
          </span>
          <span className={styles.legendRow}>
            <span className={styles.legendLine} style={{ borderTopColor: MODE_COLOR.air }} /> Hàng không
          </span>
          <span className={styles.legendRow}>
            <span className={styles.legendLine} style={{ borderTopColor: MODE_COLOR.rail }} /> Đường sắt
          </span>
          <span className={styles.legendRow}>
            <span
              className={`${styles.legendLine} ${styles.legendLinePlanned}`}
              style={{ borderTopColor: '#7e93a4' }}
            />{' '}
            Tuyến dự kiến
          </span>
          <span className={styles.legendRow}>
            <span className={styles.legendLine} style={{ borderTopColor: '#0b2239' }} /> Đã đi (mô phỏng)
          </span>
          <span className={styles.legendRow}>
            <span className={styles.legendLine} style={{ borderTopColor: '#b4761a' }} /> Chậm trễ
          </span>
          <span className={styles.legendRow}>
            <span className={styles.legendLine} style={{ borderTopColor: '#a32217' }} /> Sự cố/đóng
          </span>
        </div>
      </div>
    </div>
  )
}
