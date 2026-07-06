import { useEffect, useMemo } from 'react'
import { useBacktestStore } from './store'
import type { TimeRegion } from './components/useTimeRegions'
import { BacktestControls } from './components/BacktestControls'
import { PlaybackBar } from './components/PlaybackBar'
import { SignalStrip } from './components/SignalStrip'
import { PriceChart } from './components/PriceChart'
import { IndicatorStrip } from './components/IndicatorStrip'
import { EquityChart } from './components/EquityChart'
import { MetricsPills } from './components/BacktestMetrics'
import { DrawdownChart } from './components/DrawdownChart'
import { TradeLog } from './components/TradeLog'
import { TradeStats } from './components/TradeStats'
import { drawdownFromPeak } from './engine/indicators'
import { CustomCodePanel } from './components/CustomCodePanel'
import { StratPills, FinalOutcome } from './components/StratPills'
import { GauntletCard } from './components/GauntletCard'
import { RobustnessLab } from './components/lab/RobustnessLab'
import { CUSTOM_ID } from './engine/custom'

function Skeleton() {
  return (
    <div className="space-y-3">
      {[52, 380, 200].map((h, i) => (
        <div
          key={i}
          style={{ height: h }}
          className="bg-gray-900 rounded-xl border border-gray-800 animate-pulse"
        />
      ))}
    </div>
  )
}

export default function BacktesterPage({ drawerOpen }: { drawerOpen: boolean }) {
  const { bars, result, cursor, ticker, strategyId, oosStart } = useBacktestStore()
  const loadTicker = useBacktestStore((s) => s.loadTicker)

  // bear-market bands: stretches where price sits ≥20% below its running peak
  const bearRegions = useMemo<TimeRegion[]>(() => {
    if (!bars) return []
    const dd = drawdownFromPeak(bars.map((b) => b.c))
    const out: TimeRegion[] = []
    let start: number | null = null
    for (let i = 0; i < dd.length; i++) {
      const inBear = dd[i]! <= -20
      if (inBear && start == null) start = i
      if ((!inBear || i === dd.length - 1) && start != null) {
        out.push({ from: start, to: i, color: 'rgba(239,68,68,0.06)' })
        start = null
      }
    }
    return out
  }, [bars])

  // walk-forward: shade the out-of-sample region on both charts
  const regions = useMemo<TimeRegion[]>(
    () =>
      oosStart != null && bars
        ? [
            ...bearRegions,
            { from: oosStart, to: bars.length - 1, color: 'rgba(59,130,246,0.10)', label: 'out-of-sample' },
          ]
        : bearRegions,
    [oosStart, bars, bearRegions],
  )

  // first visit (nothing persisted → onRehydrateStorage may fire before this
  // lazy chunk mounts): make sure data gets loaded
  useEffect(() => {
    if (!useBacktestStore.getState().bars) void loadTicker(ticker)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-53px)]">
      <aside
        className={`
          md:w-80 md:shrink-0 md:block md:border-r md:border-gray-800 md:overflow-y-auto
          ${drawerOpen ? 'block' : 'hidden'}
          bg-gray-950 border-b border-gray-800
        `}
      >
        <div className="px-4 py-3">
          <BacktestControls />
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-3 space-y-3">
        {strategyId === CUSTOM_ID && <CustomCodePanel />}
        {!bars || !result ? (
          <Skeleton />
        ) : (
          <>
            <PlaybackBar />
            <SignalStrip result={result} cursor={cursor} />
            <FinalOutcome />
            <GauntletCard />
            <StratPills />
            <EquityChart
              result={result}
              cursor={cursor}
              regions={regions}
              overlay={<MetricsPills result={result} cursor={cursor} />}
            />
            <DrawdownChart result={result} cursor={cursor} />
            <PriceChart result={result} cursor={cursor} regions={regions} />
            {result.run.strip && <IndicatorStrip result={result} cursor={cursor} />}
            <TradeLog result={result} cursor={cursor} />
            <TradeStats result={result} cursor={cursor} />
            <RobustnessLab />
          </>
        )}
      </main>
    </div>
  )
}
