import { useState } from 'react'
import { useStore } from './store'
import { computeMetrics, projectNetWorth } from './lib/mortgage'
import { InputPanel } from './components/InputPanel'
import { MetricsCards } from './components/MetricsCards'
import { LifestyleGoalBar } from './components/LifestyleGoalBar'
import { CashFlowBreakdown } from './components/CashFlowBreakdown'
import { ProjectionChart } from './components/ProjectionChart'
import { ScenarioList } from './components/ScenarioList'
import { CompareModal } from './components/CompareModal'

export default function App() {
  const { inputs, scenarios, selectedIds } = useStore()
  const metrics = computeMetrics(inputs)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)

  const selectedScenarios = scenarios.filter((s) => selectedIds.includes(s.id))
  const projections = projectNetWorth(
    selectedScenarios.map((s) => ({ id: s.id, name: s.name, inputs: s.inputs })),
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <h1 className="text-base font-semibold text-white">Home Purchase Planner</h1>
        <div className="flex items-center gap-2">
          {scenarios.length > 0 && (
            <button
              onClick={() => setCompareOpen(true)}
              className="text-xs text-blue-400 border border-blue-800 hover:border-blue-600 px-2 py-1 rounded"
            >
              Compare{selectedIds.length > 0 ? ` (${selectedIds.length})` : ' all'}
            </button>
          )}
          <button
            className="md:hidden text-xs text-gray-400 border border-gray-700 px-2 py-1 rounded"
            onClick={() => setDrawerOpen((o) => !o)}
          >
            {drawerOpen ? 'Close inputs' : 'Edit inputs'}
          </button>
        </div>
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
          <ProjectionChart projections={projections} />
          <ScenarioList />
        </main>
      </div>

      {compareOpen && <CompareModal onClose={() => setCompareOpen(false)} />}
    </div>
  )
}
