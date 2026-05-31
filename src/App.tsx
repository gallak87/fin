import { useState } from 'react'
import { useStore } from './store'
import { computeMetrics, compare, sweep, getLocation, medianPrice } from './lib/compare'
import { InputPanel } from './components/InputPanel'
import { MetricsCards } from './components/MetricsCards'
import { LifestyleGoalBar } from './components/LifestyleGoalBar'
import { CashFlowBreakdown } from './components/CashFlowBreakdown'
import { ComparisonChart } from './components/ComparisonChart'
import { ResultsHeader } from './components/ResultsHeader'
import { PremiumLine } from './components/PremiumLine'

export default function App() {
  const { inputs, selectedLocations, focusedLocation, cityPrice, priceOffsets } = useStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [affordOpen, setAffordOpen] = useState(false)

  // headline + affordability reflect the focused city at its chosen price
  const metrics = computeMetrics(inputs)
  const comparison = compare(inputs)
  const location = getLocation(focusedLocation)

  const cities = selectedLocations.map((id) => ({ id, price: cityPrice[id] ?? medianPrice(id) }))
  const series = sweep(inputs, cities, priceOffsets)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-white">Rent vs Buy</h1>
        <button
          className="md:hidden text-xs text-gray-400 border border-gray-700 px-2 py-1 rounded"
          onClick={() => setDrawerOpen((o) => !o)}
        >
          {drawerOpen ? 'Close inputs' : 'Edit inputs'}
        </button>
      </header>

      <div className="flex flex-col md:flex-row min-h-[calc(100vh-53px)]">
        <aside
          className={`
            md:w-80 md:shrink-0 md:block md:border-r md:border-gray-800 md:overflow-y-auto
            ${drawerOpen ? 'block' : 'hidden'}
            bg-gray-950 border-b border-gray-800
          `}
        >
          <div className="px-4 py-3">
            <InputPanel />
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-3 space-y-3">
          <ResultsHeader comparison={comparison} inputs={inputs} />
          <ComparisonChart series={series} holdingPeriodYears={inputs.holdingPeriodYears} />
          <PremiumLine comparison={comparison} inputs={inputs} location={location} />

          {/* secondary — affordability sanity check */}
          <div className="bg-gray-900 rounded-xl border border-gray-800">
            <button
              onClick={() => setAffordOpen((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 text-xs lg:text-sm text-gray-400 uppercase tracking-wide hover:text-gray-200"
            >
              <span>Can you actually afford it?</span>
              <span className="text-base leading-none font-light">{affordOpen ? '−' : '+'}</span>
            </button>
            {affordOpen && (
              <div className="px-3 pb-3 space-y-2 border-t border-gray-800 pt-3">
                <MetricsCards metrics={metrics} inputs={inputs} />
                <LifestyleGoalBar metrics={metrics} inputs={inputs} />
                <CashFlowBreakdown metrics={metrics} inputs={inputs} />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
