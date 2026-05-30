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

  return (
    <div className={`inline-flex items-center gap-1.5 bg-gray-800 border ${border} rounded-full px-3 py-1`}>
      <span className="text-[11px] text-gray-500">{label}</span>
      <span className="text-[11px] font-semibold font-mono">{value}</span>
      {tooltip && (
        <Tooltip content={tooltip}>
          <span className="text-gray-600 hover:text-gray-400 text-[10px] leading-none">ℹ</span>
        </Tooltip>
      )}
    </div>
  )
}

interface Props {
  metrics: Metrics
  inputs: Inputs
}

export function MetricsCards({ metrics }: Props) {
  const dtiColor = metrics.frontEndDTI < 28 ? 'green' : metrics.frontEndDTI < 36 ? 'yellow' : 'red'
  const cashColor = metrics.monthsOfReserve > 6 ? 'green' : metrics.monthsOfReserve > 3 ? 'yellow' : 'red'
  const downColor = metrics.downPaymentPct >= 30 ? 'green' : metrics.downPaymentPct >= 20 ? 'yellow' : 'red'

  return (
    <div className="flex flex-wrap gap-2">
      <Pill label="PITI" value={`$${fmt(metrics.monthlyPITI)}/mo`} color="neutral" />
      <Pill
        label="DTI"
        value={`${metrics.frontEndDTI.toFixed(1)}%`}
        color={dtiColor}
        tooltip={
          <div className="space-y-1">
            <div className="font-semibold">Front-end DTI</div>
            <div className="text-green-400">{'< 28%'} — comfortable</div>
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
            <div className="text-green-400">{'> 6 months'} — strong buffer</div>
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
            <div className="text-green-400">30–50% — strong equity cushion</div>
            <div className="text-yellow-400">20–29% — avoids PMI</div>
            <div className="text-red-400">{'< 20%'} — PMI territory</div>
          </div>
        }
      />
      <Pill
        label="Break-even"
        value={metrics.breakEvenYear !== null ? `Yr ${metrics.breakEvenYear}` : '>30yr'}
        color={metrics.breakEvenYear !== null && metrics.breakEvenYear <= 7 ? 'green' : metrics.breakEvenYear !== null && metrics.breakEvenYear <= 12 ? 'yellow' : 'red'}
      />
    </div>
  )
}
