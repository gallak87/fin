import { useEffect } from 'react'
import type { IChartApi, LogicalRange } from 'lightweight-charts'

// all mounted backtester charts share one time axis: zoom/pan one, move all
const group = new Set<IChartApi>()
let applying = false

export function useChartSync(chart: IChartApi | null) {
  useEffect(() => {
    if (!chart) return
    group.add(chart)
    const ts = chart.timeScale()
    const onChange = (range: LogicalRange | null) => {
      if (applying || !range) return
      applying = true
      try {
        for (const c of group) {
          if (c !== chart) c.timeScale().setVisibleLogicalRange(range)
        }
      } finally {
        applying = false
      }
    }
    ts.subscribeVisibleLogicalRangeChange(onChange)
    return () => {
      group.delete(chart)
      ts.unsubscribeVisibleLogicalRangeChange(onChange)
    }
  }, [chart])
}
