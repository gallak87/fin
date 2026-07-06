import { useEffect, useRef } from 'react'
import { LineSeries, type ISeriesApi } from 'lightweight-charts'
import type { BacktestResult } from '../engine/types'
import { useChart, toTime } from './useChart'
import { useCursorLine, useTimeRegions, type TimeRegion } from './useTimeRegions'
import { useChartSync } from './chartSync'
import { fmtK } from '../../../lib/format'

export function EquityChart({
  result,
  cursor,
  regions = [],
  overlay,
}: {
  result: BacktestResult
  cursor: number
  regions?: TimeRegion[]
  /** pills/badges floated over the plot area (hero-chart metrics) */
  overlay?: React.ReactNode
}) {
  const { containerRef, chart } = useChart({
    localization: { priceFormatter: (p: number) => fmtK(p) },
  })
  useTimeRegions(chart, containerRef, regions)
  useCursorLine(chart, containerRef, cursor)
  useChartSync(chart)
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
    if (cursor === prevCursor.current) return

    // full-range data with whitespace beyond the cursor keeps the time axis
    // pinned to the whole period instead of sliding as the tape plays.
    // Always rebuild: update(point, true) can't turn a whitespace point into
    // data, so the incremental path silently no-ops during playback.
    const point = (arr: number[], i: number) => ({ time: toTime(bars[i].t), value: arr[i] })
    const points = (arr: number[]) =>
      bars.map((b, i) => (i <= cursor ? point(arr, i) : { time: toTime(b.t) }))
    // setData scrolls to the newest point — preserve the user's zoom across
    // rebuilds, anchor to the full window on a fresh result
    const ts = chart.timeScale()
    const saved = prevCursor.current === -1 ? null : ts.getVisibleLogicalRange()
    strat.setData(points(equity))
    bench.setData(points(benchmark))
    if (saved) ts.setVisibleLogicalRange(saved)
    else ts.fitContent()
    prevCursor.current = cursor
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
      <div className="relative">
        <div ref={containerRef} className="relative h-[240px] sm:h-[280px]" />
        {overlay && <div className="absolute top-1 left-1 right-16 z-10 pointer-events-none">{overlay}</div>}
      </div>
    </div>
  )
}
