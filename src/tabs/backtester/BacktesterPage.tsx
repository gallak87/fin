import { useEffect } from 'react'
import { useBacktestStore } from './store'
import { BacktestControls } from './components/BacktestControls'
import { PlaybackBar } from './components/PlaybackBar'
import { SignalStrip } from './components/SignalStrip'
import { PriceChart } from './components/PriceChart'
import { IndicatorStrip } from './components/IndicatorStrip'
import { EquityChart } from './components/EquityChart'
import { BacktestMetrics } from './components/BacktestMetrics'
import { TradeLog } from './components/TradeLog'
import { CustomCodePanel } from './components/CustomCodePanel'
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
  const { bars, result, cursor, ticker, strategyId } = useBacktestStore()
  const loadTicker = useBacktestStore((s) => s.loadTicker)

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
            <PriceChart result={result} cursor={cursor} />
            {result.run.strip && <IndicatorStrip result={result} cursor={cursor} />}
            <EquityChart result={result} cursor={cursor} />
            <BacktestMetrics result={result} cursor={cursor} />
            <TradeLog result={result} cursor={cursor} />
          </>
        )}
      </main>
    </div>
  )
}
