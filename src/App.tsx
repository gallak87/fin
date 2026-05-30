import { useState } from 'react'
import { useStore } from './store'
import { computeMetrics, projectNetWorth, projectTimingBands } from './lib/mortgage'
import { InputPanel } from './components/InputPanel'
import { MetricsCards } from './components/MetricsCards'
import { LifestyleGoalBar } from './components/LifestyleGoalBar'
import { CashFlowBreakdown } from './components/CashFlowBreakdown'
import { ProjectionChart } from './components/ProjectionChart'
import { ScenarioList } from './components/ScenarioList'
import { CompareModal } from './components/CompareModal'

function StepLabel({ n, label }: { n: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 select-none uppercase tracking-wide">
      <span className="text-gray-600 font-bold">{n}</span>
      <span>·</span>
      <span>{label}</span>
    </span>
  )
}

export default function App() {
  const { inputs, scenarios, selectedIds, activeScenarioId } = useStore()
  const activeScenario = scenarios.find((s) => s.id === activeScenarioId)
  const metrics = computeMetrics(inputs)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [chartMode, setChartMode] = useState<'scenarios' | 'timing'>('scenarios')

  const selectedScenarios = scenarios.filter((s) => selectedIds.includes(s.id))
  const projections = chartMode === 'timing'
    ? projectTimingBands(inputs)
    : projectNetWorth(selectedScenarios.map((s) => ({ id: s.id, name: s.name, inputs: s.inputs })))

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
            border-l-2 border-l-yellow-500/60
            shadow-[inset_4px_0_12px_rgba(234,179,8,0.06)]
          `}
        >
          <div className="px-4 pt-3 pb-1 flex items-center justify-between">
            <StepLabel n={1} label="configure inputs" />
            <span className="text-[10px] text-amber-500/80 font-medium tracking-wide">
              editing: {activeScenario?.name ?? '—'}
            </span>
          </div>
          <div className="px-4 pb-4">
            <InputPanel />
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-3 space-y-2">

          {/* Scenario pills strip */}
          <div className="flex items-center gap-2 flex-wrap">
            <StepLabel n={2} label="scenarios" />
            <ScenarioList />
          </div>

          {/* Step 3 — Compare */}
          <div>
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <StepLabel n={3} label="compare · check to plot" />
              <MetricsCards metrics={metrics} inputs={inputs} />
              <div className="ml-auto flex gap-1">
                {(['scenarios', 'timing'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setChartMode(m)}
                    className={`text-xs px-2.5 py-1 rounded border transition-colors ${
                      chartMode === m
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                    }`}
                  >
                    {m === 'timing' ? 'timing bands' : 'scenarios'}
                  </button>
                ))}
              </div>
            </div>
            <ProjectionChart projections={projections} mode={chartMode} />
          </div>

          {/* Detail */}
          <div className="space-y-2 pt-1">
            <LifestyleGoalBar metrics={metrics} inputs={inputs} />
            <CashFlowBreakdown metrics={metrics} inputs={inputs} />
          </div>

        </main>
      </div>

      {compareOpen && <CompareModal onClose={() => setCompareOpen(false)} />}
    </div>
  )
}
