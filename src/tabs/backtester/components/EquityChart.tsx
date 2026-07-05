import { useEffect, useRef } from 'react'
import { LineSeries, type ISeriesApi } from 'lightweight-charts'
import type { BacktestResult } from '../engine/types'
import { useChart, toTime } from './useChart'
import { fmtK } from '../../../lib/format'

export function EquityChart({ result, cursor }: { result: BacktestResult; cursor: number }) {
  const { containerRef, chart } = useChart({
    localization: { priceFormatter: (p: number) => fmtK(p) },
  })
  const stratRef = useRef<ISeriesApi<'Line'> | null>(null)
  const benchRef = useRef<ISeriesApi<'Line'> | null>(null)
  const prevCursor = useRef(-1)

  useEffect(() => {
    if (!chart) return
    const strat = chart.addSeries(LineSeries, {
      color: '#60a5fa',
      lineWidth: 2,
      priceLineVisible: false,
      title: 'strategy',
    })
    const bench = chart.addSeries(LineSeries, {
      color: '#6b7280',
      lineWidth: 1,
      lineStyle: 2, // dashed
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
      title: 'buy & hold',
    })
    stratRef.current = strat
    benchRef.current = bench
    prevCursor.current = -1
    return () => {
      stratRef.current = null
      benchRef.current = null
      try {
        chart.removeSeries(strat)
        chart.removeSeries(bench)
      } catch {
        // chart already disposed
      }
    }
  }, [chart, result])

  useEffect(() => {
    const strat = stratRef.current
    const bench = benchRef.current
    if (!chart || !strat || !bench) return
    const { bars, equity, benchmark } = result
    const point = (arr: number[], i: number) => ({ time: toTime(bars[i].t), value: arr[i] })

    const prev = prevCursor.current
    if (prev !== -1 && cursor > prev && cursor - prev <= 50) {
      for (let i = prev + 1; i <= cursor; i++) {
        strat.update(point(equity, i))
        bench.update(point(benchmark, i))
      }
    } else if (cursor !== prev) {
      const idx = Array.from({ length: cursor + 1 }, (_, i) => i)
      strat.setData(idx.map((i) => point(equity, i)))
      bench.setData(idx.map((i) => point(benchmark, i)))
    }
    prevCursor.current = cursor
    chart.timeScale().fitContent()
  }, [chart, result, cursor])

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-2">
      <div className="flex items-center gap-3 px-1 pb-1 text-[10px] uppercase tracking-wide text-gray-500">
        <span>Your strategy vs buy &amp; hold</span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-blue-400" /> strategy
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-gray-500" /> buy &amp; hold
        </span>
      </div>
      <div ref={containerRef} className="h-[200px]" />
    </div>
  )
}
