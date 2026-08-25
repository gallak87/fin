import type { Figures } from '../types'
import type { Plan } from '../model'
import { dollars } from '../fmt'

function Row({ label, amount, note }: { label: string; amount: number; note?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="text-xs lg:text-sm text-gray-300">
        {label}
        {note && <span className="text-gray-500"> — {note}</span>}
      </span>
      <span
        className={`text-xs lg:text-sm font-mono tabular-nums shrink-0 ${
          amount < 0 ? 'text-red-400' : 'text-gray-100'
        }`}
      >
        {amount < 0 ? dollars(amount) : `+${dollars(amount)}`}
      </span>
    </div>
  )
}

export function Sources({
  f,
  plan,
  btcPrice,
  liquidInvestments,
}: {
  f: Figures
  plan: Plan
  btcPrice: number
  liquidInvestments: number
}) {
  const coins = `${f.btcUsable} bitcoin at ${dollars(btcPrice)}`

  return (
    <section className="bg-gray-900 rounded-xl border border-gray-800 p-3">
      <h2 className="text-xs uppercase tracking-wide text-gray-400 mb-2">
        What you actually have to put down
      </h2>

      <Row label="Liquid investments" amount={liquidInvestments} note="Fidelity taxable" />
      <Row label="Bank and cash" amount={plan.bankTotal} />
      <Row label={coins} amount={plan.gains.proceeds} />
      <Row
        label="Tax on selling those coins"
        amount={-plan.gains.total}
        note={
          plan.gains.carryforwardUsed > 0
            ? `${dollars(plan.gains.grossGain)} profit, ${dollars(plan.gains.carryforwardUsed)} erased by prior-year losses`
            : `${dollars(plan.gains.grossGain)} of profit`
        }
      />
      <Row
        label="Clearing the car and condo loans"
        amount={-plan.payoffTotal}
        note={`frees ${dollars(plan.payoffMonthly)}/mo`}
      />
      <Row label="Closing costs" amount={-plan.closingCosts} note={`${f.closingCostPct}% of the price`} />

      <div className="border-t border-gray-800 mt-2 pt-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs lg:text-sm text-gray-400">Left to split</span>
          <span className="text-xs lg:text-sm font-mono tabular-nums text-gray-300">
            {dollars(plan.available)}
          </span>
        </div>
      </div>

      <Row
        label="Cash you keep in the bank"
        amount={-plan.reserve}
        note={`${plan.reserveMonths.toFixed(1)} months of expenses`}
      />

      <div className="border-t border-gray-800 mt-2 pt-2 flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-white">Down payment</span>
        <span className="text-base lg:text-lg font-mono font-semibold tabular-nums text-emerald-400">
          {dollars(plan.downPayment)}
        </span>
      </div>

      {plan.short > 0 && (
        <p className="text-[11px] text-amber-400 mt-2">
          That leaves you under the {dollars(f.cashFloor)} your bank wants you to keep on deposit.
        </p>
      )}
    </section>
  )
}
