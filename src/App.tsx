import { useState } from 'react'
import { useStore } from './store'
import { computeMetrics } from './lib/mortgage'
import { InputPanel } from './components/InputPanel'
import { MetricsCards } from './components/MetricsCards'
import { LifestyleGoalBar } from './components/LifestyleGoalBar'
import { CashFlowBreakdown } from './components/CashFlowBreakdown'

export default function App() {
  const { inputs } = useStore()
  const metrics = computeMetrics(inputs)
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-white">Home Purchase Planner</h1>
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
            bg-gray-950 p-4 border-b border-gray-800
          `}
        >
          <InputPanel />
        </aside>

        <main className="flex-1 p-4 space-y-4 overflow-y-auto">
          <MetricsCards metrics={metrics} inputs={inputs} />
          <LifestyleGoalBar metrics={metrics} inputs={inputs} />
          <CashFlowBreakdown metrics={metrics} inputs={inputs} />
          <div className="bg-gray-800 rounded-xl p-3 border border-gray-700 text-xs text-gray-500 text-center py-8">
            Projection chart — Phase 3
          </div>
          <div className="bg-gray-800 rounded-xl p-3 border border-gray-700 text-xs text-gray-500 text-center py-8">
            Scenario management — Phase 4
          </div>
        </main>
      </div>
    </div>
  )
}
