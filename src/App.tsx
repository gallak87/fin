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

function StepLabel({ n, title, hint }: { n: number; title: string; hint: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-5 h-5 rounded-full bg-gray-800 border border-gray-700 text-gray-500 text-xs flex items-center justify-center font-semibold shrink-0">
        {n}
      </span>
      <span className="text-xs font-semibold text-gray-400">{title}</span>
      <span className="text-xs text-gray-600">{hint}</span>
    </div>
  )
}

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
        {/* Sidebar — Step 1 */}
        <aside
          className={`
            md:w-80 md:shrink-0 md:block md:border-r md:border-gray-800 md:overflow-y-auto
            ${drawerOpen ? 'block' : 'hidden'}
            bg-gray-950 border-b border-gray-800
          `}
        >
          <div className="px-4 pt-4 pb-2">
            <StepLabel n={1} title="Configure a scenario" hint="set your assumptions" />
          </div>
          <div className="px-4 pb-4">
            <InputPanel />
          </div>
        </aside>

        {/* Main — Steps 2 & 3 */}
        <main className="flex-1 overflow-y-auto">

          {/* Step 2 — Save scenarios */}
          <div className="p-4 pb-0 space-y-3">
            <StepLabel n={2} title="Save as a scenario" hint="repeat for each situation you want to compare" />
            <ScenarioList />
          </div>

          {/* Connector */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="flex-1 border-t border-dashed border-gray-800" />
          </div>

          {/* Step 3 — Compare */}
          <div className="px-4 pb-4 space-y-3">
            <StepLabel n={3} title="Compare" hint="check scenarios above to plot — hover for details" />
            <ProjectionChart projections={projections} />
          </div>

          {/* Detail metrics */}
          <div className="px-4 pb-4 space-y-3 border-t border-gray-800 pt-4">
            <MetricsCards metrics={metrics} inputs={inputs} />
            <LifestyleGoalBar metrics={metrics} inputs={inputs} />
            <CashFlowBreakdown metrics={metrics} inputs={inputs} />
          </div>

        </main>
      </div>

      {compareOpen && <CompareModal onClose={() => setCompareOpen(false)} />}
    </div>
  )
}
