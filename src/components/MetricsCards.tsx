import type { Metrics, Inputs } from '../types'
import { Tooltip } from './Tooltip'

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals })
}

function fmtK(n: number) {
  return Math.abs(n) >= 1000 ? `$${fmt(n / 1000, 0)}k` : `$${fmt(n)}`
}

interface CardProps {
  label: string
  value: string
  sub?: string
  color: 'green' | 'yellow' | 'red' | 'neutral'
  tooltip?: React.ReactNode
}

function Card({ label, value, sub, color, tooltip }: CardProps) {
  const border = {
    green: 'border-green-500/40',
    yellow: 'border-yellow-400/40',
    red: 'border-red-500/40',
    neutral: 'border-gray-700',
  }[color]
  const valueColor = {
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
    neutral: 'text-white',
  }[color]

  return (
    <div className={`bg-gray-800 rounded-xl p-3 border ${border} flex flex-col gap-0.5`}>
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
        {tooltip && (
          <Tooltip content={tooltip}>
            <span className="text-gray-600 hover:text-gray-400 text-xs">ℹ</span>
          </Tooltip>
        )}
      </div>
      <div className={`text-xl font-semibold font-mono ${valueColor}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  )
}

interface Props {
  metrics: Metrics
  inputs: Inputs
}

export function MetricsCards({ metrics, inputs }: Props) {
  const dtiColor =
    metrics.frontEndDTI < 28 ? 'green' : metrics.frontEndDTI < 36 ? 'yellow' : 'red'

  const cashColor =
    metrics.monthsOfReserve > 6 ? 'green' : metrics.monthsOfReserve > 3 ? 'yellow' : 'red'

  const downColor =
    metrics.downPaymentPct >= 30 ? 'green' : metrics.downPaymentPct >= 20 ? 'yellow' : 'red'

  const dtiTooltip = (
    <div className="space-y-1">
      <div className="font-semibold">Front-end DTI</div>
      <div className="text-green-400">{'< 28%'} — comfortable</div>
      <div className="text-yellow-400">28–36% — acceptable</div>
      <div className="text-red-400">{'> 36%'} — lender ceiling, hard to qualify</div>
    </div>
  )

  const cashTooltip = (
    <div className="space-y-1">
      <div className="font-semibold">Cash Reserves After Purchase</div>
      <div className="text-green-400">{'> 6 months'} — strong buffer</div>
      <div className="text-yellow-400">3–6 months — adequate</div>
      <div className="text-red-400">{'< 3 months'} — tight, unexpected costs are risky</div>
    </div>
  )

  const downTooltip = (
    <div className="space-y-1">
      <div className="font-semibold">Down Payment %</div>
      <div className="text-green-400">30–50% — strong equity cushion</div>
      <div className="text-yellow-400">20–29% — avoids PMI</div>
      <div className="text-red-400">{'< 20%'} — PMI territory, lender scrutiny</div>
    </div>
  )

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card
        label="Monthly PITI"
        value={`$${fmt(metrics.monthlyPITI)}`}
        sub={`P&I $${fmt(metrics.monthlyPI)}`}
        color="neutral"
      />
      <Card
        label="DTI"
        value={`${metrics.frontEndDTI.toFixed(1)}%`}
        sub={`of $${fmt(metrics.grossMonthlyIncome)}/mo`}
        color={dtiColor}
        tooltip={dtiTooltip}
      />
      <Card
        label="Cash Reserve"
        value={fmtK(metrics.cashReserve)}
        sub={`${metrics.monthsOfReserve.toFixed(1)} mo expenses`}
        color={cashColor}
        tooltip={cashTooltip}
      />
      <Card
        label="Down Payment"
        value={`${metrics.downPaymentPct.toFixed(1)}%`}
        sub={`$${fmt(metrics.downPayment / 1000)}k of $${fmt(inputs.housePrice / 1000)}k`}
        color={downColor}
        tooltip={downTooltip}
      />
    </div>
  )
}
