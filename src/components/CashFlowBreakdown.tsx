import { useState } from 'react'
import type { Metrics, Inputs } from '../types'

function fmt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

interface Props {
  metrics: Metrics
  inputs: Inputs
}

export function CashFlowBreakdown({ metrics, inputs }: Props) {
  const [open, setOpen] = useState(false)
  const delta = metrics.monthlyPITI - inputs.currentRent

  const rows = [
    { label: 'Principal & Interest', value: metrics.monthlyPI },
    { label: `Property Tax (${inputs.propertyTaxRate}%)`, value: metrics.monthlyTax },
    { label: 'Insurance (est.)', value: metrics.monthlyInsurance },
  ]

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs text-gray-500 uppercase tracking-wide hover:text-gray-400"
      >
        <span>Monthly Breakdown</span>
        <div className="flex items-center gap-3">
          <span className="normal-case font-mono text-white">
            ${fmt(metrics.monthlyPITI)}/mo
            <span className={`ml-2 ${delta > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
              ({delta > 0 ? '+' : ''}{fmt(delta)} vs rent)
            </span>
          </span>
          <span className="text-base leading-none font-light">{open ? '−' : '+'}</span>
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-1 border-t border-gray-700">
          <div className="pt-2 space-y-1">
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
          <div className="pt-2 border-t border-gray-700 space-y-1">
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
      )}
    </div>
  )
}
