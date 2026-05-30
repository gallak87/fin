import type { Metrics, Inputs } from '../types'

function fmt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

interface Props {
  metrics: Metrics
  inputs: Inputs
}

export function LifestyleGoalBar({ metrics, inputs }: Props) {
  const { discretionaryMonthly, grossMonthlyIncome } = metrics
  const goal = inputs.discretionaryGoal
  const pct = grossMonthlyIncome > 0 ? (discretionaryMonthly / grossMonthlyIncome) * 100 : 0
  const meetsGoal = discretionaryMonthly >= goal

  const barPct = Math.max(0, Math.min(100, pct))
  const barColor = meetsGoal
    ? discretionaryMonthly > goal * 1.5
      ? 'bg-green-500'
      : 'bg-green-400'
    : discretionaryMonthly > 0
      ? 'bg-yellow-400'
      : 'bg-red-500'

  const status = meetsGoal ? '✓' : '✗'
  const statusColor = meetsGoal ? 'text-green-400' : 'text-red-400'

  return (
    <div className="bg-gray-800 rounded-xl p-3 border border-gray-700 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 uppercase tracking-wide">Discretionary / mo</span>
        <span className={`text-sm font-semibold ${statusColor}`}>
          {status} ${fmt(Math.max(0, discretionaryMonthly))}
          <span className="text-gray-500 font-normal text-xs ml-1">
            ({pct.toFixed(0)}% of income)
          </span>
        </span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${barColor}`} style={{ width: `${barPct}%` }} />
      </div>
      <div className="flex justify-between text-xs text-gray-600">
        <span>Goal: ${fmt(goal)}/mo</span>
        <span>
          After PITI + ${fmt(inputs.monthlyNonHousingExpenses)} expenses
        </span>
      </div>
      {!meetsGoal && discretionaryMonthly < 0 && (
        <div className="text-xs text-red-400">
          Monthly shortfall: ${fmt(Math.abs(discretionaryMonthly))} — income doesn&apos;t cover housing + expenses
        </div>
      )}
    </div>
  )
}
