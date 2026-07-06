import { useEffect, useMemo, useRef } from 'react'
import { AreaSeries, type ISeriesApi } from 'lightweight-charts'
import type { BacktestResult } from '../engine/types'
import { useChart, toTime } from './useChart'
import { useCursorLine } from './useTimeRegions'

/** Underwater plot: % below the running equity peak, revealed with the tape. */
export function DrawdownChart({ result, cursor }: { result: BacktestResult; cursor: number }) {
  const { containerRef, chart } = useChart({
    localization: { priceFormatter: (p: number) => `${p.toFixed(0)}%` },
    timeScale: { visible: false },
  })
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)
  const prevCursor = useRef(-1)
  useCursorLine(chart, containerRef, cursor)

  // growth index for DCA so contributions don't mask drawdowns
  const dd = useMemo(() => {
    const { equity, contributed } = result
    const eq = contributed ? equity.map((e, i) => (contributed[i] > 0 ? e / contributed[i] : 0)) : equity
    const out = new Array<number>(eq.length).fill(0)
    let peak = 0
    for (let i = 0; i < eq.length; i++) {
      if (eq[i] > peak) peak = eq[i]
      out[i] = peak > 0 ? (eq[i] / peak - 1) * 100 : 0
    }
    return out
  }, [result])

  useEffect(() => {
    if (!chart) return
    const s = chart.addSeries(AreaSeries, {
      lineColor: '#f87171',
      topColor: 'rgba(248,113,113,0.02)',
      bottomColor: 'rgba(248,113,113,0.25)',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: true,
      invertFilledArea: false,
    })
    seriesRef.current = s
    prevCursor.current = -1
    return () => {
      seriesRef.current = null
      try {
        chart.removeSeries(s)
      } catch {
        // chart already disposed
      }
    }
  }, [chart, result])

  useEffect(() => {
    const s = seriesRef.current
    if (!chart || !s) return
    if (cursor === prevCursor.current) return
    const { bars } = result
    s.setData(
      bars.map((b, i) => (i <= cursor ? { time: toTime(b.t), value: dd[i] } : { time: toTime(b.t) })),
    )
    // setData scrolls to the newest point (whitespace far right) — re-pin
    chart.timeScale().fitContent()
    prevCursor.current = cursor
  }, [chart, result, dd, cursor])

  const worst = Math.min(...dd.slice(0, cursor + 1))
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-2">
      <div className="px-1 pb-1 text-[10px] uppercase tracking-wide text-gray-500">
        Drawdown from peak — worst so far {worst.toFixed(1)}%
      </div>
      <div ref={containerRef} className="relative h-[90px]" />
    </div>
  )
}
