import type { Comparison, Inputs } from '../types'
import { monthlyRent } from '../lib/compare'

function fmtMoney(n: number) {
  const abs = Math.abs(n)
  const s = abs >= 1_000_000 ? `$${(abs / 1_000_000).toFixed(2)}M` : abs >= 1_000 ? `$${Math.round(abs / 1000)}k` : `$${Math.round(abs)}`
  return n < 0 ? `−${s}` : s
}

function Card({
  label,
  value,
  sub,
  color,
}: {
  label: string
  value: string
  sub: string
  color: 'green' | 'yellow' | 'red'
}) {
  const ring = {
    green: 'border-green-600/50',
    yellow: 'border-yellow-500/50',
    red: 'border-red-600/50',
  }[color]
  const text = {
    green: 'text-green-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
  }[color]
  return (
    <div className={`flex-1 min-w-[180px] bg-gray-900 border ${ring} rounded-xl px-4 py-3`}>
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`text-xl lg:text-2xl font-semibold font-mono mt-0.5 ${text}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  )
}

interface Props {
  comparison: Comparison
  inputs: Inputs
}

export function ResultsHeader({ comparison, inputs }: Props) {
  const { breakEvenMonth, wealthDelta, equivalentRent } = comparison
  const horizon = inputs.holdingPeriodYears

  // break-even card
  const beYears = breakEvenMonth === null ? null : breakEvenMonth / 12
  const beValue = beYears === null ? 'never' : beYears < 1 ? `${breakEvenMonth}mo` : `${beYears.toFixed(1)}yr`
  const beColor: 'green' | 'yellow' | 'red' =
    beYears === null ? 'red' : beYears <= horizon ? 'green' : beYears <= horizon + 3 ? 'yellow' : 'red'
  const beSub =
    beYears === null
      ? 'buying never catches up here'
      : beYears <= horizon
        ? `inside your ${horizon}yr horizon`
        : `past your ${horizon}yr horizon`

  // equivalent rent card — buying wins if real rent is ABOVE this
  const rent = Math.round(monthlyRent(inputs))
  const erColor: 'green' | 'yellow' | 'red' =
    rent >= equivalentRent ? 'green' : rent >= equivalentRent * 0.9 ? 'yellow' : 'red'
  const erSub = `equiv. rental here ≈ $${rent.toLocaleString()}/mo → ${
    rent >= equivalentRent ? 'buying wins' : 'renting wins'
  }`

  // wealth delta card
  const buyAhead = wealthDelta >= 0
  const wdColor: 'green' | 'yellow' | 'red' =
    Math.abs(wealthDelta) < 25_000 ? 'yellow' : buyAhead ? 'green' : 'red'
  const wdSub = `${buyAhead ? 'buying' : 'renting'} ahead after ${horizon} years`

  return (
    <div className="flex flex-wrap gap-2">
      <Card label="Break-even" value={beValue} sub={beSub} color={beColor} />
      <Card
        label="Buy beats renting above"
        value={`$${equivalentRent.toLocaleString()}/mo`}
        sub={erSub}
        color={erColor}
      />
      <Card label={`Net worth Δ @ ${horizon}yr`} value={fmtMoney(wealthDelta)} sub={wdSub} color={wdColor} />
    </div>
  )
}
