import { useEffect, useRef, useState } from 'react'
import { createChart, type IChartApi, type DeepPartial, type ChartOptions, type UTCTimestamp } from 'lightweight-charts'

export const toTime = (t: string) => (Date.parse(t) / 1000) as UTCTimestamp

const THEME: DeepPartial<ChartOptions> = {
  layout: {
    background: { color: 'transparent' },
    textColor: '#9ca3af',
    fontSize: 11,
    attributionLogo: false,
  },
  grid: {
    vertLines: { color: '#1f2937' },
    horzLines: { color: '#1f2937' },
  },
  rightPriceScale: { borderColor: '#374151' },
  timeScale: { borderColor: '#374151' },
  crosshair: {
    horzLine: { color: '#4b5563', labelBackgroundColor: '#374151' },
    vertLine: { color: '#4b5563', labelBackgroundColor: '#374151' },
  },
}

/** Creates a themed lightweight-chart bound to the returned container ref. */
export function useChart(options?: DeepPartial<ChartOptions>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [chart, setChart] = useState<IChartApi | null>(null)
  const optionsRef = useRef(options)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const c = createChart(el, {
      ...THEME,
      ...optionsRef.current,
      width: el.clientWidth,
      height: el.clientHeight,
    })
    const ro = new ResizeObserver(() => c.applyOptions({ width: el.clientWidth, height: el.clientHeight }))
    ro.observe(el)
    setChart(c)
    return () => {
      ro.disconnect()
      c.remove()
      setChart(null)
    }
  }, [])

  return { containerRef, chart }
}
