import { useEffect, useRef, useState } from 'react'
import type { ParamDef } from '../../engine/types'
import { METRICS, type MetricKey } from './labUtils'

export function AxisSelect({
  label,
  value,
  options,
  exclude,
  onChange,
}: {
  label: string
  value: string | undefined
  options: ParamDef[]
  exclude?: string
  onChange: (key: string) => void
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-gray-400">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-gray-900 border border-gray-700 rounded px-1.5 py-1 text-xs text-gray-300"
      >
        {options
          .filter((p) => p.key !== exclude)
          .map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
      </select>
    </label>
  )
}

export function MetricPicker({ value, onChange }: { value: MetricKey; onChange: (m: MetricKey) => void }) {
  return (
    <div className="flex rounded-lg border border-gray-800 overflow-hidden">
      {METRICS.map((m) => (
        <button
          key={m.key}
          onClick={() => onChange(m.key)}
          className={`px-2 py-1 text-xs ${
            m.key === value ? 'bg-blue-500/15 text-blue-300' : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  )
}

export function RunButton({
  onClick,
  progress,
  label = 'Run',
}: {
  onClick: () => void
  progress: number | null // 0..1 while running
  label?: string
}) {
  const running = progress != null
  return (
    <button
      onClick={onClick}
      disabled={running}
      className={`text-xs rounded px-3 py-1.5 font-medium ${
        running ? 'bg-gray-800 text-gray-500' : 'bg-blue-600 hover:bg-blue-500 text-white'
      }`}
    >
      {running ? `Running… ${Math.round(progress * 100)}%` : label}
    </button>
  )
}

/** Shown when a panel's results were invalidated by an input change. */
export function StaleNote({ show }: { show: boolean }) {
  if (!show) return null
  return <span className="text-[10px] text-amber-400/80">inputs changed — results cleared, re-run</span>
}

export function Stat({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'good' | 'bad' | 'neutral' }) {
  const color = tone === 'good' ? 'text-green-400' : tone === 'bad' ? 'text-red-400' : 'text-gray-200'
  return (
    <div className="bg-gray-950 rounded-lg border border-gray-800 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`font-mono text-sm tabular-nums ${color}`}>{value}</div>
    </div>
  )
}

/**
 * Canvas histogram: single-series distribution with an optional marker line
 * ("you are here") and hover tooltip per bin.
 */
export function Histogram({
  values,
  marker,
  markerLabel = 'this strategy',
  format,
  height = 140,
  bins: binCount = 40,
}: {
  values: number[]
  marker?: number
  markerLabel?: string
  format: (v: number) => string
  height?: number
  bins?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<{ x: number; text: string } | null>(null)
  const geom = useRef<{ min: number; max: number; counts: number[]; maxCount: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap || values.length === 0) return

    const draw = () => {
      const w = wrap.clientWidth
      const h = height
      const dpr = window.devicePixelRatio || 1
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const ctx = canvas.getContext('2d')!
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, w, h)

      let min = Math.min(...values)
      let max = Math.max(...values)
      if (marker != null) {
        min = Math.min(min, marker)
        max = Math.max(max, marker)
      }
      if (min === max) {
        min -= 1
        max += 1
      }
      const pad = (max - min) * 0.03
      min -= pad
      max += pad

      const counts = new Array<number>(binCount).fill(0)
      for (const v of values) {
        const b = Math.min(binCount - 1, Math.floor(((v - min) / (max - min)) * binCount))
        counts[b]++
      }
      const maxCount = Math.max(...counts)
      geom.current = { min, max, counts, maxCount }

      const plotTop = 16
      const plotBottom = h - 16
      const barW = w / binCount
      ctx.fillStyle = 'rgba(96,165,250,0.75)'
      for (let b = 0; b < binCount; b++) {
        if (counts[b] === 0) continue
        const bh = ((plotBottom - plotTop) * counts[b]) / maxCount
        ctx.beginPath()
        ctx.roundRect(b * barW + 1, plotBottom - bh, Math.max(barW - 2, 1), bh, 2)
        ctx.fill()
      }

      // axis extents
      ctx.fillStyle = '#6b7280'
      ctx.font = '10px ui-monospace, monospace'
      ctx.textAlign = 'left'
      ctx.fillText(format(min), 2, h - 4)
      ctx.textAlign = 'right'
      ctx.fillText(format(max), w - 2, h - 4)

      // marker
      if (marker != null) {
        const mx = ((marker - min) / (max - min)) * w
        ctx.strokeStyle = '#f59e0b'
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 3])
        ctx.beginPath()
        ctx.moveTo(mx, plotTop - 4)
        ctx.lineTo(mx, plotBottom)
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = '#f59e0b'
        ctx.font = '10px ui-sans-serif, sans-serif'
        ctx.textAlign = mx > w / 2 ? 'right' : 'left'
        ctx.fillText(`▼ ${markerLabel} ${format(marker)}`, mx + (mx > w / 2 ? -4 : 4), 10)
      }
    }

    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [values, marker, markerLabel, format, height, binCount])

  const onMove = (e: React.MouseEvent) => {
    const g = geom.current
    const wrap = wrapRef.current
    if (!g || !wrap) return
    const rect = wrap.getBoundingClientRect()
    const x = e.clientX - rect.left
    const b = Math.max(0, Math.min(g.counts.length - 1, Math.floor((x / rect.width) * g.counts.length)))
    const lo = g.min + ((g.max - g.min) * b) / g.counts.length
    const hi = g.min + ((g.max - g.min) * (b + 1)) / g.counts.length
    setTip({ x: Math.min(x + 8, rect.width - 150), text: `${format(lo)} – ${format(hi)}: ${g.counts[b]} runs` })
  }

  if (values.length === 0) return null
  return (
    <div ref={wrapRef} className="relative" onMouseMove={onMove} onMouseLeave={() => setTip(null)}>
      <canvas ref={canvasRef} />
      {tip && (
        <div
          className="absolute top-0 pointer-events-none bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[10px] text-gray-200 font-mono whitespace-nowrap"
          style={{ left: tip.x }}
        >
          {tip.text}
        </div>
      )}
    </div>
  )
}
