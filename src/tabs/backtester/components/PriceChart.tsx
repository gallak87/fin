import { useEffect, useRef } from 'react'
import {
  CandlestickSeries,
  LineSeries,
  createSeriesMarkers,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
} from 'lightweight-charts'
import type { BacktestResult } from '../engine/types'
import { useChart, toTime } from './useChart'

const VIEW_BARS = 200 // keep roughly this many recent bars in view while playing

export function PriceChart({ result, cursor }: { result: BacktestResult; cursor: number }) {
  const { containerRef, chart } = useChart()
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const overlayRefs = useRef<ISeriesApi<'Line'>[]>([])
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null)
  const prevCursor = useRef(-1)

  // (re)create series when the chart mounts or the backtest changes
  useEffect(() => {
    if (!chart) return
    const candle = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      priceLineVisible: false,
    })
    const overlays = result.run.overlays.map((o) =>
      chart.addSeries(LineSeries, {
        color: o.color,
        lineWidth: 1,
        title: o.label,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      }),
    )
    candleRef.current = candle
    overlayRefs.current = overlays
    markersRef.current = createSeriesMarkers(candle, [])
    prevCursor.current = -1
    return () => {
      markersRef.current = null
      candleRef.current = null
      overlayRefs.current = []
      try {
        chart.removeSeries(candle)
        overlays.forEach((s) => chart.removeSeries(s))
      } catch {
        // chart already disposed
      }
    }
  }, [chart, result])

  // cursor sync: append incrementally when advancing, rebuild on jumps back
  useEffect(() => {
    const candle = candleRef.current
    if (!chart || !candle) return
    const { bars, trades, run } = result

    const toCandle = (i: number) => ({
      time: toTime(bars[i].t),
      open: bars[i].o,
      high: bars[i].h,
      low: bars[i].l,
      close: bars[i].c,
    })
    const toPoint = (values: (number | null)[], i: number) =>
      values[i] == null ? { time: toTime(bars[i].t) } : { time: toTime(bars[i].t), value: values[i]! }

    const prev = prevCursor.current
    if (prev !== -1 && cursor > prev && cursor - prev <= 50) {
      for (let i = prev + 1; i <= cursor; i++) {
        candle.update(toCandle(i))
        overlayRefs.current.forEach((s, k) => s.update(toPoint(run.overlays[k].values, i)))
      }
    } else if (cursor !== prev) {
      const idx = Array.from({ length: cursor + 1 }, (_, i) => i)
      candle.setData(idx.map(toCandle))
      overlayRefs.current.forEach((s, k) => s.setData(idx.map((i) => toPoint(run.overlays[k].values, i))))
    }
    prevCursor.current = cursor

    // trade markers revealed as the tape reaches them
    const markers: SeriesMarker<Time>[] = []
    for (const t of trades) {
      if (t.entryIdx > cursor) break
      markers.push({
        time: toTime(t.entryDate),
        position: 'belowBar',
        shape: 'arrowUp',
        color: '#22c55e',
        text: 'BUY',
      })
      if (t.exitIdx != null && t.exitIdx <= cursor) {
        markers.push({
          time: toTime(t.exitDate!),
          position: 'aboveBar',
          shape: 'arrowDown',
          color: '#ef4444',
          text: 'SELL',
        })
      }
    }
    markersRef.current?.setMarkers(markers)

    chart.timeScale().setVisibleLogicalRange({ from: cursor - VIEW_BARS, to: cursor + 5 })
  }, [chart, result, cursor])

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-2">
      <div ref={containerRef} className="h-[300px] sm:h-[380px]" />
    </div>
  )
}
