import type { Metrics, Inputs } from '../types'

function fmt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

interface Props {
  metrics: Metrics
  inputs: Inputs
}

export function LifestyleGoalBar({ metrics, inputs }: Props) {
  const { monthlyPITI: pitiMonthly, discretionaryMonthly, grossMonthlyIncome } = metrics
  const expenses = inputs.monthlyNonHousingExpenses
  const goal = inputs.discretionaryGoal

  const pitiPct = grossMonthlyIncome > 0 ? (pitiMonthly / grossMonthlyIncome) * 100 : 0
  const expPct = grossMonthlyIncome > 0 ? (expenses / grossMonthlyIncome) * 100 : 0
  const discPct = grossMonthlyIncome > 0 ? Math.max(0, (discretionaryMonthly / grossMonthlyIncome) * 100) : 0
  const overflowPct = Math.max(0, pitiPct + expPct + discPct - 100)

  const meetsGoal = discretionaryMonthly >= goal
  const discColor = meetsGoal ? 'bg-green-500' : discretionaryMonthly > 0 ? 'bg-yellow-400' : 'bg-red-500'

  return (
    <div className="bg-gray-800 rounded-xl p-3 border border-gray-700 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 uppercase tracking-wide">Income allocation</span>
        <span className="text-xs text-gray-500">${fmt(grossMonthlyIncome)}/mo gross</span>
      </div>

      {/* Stacked bar */}
      <div className="w-full bg-gray-700 rounded-full h-4 overflow-hidden flex">
        <div
          className="h-full bg-blue-600 shrink-0"
          style={{ width: `${Math.min(pitiPct, 100)}%` }}
          title={`PITI: $${fmt(pitiMonthly)}/mo (${pitiPct.toFixed(0)}%)`}
        />
        <div
          className="h-full bg-orange-500 shrink-0"
          style={{ width: `${Math.min(expPct, 100 - Math.min(pitiPct, 100))}%` }}
          title={`Expenses: $${fmt(expenses)}/mo (${expPct.toFixed(0)}%)`}
        />
        <div
          className={`h-full shrink-0 ${discColor}`}
          style={{ width: `${Math.min(discPct, 100 - Math.min(pitiPct + expPct, 100))}%` }}
          title={`Discretionary: $${fmt(Math.max(0, discretionaryMonthly))}/mo (${discPct.toFixed(0)}%)`}
        />
        {overflowPct > 0 && (
          <div className="h-full bg-red-600 flex-1" title="Over income" />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 shrink-0" />
          <span className="text-gray-400">Housing</span>
          <span className="text-white font-medium">{pitiPct.toFixed(0)}%</span>
          <span className="text-gray-600">${fmt(pitiMonthly)}/mo</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 shrink-0" />
          <span className="text-gray-400">Expenses</span>
          <span className="text-white font-medium">{expPct.toFixed(0)}%</span>
          <span className="text-gray-600">${fmt(expenses)}/mo</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${discColor}`} />
          <span className="text-gray-400">Discretionary</span>
          <span className={`font-medium ${meetsGoal ? 'text-green-400' : 'text-yellow-400'}`}>
            {discPct.toFixed(0)}%
          </span>
          <span className="text-gray-600">${fmt(Math.max(0, discretionaryMonthly))}/mo</span>
          {!meetsGoal && (
            <span className="text-yellow-500">(goal: ${fmt(goal)})</span>
          )}
        </span>
      </div>

      {discretionaryMonthly < 0 && (
        <div className="text-xs text-red-400">
          Shortfall: ${fmt(Math.abs(discretionaryMonthly))}/mo — income doesn&apos;t cover housing + expenses
        </div>
      )}
    </div>
  )
}
