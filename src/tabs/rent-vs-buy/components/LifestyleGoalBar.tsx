import type { Metrics, Inputs } from '../types'

function fmt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

interface Props {
  metrics: Metrics
  inputs: Inputs
}

export function LifestyleGoalBar({ metrics, inputs }: Props) {
  const { monthlyPITI, monthlyTakeHome: takeHome } = metrics
  const expenses = inputs.monthlyNonHousingExpenses
  const available = takeHome - monthlyPITI - expenses

  const pitiPct = takeHome > 0 ? Math.min((monthlyPITI / takeHome) * 100, 100) : 0
  const expPct = takeHome > 0 ? Math.min((expenses / takeHome) * 100, 100 - pitiPct) : 0
  const availPct = Math.max(0, 100 - pitiPct - expPct)

  const availBg = available >= 5000 ? 'bg-green-500' : available >= 2000 ? 'bg-yellow-400' : 'bg-red-500'
  const availText = available >= 5000 ? 'text-green-400' : available >= 2000 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs lg:text-sm text-gray-400 uppercase tracking-wide">net income after tax / month</span>
        <span className="text-xs lg:text-sm text-gray-200 font-mono">${fmt(takeHome)}</span>
      </div>

      {/* reference bar */}
      <div className="w-full h-2 bg-gray-600 rounded-full" />

      {/* allocation bar — housing | expenses | available */}
      <div className="w-full h-6 bg-gray-800 rounded-lg overflow-hidden flex text-[11px] font-medium">
        <div className="h-full bg-blue-600 shrink-0 flex items-center justify-center overflow-hidden" style={{ width: `${pitiPct}%` }}>
          {pitiPct > 12 && <span className="text-white/80 truncate px-1">${fmt(monthlyPITI)}</span>}
        </div>
        <div className="h-full bg-orange-500 shrink-0 flex items-center justify-center overflow-hidden" style={{ width: `${expPct}%` }}>
          {expPct > 10 && <span className="text-white/80 truncate px-1">${fmt(expenses)}</span>}
        </div>
        <div className={`h-full shrink-0 flex items-center justify-center overflow-hidden ${availBg} bg-opacity-30`} style={{ width: `${availPct}%` }}>
          {availPct > 8 && (
            <span className={`font-semibold truncate px-1 ${availText}`}>${fmt(Math.max(0, available))}</span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs lg:text-sm text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block shrink-0" />
          housing ${fmt(monthlyPITI)}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-orange-500 inline-block shrink-0" />
          expenses ${fmt(expenses)}
        </span>
        <span className={`flex items-center gap-1.5 ${availText}`}>
          <span className={`w-2.5 h-2.5 rounded-sm inline-block shrink-0 ${availBg}`} />
          ${fmt(Math.max(0, available))} available
          {available < 0 && <span className="text-red-400 ml-1">— shortfall</span>}
        </span>
      </div>
    </div>
  )
}
