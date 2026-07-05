import type { Comparison, Inputs, Location } from '../types'

function fmt(n: number) {
  return Math.round(n).toLocaleString('en-US')
}

interface Props {
  comparison: Comparison
  inputs: Inputs
  location: Location | null
}

/**
 * Prices the intangible. We don't fake a dollar value for "good schools" — we
 * show what owning costs (or saves) vs renting the same home, then hand the
 * judgement back to the human.
 */
export function PremiumLine({ comparison, inputs, location }: Props) {
  const months = inputs.holdingPeriodYears * 12
  const monthlyDelta = comparison.wealthDelta / months
  const buyAhead = comparison.wealthDelta >= 0
  const place = location ? `${location.city}` : 'here'
  const schools = location ? ` (${location.district}, rated ${location.schoolRating}/10)` : ''

  return (
    <div
      className={`rounded-xl px-4 py-3 border text-sm leading-relaxed ${
        buyAhead ? 'border-green-700/50 bg-green-950/20' : 'border-amber-700/50 bg-amber-950/20'
      }`}
    >
      {buyAhead ? (
        <>
          Over {inputs.holdingPeriodYears} years, owning in <span className="font-semibold">{place}</span>
          {schools} comes out <span className="text-green-400 font-semibold">${fmt(comparison.wealthDelta)} ahead</span> of
          renting — about <span className="font-mono">${fmt(monthlyDelta)}/mo</span> in your favor.
          You get the school district <span className="text-gray-400">and</span> the money. Easy call.
        </>
      ) : (
        <>
          Over {inputs.holdingPeriodYears} years, owning in <span className="font-semibold">{place}</span>
          {schools} costs you about{' '}
          <span className="text-amber-400 font-semibold font-mono">${fmt(-monthlyDelta)}/mo</span> more than renting the
          same home (<span className="font-mono">${fmt(-comparison.wealthDelta)}</span> total).
          <span className="text-gray-300"> Is the stability, control, and school access worth that to you?</span>
          <span className="text-gray-500"> That's the real question — the numbers can't answer it.</span>
        </>
      )}
    </div>
  )
}
