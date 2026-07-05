import { useEffect, useRef } from 'react'
import { LineSeries, type ISeriesApi } from 'lightweight-charts'
import type { BacktestResult } from '../engine/types'
import { useChart, toTime } from './useChart'

/** Compact RSI pane with buy/sell threshold guides, shown under the price chart. */
export function RsiStrip({ result, cursor }: { result: BacktestResult; cursor: number }) {
  const { containerRef, chart } = useChart({
    rightPriceScale: { borderColor: '#374151' },
    timeScale: { visible: false },
  })
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const prevCursor = useRef(-1)

  const rsi = result.run.rsi

  useEffect(() => {
    if (!chart || !rsi) return
    const s = chart.addSeries(LineSeries, {
      color: '#a78bfa',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: true,
      autoscaleInfoProvider: () => ({ priceRange: { minValue: 0, maxValue: 100 } }),
    })
    for (const level of [rsi.buyBelow, rsi.sellAbove]) {
      s.createPriceLine({
        price: level,
        color: '#374151',
        lineWidth: 1,
        lineStyle: 2, // dashed
        axisLabelVisible: true,
        title: '',
      })
    }
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
  }, [chart, rsi])

  useEffect(() => {
    const s = seriesRef.current
    if (!chart || !s || !rsi) return
    const { bars } = result
    const toPoint = (i: number) =>
      rsi.values[i] == null ? { time: toTime(bars[i].t) } : { time: toTime(bars[i].t), value: rsi.values[i]! }

    const prev = prevCursor.current
    if (prev !== -1 && cursor > prev && cursor - prev <= 50) {
      for (let i = prev + 1; i <= cursor; i++) s.update(toPoint(i))
    } else if (cursor !== prev) {
      s.setData(Array.from({ length: cursor + 1 }, (_, i) => toPoint(i)))
    }
    prevCursor.current = cursor
    chart.timeScale().setVisibleLogicalRange({ from: cursor - 200, to: cursor + 5 })
  }, [chart, result, rsi, cursor])

  if (!rsi) return null
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-2">
      <div className="px-1 pb-1 text-[10px] uppercase tracking-wide text-gray-500">
        RSI — buy below {rsi.buyBelow}, sell above {rsi.sellAbove}
      </div>
      <div ref={containerRef} className="h-[80px]" />
    </div>
  )
}
