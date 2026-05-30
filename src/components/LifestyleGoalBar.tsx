import type { Metrics, Inputs } from '../types'

function fmt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

interface Props {
  metrics: Metrics
  inputs: Inputs
}

export function LifestyleGoalBar({ metrics, inputs }: Props) {
  const { monthlyPITI } = metrics
  const takeHome = inputs.monthlyTakeHome
  const expenses = inputs.monthlyNonHousingExpenses
  const available = takeHome - monthlyPITI - expenses

  const pitiPct = takeHome > 0 ? Math.min((monthlyPITI / takeHome) * 100, 100) : 0
  const expPct = takeHome > 0 ? Math.min((expenses / takeHome) * 100, 100 - pitiPct) : 0

  const amountColor =
    available >= 5000 ? 'text-green-400' : available >= 2000 ? 'text-yellow-400' : 'text-red-400'
  const dotColor =
    available >= 5000 ? 'bg-green-500' : available >= 2000 ? 'bg-yellow-400' : 'bg-red-500'

  return (
    <div className="bg-gray-800 rounded-xl p-3 border border-gray-700 space-y-1.5">
      {/* Row 1 — label + total */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-gray-500 uppercase tracking-wide">net income after tax / month</span>
        <span className="text-gray-300 font-mono">${fmt(takeHome)}</span>
      </div>

      {/* Row 2 — reference bar (full = take-home) */}
      <div className="w-full h-2 bg-gray-600 rounded-full" />

      {/* Row 3 — stacked cost bar, empty tail = available */}
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden flex">
        <div
          className="h-full bg-blue-600 shrink-0"
          style={{ width: `${pitiPct}%` }}
          title={`Housing: $${fmt(monthlyPITI)}/mo`}
        />
        <div
          className="h-full bg-orange-500 shrink-0"
          style={{ width: `${expPct}%` }}
          title={`Expenses: $${fmt(expenses)}/mo`}
        />
      </div>

      {/* Legend */}
      <div className="flex gap-3 text-[11px] text-gray-500 pb-0.5">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-blue-600 inline-block" />
          housing ${fmt(monthlyPITI)}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-orange-500 inline-block" />
          expenses ${fmt(expenses)}
        </span>
      </div>

      {/* Divider + available */}
      <div className="border-t border-gray-700 pt-1.5 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
        <span className={`text-sm font-semibold ${amountColor}`}>${fmt(available)}</span>
        <span className="text-xs text-gray-500">/ mo available</span>
        {available < 0 && (
          <span className="text-xs text-red-400 ml-auto">shortfall — income doesn&apos;t cover costs</span>
        )}
      </div>
    </div>
  )
}
