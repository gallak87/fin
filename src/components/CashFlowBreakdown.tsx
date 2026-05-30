import type { Metrics, Inputs } from '../types'

function fmt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

interface Props {
  metrics: Metrics
  inputs: Inputs
}

export function CashFlowBreakdown({ metrics, inputs }: Props) {
  const delta = metrics.monthlyPITI - inputs.currentRent

  const rows = [
    { label: 'Principal & Interest', value: metrics.monthlyPI },
    { label: `Property Tax (${inputs.propertyTaxRate}%)`, value: metrics.monthlyTax },
    { label: 'Insurance (est.)', value: metrics.monthlyInsurance },
  ]

  return (
    <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Monthly Breakdown</div>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between text-xs">
            <span className="text-gray-400">{r.label}</span>
            <span className="font-mono text-white">${fmt(r.value)}</span>
          </div>
        ))}
        <div className="flex justify-between text-xs font-semibold border-t border-gray-700 pt-1 mt-1">
          <span className="text-white">Total PITI</span>
          <span className="font-mono text-white">${fmt(metrics.monthlyPITI)}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 pt-0.5">
          <span>vs current rent</span>
          <span className="font-mono">${fmt(inputs.currentRent)}</span>
        </div>
        <div className={`flex justify-between text-xs font-semibold ${delta > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
          <span>Delta</span>
          <span className="font-mono">{delta > 0 ? '+' : ''}{fmt(delta)}/mo</span>
        </div>
      </div>
      <div className="mt-3 pt-2 border-t border-gray-700 space-y-1">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Break-even vs renting</span>
          <span className="font-mono text-white">
            {metrics.breakEvenYear !== null ? `Year ${metrics.breakEvenYear}` : '> 30 years'}
          </span>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Opportunity cost /yr</span>
          <span className="font-mono text-white">${fmt(metrics.opportunityCostAnnual)}</span>
        </div>
      </div>
    </div>
  )
}
