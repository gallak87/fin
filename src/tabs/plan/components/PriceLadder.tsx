import type { Figures } from '../types'
import { buildPlan, type Knobs, type Plan } from '../model'
import { dollars, shortDollars, pct } from '../fmt'

const STEP = 50_000
const OFFSETS = [-150_000, -100_000, -50_000, 0, 50_000, 100_000, 150_000]

export function PriceLadder({ f, knobs, plan }: { f: Figures; knobs: Knobs; plan: Plan }) {
  const center = Math.round(plan.priceOnCap / STEP) * STEP
  const rows = OFFSETS.map((o) => center + o)
    .filter((p) => p > 0)
    .map((price) => ({ price, p: buildPlan(f, { ...knobs, housePrice: price }) }))

  const nearest = rows.reduce((best, r) =>
    Math.abs(r.price - knobs.housePrice) < Math.abs(best.price - knobs.housePrice) ? r : best,
  )

  return (
    <section className="bg-gray-900 rounded-xl border border-gray-800 p-3">
      <h2 className="text-xs uppercase tracking-wide text-gray-400 mb-2">The deduction line</h2>

      {plan.aboveCap > 0 ? (
        <p className="text-xs lg:text-sm text-gray-300">
          Your loan is <span className="font-mono text-white">{dollars(plan.loanAmount)}</span>. The
          government only lets you deduct interest on the first{' '}
          <span className="font-mono text-white">{dollars(f.deductionCap)}</span>, so the{' '}
          <span className="font-mono text-amber-400">{dollars(plan.aboveCap)}</span> above it is
          borrowed at the full rate with no break —{' '}
          <span className="font-mono text-amber-400">{dollars(plan.aboveCapAnnualCost)}</span> a year
          of interest you get nothing back on.
        </p>
      ) : (
        <p className="text-xs lg:text-sm text-gray-300">
          Your loan is <span className="font-mono text-white">{dollars(plan.loanAmount)}</span>, under
          the <span className="font-mono text-white">{dollars(f.deductionCap)}</span> line — every
          dollar of interest is deductible. You have{' '}
          <span className="font-mono text-emerald-400">
            {dollars(f.deductionCap - plan.loanAmount)}
          </span>{' '}
          of room left.
        </p>
      )}

      <p className="text-xs text-gray-400 mt-1.5">
        Keeping <span className="font-mono text-gray-200">{dollars(plan.reserve)}</span> in the bank,
        the price that lands you exactly on the line is{' '}
        <span className="font-mono text-white font-semibold">{dollars(plan.priceOnCap)}</span>.
      </p>

      <div className="overflow-x-auto mt-3 -mx-3 px-3">
        <table className="w-full text-xs tabular-nums">
          <thead>
            <tr className="text-gray-500 text-left">
              <th className="font-normal py-1 pr-3">Price</th>
              <th className="font-normal py-1 pr-3">Down</th>
              <th className="font-normal py-1 pr-3">Loan</th>
              <th className="font-normal py-1 pr-3">Monthly</th>
              <th className="font-normal py-1">Of your pay</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {rows.map(({ price, p }) => {
              const here = price === nearest.price
              const share = p.shareOfTakeHome
              const tone =
                share <= 0.45 ? 'text-emerald-400' : share <= 0.52 ? 'text-amber-400' : 'text-red-400'
              return (
                <tr
                  key={price}
                  className={`border-t border-gray-800 ${here ? 'bg-blue-500/10 text-white' : 'text-gray-300'}`}
                >
                  <td className="py-1.5 pr-3">
                    {here && <span className="text-blue-400 mr-1">›</span>}
                    {shortDollars(price)}
                  </td>
                  <td className="py-1.5 pr-3">
                    {shortDollars(p.downPayment)}
                    <span className="text-gray-500"> · {pct(p.downPayment / price)}</span>
                  </td>
                  <td className={`py-1.5 pr-3 ${p.aboveCap > 0 ? 'text-amber-400' : ''}`}>
                    {shortDollars(p.loanAmount)}
                  </td>
                  <td className="py-1.5 pr-3">{dollars(p.monthlyTotal)}</td>
                  <td className={`py-1.5 ${tone}`}>{pct(share)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">
        Your down payment is whatever's left in the pool, not a percentage you pick — so the dollar
        amount barely moves, and it drifts <em>down</em> as the price climbs because closing costs are{' '}
        {f.closingCostPct}% of the price and come out of the same money. A pricier house means a bigger
        loan, not a bigger down payment. Loans in amber cross the deduction line. Every{' '}
        {shortDollars(STEP)} of price is about{' '}
        {dollars(rows.length > 1 ? rows[1].p.monthlyTotal - rows[0].p.monthlyTotal : 0)} a month.
      </p>
    </section>
  )
}
