import { useEffect, useRef } from 'react'
import { LineSeries, type ISeriesApi } from 'lightweight-charts'
import type { BacktestResult } from '../engine/types'
import { useChart, toTime } from './useChart'
import { useChartSync } from './chartSync'

/** Compact oscillator pane (RSI, MACD, ROC, …) with guide lines, under the price chart. */
export function IndicatorStrip({ result, cursor }: { result: BacktestResult; cursor: number }) {
  const { containerRef, chart } = useChart({
    rightPriceScale: { borderColor: '#374151' },
    timeScale: { visible: false, shiftVisibleRangeOnNewBar: false },
  })
  useChartSync(chart)
  const seriesRefs = useRef<ISeriesApi<'Line'>[]>([])
  const prevCursor = useRef(-1)

  const strip = result.run.strip

  useEffect(() => {
    if (!chart || !strip) return
    const series = strip.series.map((s, k) =>
      chart.addSeries(LineSeries, {
        color: s.color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: k === 0,
        crosshairMarkerVisible: false,
        ...(strip.range
          ? {
              autoscaleInfoProvider: () => ({
                priceRange: { minValue: strip.range!.min, maxValue: strip.range!.max },
              }),
            }
          : {}),
      }),
    )
    for (const level of strip.guides) {
      series[0].createPriceLine({
        price: level,
        color: '#374151',
        lineWidth: 1,
        lineStyle: 2, // dashed
        axisLabelVisible: true,
        title: '',
      })
    }
    seriesRefs.current = series
    prevCursor.current = -1
    return () => {
      seriesRefs.current = []
      try {
        series.forEach((s) => chart.removeSeries(s))
      } catch {
        // chart already disposed
      }
    }
  }, [chart, strip])

  useEffect(() => {
    if (!chart || !strip || seriesRefs.current.length === 0) return
    const { bars } = result
    const toPoint = (values: (number | null)[], i: number) =>
      values[i] == null ? { time: toTime(bars[i].t) } : { time: toTime(bars[i].t), value: values[i]! }

    const prev = prevCursor.current
    if (prev !== -1 && cursor > prev && cursor - prev <= 50) {
      for (let i = prev + 1; i <= cursor; i++)
        seriesRefs.current.forEach((s, k) => s.update(toPoint(strip.series[k].values, i)))
    } else if (cursor !== prev) {
      // preserve zoom across rebuilds; anchor to the full window on a fresh result
      const ts = chart.timeScale()
      const saved = prev === -1 ? null : ts.getVisibleLogicalRange()
      const idx = Array.from({ length: cursor + 1 }, (_, i) => i)
      seriesRefs.current.forEach((s, k) => s.setData(idx.map((i) => toPoint(strip.series[k].values, i))))
      if (saved) ts.setVisibleLogicalRange(saved)
      else ts.setVisibleLogicalRange({ from: -1, to: bars.length })
    }
    prevCursor.current = cursor
  }, [chart, result, strip, cursor])

  if (!strip) return null
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-2">
      <div className="px-1 pb-1 text-[10px] uppercase tracking-wide text-gray-500 flex items-center gap-3">
        <span>{strip.label}</span>
        {strip.series.length > 1 &&
          strip.series.map((s) => (
            <span key={s.label} className="flex items-center gap-1">
              <span className="inline-block w-3 h-0.5" style={{ background: s.color }} /> {s.label}
            </span>
          ))}
      </div>
      <div ref={containerRef} className="h-[80px]" />
    </div>
  )
}
