/** Shape of the private figures the planner runs on. See personal.example.ts. */

export interface Account {
  name: string
  amount: number
}

/** A loan you'd clear before buying — balance leaves the pool, monthly leaves the budget. */
export interface Payoff {
  name: string
  balance: number
  monthly: number
}

/** A rental you're keeping. `costs` excludes anything listed in payoffs. */
export interface Rental {
  name: string
  costs: number // mortgage + dues + management, monthly
  rent: number // what the tenant pays you, monthly
}

/** The five sliders. Starting values are personal, so they live in Figures. */
export interface Knobs {
  btcPrice: number
  liquidInvestments: number
  housePrice: number
  mortgageRate: number
  reserve: number
}

export interface Figures {
  /** Shown in the header so it's obvious whether real numbers loaded. */
  label: string

  /** Where each slider starts. */
  defaults: Knobs

  // --- what you could put toward a house ---
  /** Bank/cash balances. The brokerage total is a slider, not a figure. */
  accounts: Account[]
  btcUsable: number // coins earmarked for the down payment
  btcCostBasis: number // per coin, for the tax on selling
  /** Unused capital losses from prior years. Cancels gains in full — no $3k cap. */
  capitalLossCarryforward: number

  // --- income ---
  grossAnnualIncome: number
  takeHomeMonthly: number // after tax, retirement, benefits
  livingExpensesMonthly: number // everything that isn't housing

  // --- debts cleared before buying ---
  payoffs: Payoff[]

  // --- properties you're keeping ---
  rentals: Rental[]
  currentRent: number

  // --- tax on selling bitcoin ---
  federalGainsRate: number // long-term rate, as a %
  niitRate: number
  niitThreshold: number // extra tax applies to income above this
  stateGainsRate: number
  stateGainsDeduction: number // state exempts gains below this

  // --- purchase assumptions ---
  closingCostPct: number // % of price
  propertyTaxPct: number // %/yr of price
  insurancePct: number // %/yr of price
  deductionCap: number // loan dollars above this get no interest deduction
  cashFloor: number // bank minimum you can't dip below
}
