import { useEffect, useRef, useState } from 'react'
import manifest from '../../../../data/ohlc/index.json'
import type { Metrics } from '../../engine/types'
import { runBacktest } from '../../engine/engine'
import { useBacktestStore, loadBars } from '../../store'
import { RunButton } from './labCommon'
import { useActiveStrategy, useComputed } from './labUtils'
import { defaultParams } from '../../engine/strategies'
import { fmtPct } from '../../../../lib/format'

interface Row {
  ticker: string
  name: string
  metrics: Metrics
  bench: Metrics
  equity: number[]
  benchmark: number[]
}

const TICKERS = manifest as { ticker: string; name: string }[]

function Sparkline({ equity, benchmark }: { equity: number[]; benchmark: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    const dpr = window.devicePixelRatio || 1
    canvas.width = w * dpr
    canvas.height = h * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    // log scale so early history isn't flattened by late compounding
    const all = [...equity, ...benchmark].filter((v) => v > 0)
    const lmin = Math.log(Math.min(...all))
    const lmax = Math.log(Math.max(...all))
    const line = (arr: number[], color: string, width: number) => {
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.beginPath()
      let started = false
      const step = Math.max(1, Math.floor(arr.length / w)) // ~1 point per px
      for (let i = 0; i < arr.length; i += step) {
        if (arr[i] <= 0) continue
        const x = (i / (arr.length - 1)) * w
        const y = h - ((Math.log(arr[i]) - lmin) / (lmax - lmin || 1)) * (h - 4) - 2
        if (!started) {
          ctx.moveTo(x, y)
          started = true
        } else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    line(benchmark, '#6b7280', 1)
    line(equity, '#60a5fa', 1.5)
  }, [equity, benchmark])
  return <canvas ref={ref} className="w-full h-12" />
}

export function TickerScorecard() {
  const capital = useBacktestStore((s) => s.capital)
  const settings = useBacktestStore((s) => s.settings)
  const params = useBacktestStore((s) => s.params)
  const strategyId = useBacktestStore((s) => s.strategyId)
  const strategy = useActiveStrategy()
  const [rows, setRows] = useComputed<Row[]>([strategyId, params, settings, capital])
  const [progress, setProgress] = useState<number | null>(null)

  if (!strategy) return <p className="text-xs text-gray-500 p-1">Fix the custom strategy code first.</p>

  const run = async () => {
    setProgress(0)
    const p = { ...defaultParams(strategy), ...(params[strategyId] ?? {}) }
    const out: Row[] = []
    for (let i = 0; i < TICKERS.length; i++) {
      const t = TICKERS[i]
      const bars = await loadBars(t.ticker)
      if (bars) {
        try {
          const r = runBacktest(bars, strategy, p, capital, settings)
          out.push({
            ticker: t.ticker,
            name: t.name,
            metrics: r.metrics,
            bench: r.benchMetrics,
            equity: r.equity,
            benchmark: r.benchmark,
          })
        } catch {
          // skip tickers the strategy can't run on
        }
      }
      setProgress((i + 1) / TICKERS.length)
      await new Promise((r) => setTimeout(r, 0))
    }
    setRows(out)
    setProgress(null)
  }

  const beats = rows?.filter((r) => r.metrics.cagr > r.bench.cagr).length ?? 0

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 leading-relaxed">
        The same strategy and parameters on every bundled ticker. A real edge survives a change of asset; a
        curve-fit one worked on exactly one chart.
      </p>
      <div className="flex items-center gap-3">
        <RunButton onClick={() => void run()} progress={progress} label="Run on all tickers" />
        {rows && (
          <span className={`text-xs ${beats >= rows.length / 2 ? 'text-green-400' : 'text-red-400'}`}>
            beats buy &amp; hold on {beats} of {rows.length}
          </span>
        )}
      </div>
      {rows && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {rows.map((r) => {
            const win = r.metrics.cagr > r.bench.cagr
            return (
              <div key={r.ticker} className="bg-gray-950 rounded-lg border border-gray-800 p-2 space-y-1">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-gray-100">{r.ticker}</span>
                  <span className={`text-xs font-mono ${win ? 'text-green-400' : 'text-red-400'}`}>
                    {fmtPct(r.metrics.cagr)} vs {fmtPct(r.bench.cagr)}
                  </span>
                </div>
                <Sparkline equity={r.equity} benchmark={r.benchmark} />
                <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                  <span>Sharpe {r.metrics.sharpe.toFixed(2)}</span>
                  <span>DD {fmtPct(r.metrics.maxDrawdown, 0)}</span>
                  <span>{r.metrics.numTrades} trades</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {rows && (
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-wide text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-blue-400" /> strategy
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block w-3 h-0.5 bg-gray-500" /> buy &amp; hold
          </span>
          <span className="normal-case">log scale</span>
        </div>
      )}
    </div>
  )
}
