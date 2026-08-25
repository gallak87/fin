import type { Figures } from '../types'
import type { Plan } from '../model'
import { dollars, pct } from '../fmt'

function Line({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-xs font-mono tabular-nums text-gray-200">{dollars(amount)}</span>
    </div>
  )
}

function Bar({ label, amount, max, tone }: { label: string; amount: number; max: number; tone: string }) {
  return (
    <div className="py-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-xs font-mono tabular-nums text-gray-200">{dollars(amount)}</span>
      </div>
      <div className="h-1.5 bg-gray-800 rounded-full mt-1 overflow-hidden">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${(amount / max) * 100}%` }} />
      </div>
    </div>
  )
}

export function Monthly({ f, plan }: { f: Figures; plan: Plan }) {
  const share = plan.shareOfTakeHome
  const tone = share <= 0.45 ? 'emerald' : share <= 0.52 ? 'amber' : 'red'
  const text = { emerald: 'text-emerald-400', amber: 'text-amber-400', red: 'text-red-400' }[tone]
  const fill = { emerald: 'bg-emerald-500', amber: 'bg-amber-500', red: 'bg-red-500' }[tone]

  const verdict = {
    emerald: 'About what you pay now. Room for travel and everything else.',
    amber: 'A real stretch on one income — it eats into the spending money.',
    red: 'More than half your take-home. This is the house-poor zone.',
  }[tone]

  const max = Math.max(plan.monthlyTotal, plan.todayMonthly, plan.rentingAfterPayoffs)
  const delta = plan.monthlyTotal - plan.todayMonthly

  return (
    <section className="bg-gray-900 rounded-xl border border-gray-800 p-3">
      <h2 className="text-xs uppercase tracking-wide text-gray-400 mb-2">What it costs every month</h2>

      <div className="flex items-baseline gap-3 flex-wrap">
        <span className={`text-3xl font-mono font-semibold tabular-nums ${text}`}>
          {dollars(plan.monthlyTotal)}
        </span>
        <span className={`text-sm font-semibold ${text}`}>{pct(share)} of your take-home pay</span>
      </div>
      <p className="text-xs text-gray-400 mt-1">{verdict}</p>

      <div className="mt-3 pt-2 border-t border-gray-800">
        <Line label="Loan payment" amount={plan.monthlyLoan} />
        <Line label="Property tax" amount={plan.monthlyPropertyTax} />
        <Line label="Insurance" amount={plan.monthlyInsurance} />
        <Line
          label={`The two rentals, after tenants pay (${f.rentals.map((r) => r.name).join(', ')})`}
          amount={plan.monthlyRentalDrag}
        />
      </div>

      <div className="mt-3 pt-2 border-t border-gray-800 space-y-0.5">
        <Bar label="What you pay now" amount={plan.todayMonthly} max={max} tone="bg-gray-600" />
        <Bar
          label="If you cleared the loans and kept renting"
          amount={plan.rentingAfterPayoffs}
          max={max}
          tone="bg-gray-600"
        />
        <Bar label="This plan" amount={plan.monthlyTotal} max={max} tone={fill} />
      </div>

      <p className="text-xs text-gray-400 mt-2">
        That's <span className="font-mono text-gray-200">{dollars(Math.abs(delta))}</span>{' '}
        {delta >= 0 ? 'more' : 'less'} than today — but clearing those two loans drops you to{' '}
        <span className="font-mono text-gray-200">{dollars(plan.rentingAfterPayoffs)}</span> whether you
        buy or not, so the house really costs{' '}
        <span className="font-mono text-gray-200">
          {dollars(plan.monthlyTotal - plan.rentingAfterPayoffs)}
        </span>{' '}
        a month over staying put.
      </p>
    </section>
  )
}
