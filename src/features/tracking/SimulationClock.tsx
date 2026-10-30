import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pause,
  Play,
} from 'lucide-react'
import styles from './TrackingPage.module.css'
import type { Journey } from '../../sim/types'
import { clampToWindow } from '../../sim/engine'
import { dateLabel, timeLabel } from '../../utils/date'

interface SimulationClockProps {
  journey: Journey
  simTime: number
  onChange: (time: number) => void
  playing: boolean
  onTogglePlay: () => void
  speed: number
  onSpeedChange: (speed: number) => void
}

const HOUR = 3_600_000
const SIZE = 158
const CENTER = SIZE / 2

export function SimulationClock({
  journey,
  simTime,
  onChange,
  playing,
  onTogglePlay,
  speed,
  onSpeedChange,
}: SimulationClockProps) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const draggingRef = useRef(false)
  const date = new Date(simTime)
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const hourAngle = ((hours % 12) / 12) * 360 + (minutes / 60) * 30
  const minuteAngle = (minutes / 60) * 360
  const progress = Math.max(
    0,
    Math.min(
      1,
      (simTime - journey.plannedStart) /
        Math.max(1, journey.projectedEnd - journey.plannedStart),
    ),
  )

  const moveHand = (clientX: number, clientY: number) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const dx = clientX - (rect.left + rect.width / 2)
    const dy = clientY - (rect.top + rect.height / 2)
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI
    const clockDeg = (angle + 90 + 360) % 360
    const totalMinutes = Math.round(((clockDeg / 360) * 720) / 5) * 5
    const next = new Date(simTime)
    const isPm = next.getHours() >= 12
    const hour12 = Math.floor((totalMinutes % 720) / 60)
    next.setHours(hour12 + (isPm ? 12 : 0), totalMinutes % 60, 0, 0)
    onChange(clampToWindow(journey, next.getTime()))
  }

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    draggingRef.current = true
    event.currentTarget.setPointerCapture(event.pointerId)
    moveHand(event.clientX, event.clientY)
  }

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!draggingRef.current) return
    moveHand(event.clientX, event.clientY)
  }

  const handlePointerUp = () => {
    draggingRef.current = false
  }

  const circumference = 2 * Math.PI * 62
  const shift = (ms: number) => onChange(clampToWindow(journey, simTime + ms))

  return (
    <section className={`card ${styles.clockCard}`} aria-label="Đồng hồ mô phỏng">
      <div className={styles.panelHead}>
        <p className={styles.panelTitle}>Đồng hồ mô phỏng</p>
        <span className={styles.clockBadge}>giờ mô phỏng ≠ giờ máy</span>
      </div>
      <div className={styles.clockBody}>
        <div className={styles.clockTop}>
          <div>
            <p className={styles.clockDate}>{dateLabel(simTime)}</p>
            <p className={styles.clockTime} aria-live="polite">
              {timeLabel(simTime)}
            </p>
          </div>
          <span className="badge badgeWarning">giả lập</span>
        </div>

        <div className={styles.clockFaceWrap}>
          <svg
            ref={svgRef}
            className={styles.clockSvg}
            viewBox={`0 0 ${SIZE} ${SIZE}`}
            role="slider"
            tabIndex={0}
            aria-label="Kim đồng hồ mô phỏng — kéo để đổi giờ"
            aria-valuemin={journey.windowStart}
            aria-valuemax={journey.windowEnd}
            aria-valuenow={simTime}
            aria-valuetext={`${timeLabel(simTime)} ${dateLabel(simTime)}`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') shift(15 * 60_000)
              if (event.key === 'ArrowLeft') shift(-15 * 60_000)
            }}
          >
            <circle cx={CENTER} cy={CENTER} r={70} fill="#ffffff" stroke="#e1e7ec" />
            <circle cx={CENTER} cy={CENTER} r={62} fill="none" stroke="#edf2f6" strokeWidth={6} />
            <circle
              cx={CENTER}
              cy={CENTER}
              r={62}
              fill="none"
              stroke="#0c7c8a"
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={`${circumference * progress} ${circumference}`}
              transform={`rotate(-90 ${CENTER} ${CENTER})`}
              opacity={0.35}
            />
            {Array.from({ length: 12 }).map((_, index) => {
              const angle = (index / 12) * 360
              const rad = ((angle - 90) * Math.PI) / 180
              const outer = 57
              const inner = index % 3 === 0 ? 50 : 54
              return (
                <line
                  key={angle}
                  x1={CENTER + Math.cos(rad) * inner}
                  y1={CENTER + Math.sin(rad) * inner}
                  x2={CENTER + Math.cos(rad) * outer}
                  y2={CENTER + Math.sin(rad) * outer}
                  stroke={index % 3 === 0 ? '#5b7085' : '#c2d0da'}
                  strokeWidth={index % 3 === 0 ? 2 : 1}
                />
              )
            })}
            {[
              { label: '12', x: 0, y: -38 },
              { label: '3', x: 38, y: 0 },
              { label: '6', x: 0, y: 38 },
              { label: '9', x: -38, y: 0 },
            ].map((marker) => (
              <text
                key={marker.label}
                x={CENTER + marker.x}
                y={CENTER + marker.y + 3.5}
                textAnchor="middle"
                fontSize="9"
                fill="#7c8f9d"
                fontFamily="IBM Plex Mono, monospace"
              >
                {marker.label}
              </text>
            ))}
            <line
              x1={CENTER}
              y1={CENTER}
              x2={CENTER + Math.sin((hourAngle * Math.PI) / 180) * 32}
              y2={CENTER - Math.cos((hourAngle * Math.PI) / 180) * 32}
              stroke="#0b2239"
              strokeWidth={4.5}
              strokeLinecap="round"
            />
            <line
              x1={CENTER}
              y1={CENTER}
              x2={CENTER + Math.sin((minuteAngle * Math.PI) / 180) * 48}
              y2={CENTER - Math.cos((minuteAngle * Math.PI) / 180) * 48}
              stroke="#0c7c8a"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <circle cx={CENTER} cy={CENTER} r={5} fill="#0b2239" />
            <circle cx={CENTER} cy={CENTER} r={2} fill="#ffffff" />
          </svg>
        </div>

        <div className={styles.transport}>
          <button
            type="button"
            className={styles.transportButton}
            aria-label="Lùi một ngày mô phỏng"
            title="Lùi 1 ngày"
            onClick={() => shift(-24 * HOUR)}
          >
            <ChevronsLeft size={15} />
          </button>
          <button
            type="button"
            className={styles.transportButton}
            aria-label="Lùi một giờ mô phỏng"
            title="Lùi 1 giờ"
            onClick={() => shift(-HOUR)}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            className={`${styles.transportButton} ${styles.playButton}`}
            aria-label={playing ? 'Tạm dừng mô phỏng' : 'Phát mô phỏng'}
            onClick={onTogglePlay}
          >
            {playing ? <Pause size={15} /> : <Play size={15} />}
          </button>
          <button
            type="button"
            className={styles.transportButton}
            aria-label="Tiến một giờ mô phỏng"
            title="Tới 1 giờ"
            onClick={() => shift(HOUR)}
          >
            <ChevronRight size={15} />
          </button>
          <button
            type="button"
            className={styles.transportButton}
            aria-label="Tiến một ngày mô phỏng"
            title="Tới 1 ngày"
            onClick={() => shift(24 * HOUR)}
          >
            <ChevronsRight size={15} />
          </button>
          <select
            className={styles.speedSelect}
            aria-label="Tỷ lệ thời gian mô phỏng"
            value={speed}
            onChange={(event) => onSpeedChange(Number(event.target.value))}
          >
            <option value={1}>1×</option>
            <option value={60}>60×</option>
            <option value={600}>600×</option>
            <option value={3600}>3600×</option>
          </select>
        </div>

        <div className={styles.timelineWrap}>
          <label htmlFor="sim-timeline" className="srOnly">
            Chọn thời điểm mô phỏng
          </label>
          <input
            id="sim-timeline"
            className={styles.timeline}
            type="range"
            min={journey.windowStart}
            max={journey.windowEnd}
            step={60_000}
            value={simTime}
            onChange={(event) => onChange(Number(event.target.value))}
          />
          <div className={styles.timelineLabels}>
            <span>{dateLabel(journey.windowStart)}</span>
            <span>{dateLabel(journey.windowEnd)}</span>
          </div>
        </div>

        <p className={styles.simNote}>
          Tua ngược thời gian sẽ khôi phục đúng vị trí, vận tốc, ETA và cảnh báo tại thời điểm đó.
          Tỷ lệ hiện tại: 1 giây thực ≈ {Math.round((speed / 60) * 10) / 10} phút mô phỏng.
        </p>
      </div>
    </section>
  )
}
