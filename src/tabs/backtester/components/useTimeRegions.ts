import { useEffect } from 'react'
import type { IChartApi, Logical } from 'lightweight-charts'

export interface TimeRegion {
  from: number // bar index
  to: number // bar index (inclusive)
  color: string
  label?: string
}

/**
 * Shades index-ranges of a lightweight-chart by absolutely positioning divs
 * over its container (bar index == logical index for our single-pane charts).
 */
export function useTimeRegions(
  chart: IChartApi | null,
  containerRef: React.RefObject<HTMLDivElement | null>,
  regions: TimeRegion[],
) {
  useEffect(() => {
    const container = containerRef.current
    if (!chart || !container) return
    // the host div must already be position:relative (className="relative …")
    const layer = document.createElement('div')
    layer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:3;overflow:hidden'
    container.appendChild(layer)

    const render = () => {
      layer.innerHTML = ''
      if (regions.length === 0) return
      const ts = chart.timeScale()
      const width = container.clientWidth
      for (const r of regions) {
        const x1 = ts.logicalToCoordinate(r.from as Logical)
        const x2 = ts.logicalToCoordinate(r.to as Logical)
        if (x1 == null && x2 == null) continue
        const left = Math.max(0, x1 ?? 0)
        const right = Math.min(width, x2 ?? width)
        if (right <= left) continue
        const div = document.createElement('div')
        div.style.cssText = `position:absolute;top:0;bottom:0;left:${left}px;width:${right - left}px;background:${r.color}`
        if (r.label) {
          const tag = document.createElement('div')
          tag.textContent = r.label
          tag.style.cssText =
            'position:absolute;top:2px;left:4px;font-size:9px;text-transform:uppercase;letter-spacing:0.05em;color:rgba(96,165,250,0.9);white-space:nowrap'
          div.appendChild(tag)
        }
        layer.appendChild(div)
      }
    }

    render()
    const ts = chart.timeScale()
    ts.subscribeVisibleLogicalRangeChange(render)
    const ro = new ResizeObserver(render)
    ro.observe(container)
    return () => {
      ts.unsubscribeVisibleLogicalRangeChange(render)
      ro.disconnect()
      layer.remove()
    }
  }, [chart, containerRef, regions])
}

/**
 * "You are here" playback-cursor line on full-range charts, so the pinned
 * equity/drawdown timelines line up with the sliding price chart.
 */
export function useCursorLine(
  chart: IChartApi | null,
  containerRef: React.RefObject<HTMLDivElement | null>,
  cursor: number,
) {
  useEffect(() => {
    const container = containerRef.current
    if (!chart || !container) return
    const line = document.createElement('div')
    line.style.cssText =
      'position:absolute;top:0;bottom:0;width:1px;background:rgba(156,163,175,0.45);pointer-events:none;z-index:4'
    container.appendChild(line)

    const render = () => {
      const x = chart.timeScale().logicalToCoordinate(cursor as Logical)
      if (x == null || x < 0 || x > container.clientWidth) {
        line.style.display = 'none'
      } else {
        line.style.display = ''
        line.style.left = `${x}px`
      }
    }

    render()
    const ts = chart.timeScale()
    ts.subscribeVisibleLogicalRangeChange(render)
    const ro = new ResizeObserver(render)
    ro.observe(container)
    return () => {
      ts.unsubscribeVisibleLogicalRangeChange(render)
      ro.disconnect()
      line.remove()
    }
  }, [chart, containerRef, cursor])
}
