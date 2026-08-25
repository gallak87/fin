import { FIGURES, IS_PERSONAL } from './figures'
import { buildPlan, monthlyPayment } from './model'
import { usePlanStore } from './store'
import { dollars, shortDollars } from './fmt'
import { Slider } from './components/Slider'
import { Sources } from './components/Sources'
import { Monthly } from './components/Monthly'
import { PriceLadder } from './components/PriceLadder'

export default function PlanPage({ drawerOpen }: { drawerOpen: boolean }) {
  const { btcPrice, liquidInvestments, housePrice, mortgageRate, reserve, set, reset } = usePlanStore()
  const knobs = { btcPrice, liquidInvestments, housePrice, mortgageRate, reserve }
  const f = FIGURES
  const plan = buildPlan(f, knobs)

  // what a full point of rate costs at this loan size, for the slider note
  const pointCost =
    monthlyPayment(plan.loanAmount, mortgageRate + 1) - monthlyPayment(plan.loanAmount, mortgageRate)

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-53px)]">
      <aside
        className={`
          md:w-80 md:shrink-0 md:block md:border-r md:border-gray-800 md:overflow-y-auto
          ${drawerOpen ? 'block' : 'hidden'}
          bg-gray-950 border-b border-gray-800
        `}
      >
        <div className="px-4 py-3 space-y-4">
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full border ${
                IS_PERSONAL
                  ? 'border-emerald-700 text-emerald-400'
                  : 'border-amber-700 text-amber-400'
              }`}
            >
              {f.label}
            </span>
            <button onClick={reset} className="text-[11px] text-gray-500 hover:text-gray-300">
              Reset
            </button>
          </div>

          <Slider
            label="Liquid investments"
            value={liquidInvestments}
            min={100_000}
            max={700_000}
            step={1_000}
            onChange={(v) => set({ liquidInvestments: v })}
            display={dollars(liquidInvestments)}
            note="Fidelity taxable total — cash plus positions"
          />

          <Slider
            label="Bitcoin price"
            value={btcPrice}
            min={20_000}
            max={200_000}
            step={1_000}
            onChange={(v) => set({ btcPrice: v })}
            display={dollars(btcPrice)}
          />

          <Slider
            label="House price"
            value={housePrice}
            min={900_000}
            max={1_800_000}
            step={25_000}
            onChange={(v) => set({ housePrice: v })}
            display={shortDollars(housePrice)}
            note={`on the deduction line at ${shortDollars(plan.priceOnCap)}`}
          />

          <Slider
            label="Mortgage rate"
            value={mortgageRate}
            min={5}
            max={8}
            step={0.125}
            onChange={(v) => set({ mortgageRate: v })}
            display={`${mortgageRate.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')}%`}
            note={`a full point either way is ${dollars(pointCost)}/mo`}
          />

          <Slider
            label="Cash you keep in the bank"
            value={reserve}
            min={0}
            max={200_000}
            step={1_000}
            onChange={(v) => set({ reserve: v })}
            display={dollars(reserve)}
            note={`${plan.reserveMonths.toFixed(1)} months of expenses · bank floor ${shortDollars(f.cashFloor)}`}
          />

          {!IS_PERSONAL && (
            <p className="text-[11px] text-amber-400/80 leading-relaxed">
              These are placeholders. Real figures live in <code>personal.local.ts</code>, which is
              gitignored and never reaches the deployed build.
            </p>
          )}

          <div className="pt-3 border-t border-gray-800">
            <p className="text-[11px] text-gray-500 leading-relaxed">
              <strong className="text-gray-300">
                The $3,000 cap is only for losses written off against your salary. Against capital
                gains, a carryforward applies in full, with no limit.
              </strong>{' '}
              IRC §1211(b) allows losses up to “gains, plus the lower of $3,000 or the excess” —
              gains come first, the $3,000 governs only the leftover. §1212(b) carries the remainder
              forward, keeping its short- or long-term character. It nets on Schedule D Part III:
              carryovers enter at lines 6 and 14, and the $3,000 ceiling only appears at line 21, on
              a net loss. Your exact remaining balance comes off the Capital Loss Carryover
              Worksheet in the Schedule D instructions. Plain-English version: Pub. 550, ch. 4.
              Crypto counts as property, so all of this applies — Notice 2014-21.
            </p>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-3 space-y-3">
        <Monthly f={f} plan={plan} />
        <div className="grid gap-3 lg:grid-cols-2">
          <Sources f={f} plan={plan} btcPrice={btcPrice} liquidInvestments={liquidInvestments} />
          <PriceLadder f={f} knobs={knobs} plan={plan} />
        </div>
      </main>
    </div>
  )
}
