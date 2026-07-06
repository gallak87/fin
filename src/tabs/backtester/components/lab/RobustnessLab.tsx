import { useState } from 'react'
import { SweepPanel } from './SweepPanel'
import { WalkForwardPanel } from './WalkForwardPanel'
import { MonteCarloPanel } from './MonteCarloPanel'
import { LuckPanel } from './LuckPanel'
import { TickerScorecard } from './TickerScorecard'

const TABS = [
  { id: 'sweep', label: 'Param sweep', q: 'parameter luck?' },
  { id: 'walkforward', label: 'Walk-forward', q: 'time-period luck?' },
  { id: 'montecarlo', label: 'Monte Carlo', q: 'ordering luck?' },
  { id: 'luck', label: 'Vs. random', q: 'better than luck at all?' },
  { id: 'tickers', label: 'All tickers', q: 'asset luck?' },
] as const

type TabId = (typeof TABS)[number]['id']

/** Phase 3: every panel answers "was that result luck?" from a different angle. */
export function RobustnessLab() {
  const [tab, setTab] = useState<TabId>('sweep')

  return (
    <div id="robustness-lab" className="bg-gray-900 rounded-xl border border-gray-800 scroll-mt-16">
      <div className="px-3 pt-2.5 pb-1 flex flex-wrap items-baseline gap-x-2">
        <span className="text-xs uppercase tracking-wide text-gray-400">Robustness lab</span>
        <span className="text-[10px] text-gray-600">was that result luck?</span>
      </div>
      <div className="px-3 flex flex-wrap gap-1 border-b border-gray-800 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            title={t.q}
            className={`text-xs rounded-lg px-2.5 py-1 border ${
              tab === t.id
                ? 'border-blue-500 bg-blue-500/10 text-gray-100'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-3">
        {tab === 'sweep' && <SweepPanel />}
        {tab === 'walkforward' && <WalkForwardPanel />}
        {tab === 'montecarlo' && <MonteCarloPanel />}
        {tab === 'luck' && <LuckPanel />}
        {tab === 'tickers' && <TickerScorecard />}
      </div>
    </div>
  )
}
