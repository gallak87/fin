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
  const takeHome = inputs.monthlyTakeHome ?? 0
  const expenses = inputs.monthlyNonHousingExpenses
  const available = takeHome - monthlyPITI - expenses

  const pitiPct = takeHome > 0 ? Math.min((monthlyPITI / takeHome) * 100, 100) : 0
  const expPct = takeHome > 0 ? Math.min((expenses / takeHome) * 100, 100 - pitiPct) : 0

  const amountColor =
    available >= 5000 ? 'text-green-400' : available >= 2000 ? 'text-yellow-400' : 'text-red-400'
  const dotColor =
    available >= 5000 ? 'bg-green-500' : available >= 2000 ? 'bg-yellow-400' : 'bg-red-500'

  return (
    <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs lg:text-sm text-gray-400 uppercase tracking-wide">net income after tax / month</span>
        <span className="text-xs lg:text-sm text-gray-200 font-mono">${fmt(takeHome)}</span>
      </div>

      {/* reference bar */}
      <div className="w-full h-2 bg-gray-600 rounded-full" />

      {/* cost bar */}
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden flex">
        <div className="h-full bg-blue-600 shrink-0" style={{ width: `${pitiPct}%` }} />
        <div className="h-full bg-orange-500 shrink-0" style={{ width: `${expPct}%` }} />
      </div>

      <div className="flex gap-4 text-xs lg:text-sm text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block shrink-0" />
          housing ${fmt(monthlyPITI)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block shrink-0" />
          expenses ${fmt(expenses)}
        </span>
      </div>

      <div className="border-t border-gray-800 pt-2 flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColor}`} />
        <span className={`text-base font-semibold ${amountColor}`}>${fmt(available)}</span>
        <span className="text-xs lg:text-sm text-gray-400">/ mo available</span>
        {available < 0 && (
          <span className="text-xs text-red-400 ml-auto">shortfall — income doesn&apos;t cover costs</span>
        )}
      </div>
    </div>
  )
}
