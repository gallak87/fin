import { useState } from 'react'
import type { Metrics, Inputs } from '../types'
import { monthlyRent } from '../compare'

function fmt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

interface Props {
  metrics: Metrics
  inputs: Inputs
}

export function CashFlowBreakdown({ metrics, inputs }: Props) {
  const [open, setOpen] = useState(false)
  const rent = monthlyRent(inputs)
  const delta = metrics.monthlyPITI - rent

  const rows = [
    { label: 'Principal & Interest', value: metrics.monthlyPI },
    { label: `Property Tax (${inputs.propertyTaxRate}%)`, value: metrics.monthlyTax },
    { label: 'Insurance (est.)', value: metrics.monthlyInsurance },
  ]

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs lg:text-sm text-gray-400 uppercase tracking-wide hover:text-gray-200"
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
        <div className="px-3 pb-3 space-y-1 border-t border-gray-800">
          <div className="pt-2 space-y-1.5">
            {rows.map((r) => (
              <div key={r.label} className="flex justify-between text-xs lg:text-sm">
                <span className="text-gray-300">{r.label}</span>
                <span className="font-mono text-white">${fmt(r.value)}</span>
              </div>
            ))}
            <div className="flex justify-between text-xs lg:text-sm font-semibold border-t border-gray-800 pt-1.5 mt-1">
              <span className="text-white">Total PITI</span>
              <span className="font-mono text-white">${fmt(metrics.monthlyPITI)}</span>
            </div>
            <div className="flex justify-between text-xs lg:text-sm text-gray-400 pt-0.5">
              <span>vs equivalent rent</span>
              <span className="font-mono">${fmt(rent)}</span>
            </div>
            <div className={`flex justify-between text-xs lg:text-sm font-semibold ${delta > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
              <span>Delta</span>
              <span className="font-mono">{delta > 0 ? '+' : ''}{fmt(delta)}/mo</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
