import { useEffect, useRef, useState } from 'react'
import type { Metrics } from '../../engine/types'
import { runBacktest } from '../../engine/engine'
import { gridValues, mapChunked } from '../../engine/lab'
import { useBacktestStore } from '../../store'
import { AxisSelect, Histogram, MetricPicker, RunButton, StaleNote } from './labCommon'
import { fmtMetric, heatColor, useActiveStrategy, useComputed, useParamAxes, type MetricKey } from './labUtils'

interface Grid {
  xKey: string
  yKey: string
  xLabel: string
  yLabel: string
  xs: number[]
  ys: number[]
  cells: (Metrics | null)[][] // [yi][xi]
}

const MARGIN = { left: 44, bottom: 26, top: 4, right: 4 }
const HEIGHT = 300

export function SweepPanel() {
  const bars = useBacktestStore((s) => s.bars)
  const strategyId = useBacktestStore((s) => s.strategyId)
  const params = useBacktestStore((s) => s.params)
  const capital = useBacktestStore((s) => s.capital)
  const settings = useBacktestStore((s) => s.settings)
  const setParams = useBacktestStore((s) => s.setParams)
  const strategy = useActiveStrategy()

  const { numeric, x, y, setXKey, setYKey } = useParamAxes(strategy?.params ?? [])
  const [metric, setMetric] = useState<MetricKey>('sharpe')
  const [grid, setGrid, gridStale] = useComputed<Grid>([strategyId, bars, settings, capital])
  const [progress, setProgress] = useState<number | null>(null)
  const [tip, setTip] = useState<{ px: number; py: number; text: string } | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  // draw the heatmap
  useEffect(() => {
    const canvas = canvasRef.current
    const wrap = wrapRef.current
    if (!canvas || !wrap || !grid) return
    const draw = () => {
      const w = wrap.clientWidth
      const h = HEIGHT
      const dpr = window.devicePixelRatio || 1
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const ctx = canvas.getContext('2d')!
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, w, h)

      const vals = grid.cells.flat().map((m) => (m ? m[metric] : NaN)).filter(Number.isFinite)
      if (vals.length === 0) return
      const min = Math.min(...vals)
      const max = Math.max(...vals)
      const plotW = w - MARGIN.left - MARGIN.right
      const plotH = h - MARGIN.top - MARGIN.bottom
      const cw = plotW / grid.xs.length
      const ch = plotH / grid.ys.length

      grid.ys.forEach((_, yi) =>
        grid.xs.forEach((_, xi) => {
          const m = grid.cells[yi][xi]
          const v = m ? m[metric] : NaN
          ctx.fillStyle = Number.isFinite(v) ? heatColor(max > min ? (v - min) / (max - min) : 0.5) : '#111827'
          // y axis grows upward: last row at the top
          const px = MARGIN.left + xi * cw
          const py = MARGIN.top + (grid.ys.length - 1 - yi) * ch
          ctx.fillRect(px + 0.5, py + 0.5, cw - 1, ch - 1)
        }),
      )

      // axis tick labels (first / mid / last)
      ctx.fillStyle = '#6b7280'
      ctx.font = '10px ui-monospace, monospace'
      ctx.textAlign = 'center'
      for (const xi of [0, Math.floor(grid.xs.length / 2), grid.xs.length - 1]) {
        ctx.fillText(String(grid.xs[xi]), MARGIN.left + xi * cw + cw / 2, h - MARGIN.bottom + 12)
      }
      ctx.textAlign = 'right'
      for (const yi of [0, Math.floor(grid.ys.length / 2), grid.ys.length - 1]) {
        const py = MARGIN.top + (grid.ys.length - 1 - yi) * ch + ch / 2 + 3
        ctx.fillText(String(grid.ys[yi]), MARGIN.left - 6, py)
      }
      ctx.textAlign = 'center'
      ctx.fillStyle = '#9ca3af'
      ctx.font = '10px ui-sans-serif, sans-serif'
      ctx.fillText(grid.xLabel, MARGIN.left + plotW / 2, h - 4)
      ctx.save()
      ctx.translate(10, MARGIN.top + plotH / 2)
      ctx.rotate(-Math.PI / 2)
      ctx.fillText(grid.yLabel, 0, 0)
      ctx.restore()
    }
    draw()
    const ro = new ResizeObserver(draw)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [grid, metric])

  if (!strategy || numeric.length < 2 || !x || !y) {
    return (
      <p className="text-xs text-gray-500 p-1">
        The sweep needs a strategy with two numeric parameters — try MA Crossover, Donchian, RSI, MACD or
        Bollinger.
      </p>
    )
  }

  const run = async () => {
    if (!bars) return
    setProgress(0)
    const base = { ...Object.fromEntries(strategy.params.map((p) => [p.key, p.default])), ...(params[strategyId] ?? {}) }
    const xs = gridValues(x, 18)
    const ys = gridValues(y, 18)
    const combos: { xi: number; yi: number }[] = []
    ys.forEach((_, yi) => xs.forEach((_, xi) => combos.push({ xi, yi })))
    const flat = await mapChunked(
      combos,
      ({ xi, yi }) => {
        try {
          return runBacktest(bars, strategy, { ...base, [x.key]: xs[xi], [y.key]: ys[yi] }, capital, settings).metrics
        } catch {
          return null
        }
      },
      (done, total) => setProgress(done / total),
    )
    const cells: (Metrics | null)[][] = ys.map((_, yi) => xs.map((_, xi) => flat[yi * xs.length + xi]))
    setGrid({ xKey: x.key, yKey: y.key, xLabel: x.label, yLabel: y.label, xs, ys, cells })
    setProgress(null)
  }

  const cellAt = (e: React.MouseEvent): { xi: number; yi: number; rect: DOMRect } | null => {
    const wrap = wrapRef.current
    if (!wrap || !grid) return null
    const rect = wrap.getBoundingClientRect()
    const px = e.clientX - rect.left - MARGIN.left
    const py = e.clientY - rect.top - MARGIN.top
    const plotW = rect.width - MARGIN.left - MARGIN.right
    const plotH = HEIGHT - MARGIN.top - MARGIN.bottom
    if (px < 0 || py < 0 || px >= plotW || py >= plotH) return null
    const xi = Math.floor((px / plotW) * grid.xs.length)
    const yi = grid.ys.length - 1 - Math.floor((py / plotH) * grid.ys.length)
    return { xi, yi, rect }
  }

  const values = grid ? grid.cells.flat().map((m) => (m ? m[metric] : NaN)).filter(Number.isFinite) : []
  const current = params[strategyId] ?? {}
  let currentMetric: number | undefined
  if (grid) {
    const xi = grid.xs.indexOf(current[grid.xKey])
    const yi = grid.ys.indexOf(current[grid.yKey])
    if (xi >= 0 && yi >= 0) currentMetric = grid.cells[yi][xi]?.[metric]
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 leading-relaxed">
        Every combination of two parameters, one backtest per cell — brighter is better. A{' '}
        <span className="text-gray-300">broad bright plateau</span> means the edge is robust; a{' '}
        <span className="text-gray-300">lone bright pixel</span> means you found noise. Pick from the middle
        of a plateau, not the single best cell. Click a cell to load it into the replay.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <AxisSelect label="x" value={x.key} options={numeric} exclude={y.key} onChange={setXKey} />
        <AxisSelect label="y" value={y.key} options={numeric} exclude={x.key} onChange={setYKey} />
        <MetricPicker value={metric} onChange={setMetric} />
        <RunButton onClick={() => void run()} progress={progress} label="Run sweep" />
        <StaleNote show={gridStale} />
        {grid && (
          <span className="text-[10px] text-gray-500">
            {grid.xs.length}×{grid.ys.length} = {grid.xs.length * grid.ys.length} backtests
          </span>
        )}
      </div>
      {grid && (
        <>
          <div
            ref={wrapRef}
            className="relative cursor-crosshair"
            onMouseMove={(e) => {
              const c = cellAt(e)
              if (!c) return setTip(null)
              const m = grid.cells[c.yi][c.xi]
              setTip({
                px: Math.min(e.clientX - c.rect.left + 10, c.rect.width - 220),
                py: e.clientY - c.rect.top - 28,
                text: m
                  ? `${grid.xLabel} ${grid.xs[c.xi]} · ${grid.yLabel} ${grid.ys[c.yi]} → ${fmtMetric(metric, m[metric])}`
                  : 'failed run',
              })
            }}
            onMouseLeave={() => setTip(null)}
            onClick={(e) => {
              const c = cellAt(e)
              if (c) setParams({ [grid.xKey]: grid.xs[c.xi], [grid.yKey]: grid.ys[c.yi] })
            }}
          >
            <canvas ref={canvasRef} />
            {tip && (
              <div
                className="absolute pointer-events-none bg-gray-800 border border-gray-700 rounded px-2 py-1 text-[10px] text-gray-200 font-mono whitespace-nowrap z-10"
                style={{ left: tip.px, top: tip.py }}
              >
                {tip.text}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-mono text-gray-500">
            <span>{values.length ? fmtMetric(metric, Math.min(...values)) : ''}</span>
            <span
              className="h-2 w-40 rounded"
              style={{
                background: 'linear-gradient(to right, rgb(15,23,42), rgb(37,99,235), rgb(191,219,254))',
              }}
            />
            <span>{values.length ? fmtMetric(metric, Math.max(...values)) : ''}</span>
            <span className="text-gray-600 font-sans">brighter = better · scale is this grid's range, not absolute</span>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
              Distribution of all {values.length} runs
              {currentMetric != null && Number.isFinite(currentMetric) ? ' — your current setting marked' : ''}
            </div>
            <Histogram
              values={values}
              marker={Number.isFinite(currentMetric ?? NaN) ? currentMetric : undefined}
              markerLabel="current params"
              format={(v) => fmtMetric(metric, v)}
              height={110}
              bins={32}
            />
          </div>
        </>
      )}
    </div>
  )
}
