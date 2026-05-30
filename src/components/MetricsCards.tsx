import type { Metrics, Inputs } from '../types'
import { Tooltip } from './Tooltip'

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals })
}

function fmtK(n: number) {
  return Math.abs(n) >= 1000 ? `$${fmt(n / 1000, 0)}k` : `$${fmt(n)}`
}

interface PillProps {
  label: string
  value: string
  color: 'green' | 'yellow' | 'red' | 'neutral'
  tooltip?: React.ReactNode
}

function Pill({ label, value, color, tooltip }: PillProps) {
  const border = {
    green: 'border-green-600/50 text-green-400',
    yellow: 'border-yellow-500/50 text-yellow-400',
    red: 'border-red-600/50 text-red-400',
    neutral: 'border-gray-700 text-white',
  }[color]

  const pill = (
    <div className={`inline-flex items-center gap-1.5 bg-gray-900 border ${border} rounded-full px-3 py-1 ${tooltip ? 'cursor-help' : ''}`}>
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xs lg:text-sm font-semibold font-mono">{value}</span>
    </div>
  )

  if (!tooltip) return pill

  return <Tooltip content={tooltip}>{pill}</Tooltip>
}

interface Props {
  metrics: Metrics
  inputs: Inputs
}

export function MetricsCards({ metrics }: Props) {
  const dtiColor = metrics.frontEndDTI < 28 ? 'green' : metrics.frontEndDTI < 36 ? 'yellow' : 'red'
  const cashColor = metrics.monthsOfReserve > 6 ? 'green' : metrics.monthsOfReserve > 3 ? 'yellow' : 'red'
  const downColor = metrics.downPaymentPct >= 30 ? 'green' : metrics.downPaymentPct >= 20 ? 'yellow' : 'red'
  const breakEvenColor = metrics.breakEvenYear !== null && metrics.breakEvenYear <= 7 ? 'green' : metrics.breakEvenYear !== null && metrics.breakEvenYear <= 12 ? 'yellow' : 'red'

  return (
    <div className="flex flex-wrap gap-2">
      <Pill
        label="PITI"
        value={`$${fmt(metrics.monthlyPITI)}/mo`}
        color="neutral"
        tooltip={
          <div className="space-y-1">
            <div className="font-semibold">Monthly PITI</div>
            <div>Principal + Interest + Tax + Insurance. Your total housing payment.</div>
            <div className="text-gray-400 mt-1">
              P&I ${fmt(metrics.monthlyPI)} · Tax ${fmt(metrics.monthlyTax)} · Ins ${fmt(metrics.monthlyInsurance)}
            </div>
          </div>
        }
      />
      <Pill
        label="DTI"
        value={`${metrics.frontEndDTI.toFixed(1)}%`}
        color={dtiColor}
        tooltip={
          <div className="space-y-1">
            <div className="font-semibold">Front-end DTI</div>
            <div>Housing cost as % of gross monthly income. Lenders use this to qualify you.</div>
            <div className="text-green-400 mt-1">{'< 28%'} — comfortable</div>
            <div className="text-yellow-400">28–36% — acceptable</div>
            <div className="text-red-400">{'> 36%'} — lender ceiling</div>
          </div>
        }
      />
      <Pill
        label="Cash reserve"
        value={`${fmtK(metrics.cashReserve)} (${metrics.monthsOfReserve.toFixed(1)}mo)`}
        color={cashColor}
        tooltip={
          <div className="space-y-1">
            <div className="font-semibold">Cash Reserves After Purchase</div>
            <div>Liquid cash left after closing. Covers emergencies, repairs, job gaps.</div>
            <div className="text-green-400 mt-1">{'> 6 months'} — strong buffer</div>
            <div className="text-yellow-400">3–6 months — adequate</div>
            <div className="text-red-400">{'< 3 months'} — tight</div>
          </div>
        }
      />
      <Pill
        label="Down"
        value={`${metrics.downPaymentPct.toFixed(1)}% ($${fmt(metrics.downPayment / 1000)}k)`}
        color={downColor}
        tooltip={
          <div className="space-y-1">
            <div className="font-semibold">Down Payment %</div>
            <div>Higher down = smaller loan, lower monthly payment, more equity on day 1.</div>
            <div className="text-green-400 mt-1">30–50% — strong equity cushion</div>
            <div className="text-yellow-400">20–29% — avoids PMI</div>
            <div className="text-red-400">{'< 20%'} — PMI territory, lender scrutiny</div>
          </div>
        }
      />
      <Pill
        label="Break-even"
        value={metrics.breakEvenYear !== null ? `Yr ${metrics.breakEvenYear}` : '>30yr'}
        color={breakEvenColor}
        tooltip={
          <div className="space-y-1">
            <div className="font-semibold">Break-even vs Renting</div>
            <div>The year when buying puts you financially ahead of renting + investing the down payment. Matches the chart crossover.</div>
            <div className="text-green-400 mt-1">{'≤ 7 years'} — strong case to buy</div>
            <div className="text-yellow-400">8–12 years — depends on how long you stay</div>
            <div className="text-red-400">{'> 12 years'} — renting likely wins unless you plan to stay long-term</div>
          </div>
        }
      />
    </div>
  )
}
