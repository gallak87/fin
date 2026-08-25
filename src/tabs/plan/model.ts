import type { Figures, Knobs } from './types'

export type { Knobs }

export interface GainsTax {
  proceeds: number
  grossGain: number
  carryforwardUsed: number
  gain: number
  federal: number
  niit: number
  state: number
  total: number
}

export interface Plan {
  // where the money comes from
  bankTotal: number
  accountsTotal: number
  gains: GainsTax
  afterTax: number

  // where it goes
  payoffTotal: number
  payoffMonthly: number
  closingCosts: number
  available: number // down payment + reserve, after everything fixed
  reserve: number
  downPayment: number
  short: number // how far under the cash floor you'd be, if at all

  // the loan
  loanAmount: number
  aboveCap: number
  aboveCapAnnualCost: number

  // the monthly
  monthlyLoan: number
  monthlyPropertyTax: number
  monthlyInsurance: number
  monthlyRentalDrag: number
  monthlyTotal: number
  shareOfTakeHome: number

  // what you pay now, for comparison
  todayMonthly: number
  rentingAfterPayoffs: number

  reserveMonths: number
  priceOnCap: number // price whose loan lands exactly on the deduction line
}

/** Standard amortizing payment. */
export function monthlyPayment(principal: number, annualRatePct: number, years = 30) {
  const r = annualRatePct / 100 / 12
  const n = years * 12
  if (principal <= 0) return 0
  if (r === 0) return principal / n
  const growth = Math.pow(1 + r, n)
  return (principal * r * growth) / (growth - 1)
}

/**
 * Tax on selling the earmarked coins. Prior-year capital losses cancel the gain
 * first, in full — the $3k ceiling only governs losses applied against ordinary
 * income, not against gains. What survives pays the federal long-term rate, plus
 * the investment surtax on income above its threshold (charged on the smaller of
 * the gain or the overage), plus state tax above the state's exemption.
 */
export function gainsTax(f: Figures, btcPrice: number): GainsTax {
  const proceeds = f.btcUsable * btcPrice
  const grossGain = Math.max(0, proceeds - f.btcUsable * f.btcCostBasis)
  const carryforwardUsed = Math.min(grossGain, Math.max(0, f.capitalLossCarryforward))
  const gain = grossGain - carryforwardUsed

  const federal = gain * (f.federalGainsRate / 100)

  const overThreshold = Math.max(0, f.grossAnnualIncome + gain - f.niitThreshold)
  const niit = Math.min(gain, overThreshold) * (f.niitRate / 100)

  const state = Math.max(0, gain - f.stateGainsDeduction) * (f.stateGainsRate / 100)

  return { proceeds, grossGain, carryforwardUsed, gain, federal, niit, state, total: federal + niit + state }
}

export function buildPlan(f: Figures, k: Knobs): Plan {
  const bankTotal = f.accounts.reduce((sum, a) => sum + a.amount, 0)
  const accountsTotal = bankTotal + k.liquidInvestments
  const gains = gainsTax(f, k.btcPrice)
  const afterTax = accountsTotal + gains.proceeds - gains.total

  const payoffTotal = f.payoffs.reduce((sum, p) => sum + p.balance, 0)
  const payoffMonthly = f.payoffs.reduce((sum, p) => sum + p.monthly, 0)
  const closingCosts = k.housePrice * (f.closingCostPct / 100)

  const available = afterTax - payoffTotal - closingCosts
  const reserve = Math.min(k.reserve, Math.max(0, available))
  const downPayment = Math.max(0, available - reserve)
  const short = Math.max(0, f.cashFloor - reserve)

  const loanAmount = Math.max(0, k.housePrice - downPayment)
  const aboveCap = Math.max(0, loanAmount - f.deductionCap)
  const aboveCapAnnualCost = aboveCap * (k.mortgageRate / 100)

  const monthlyLoan = monthlyPayment(loanAmount, k.mortgageRate)
  const monthlyPropertyTax = (k.housePrice * (f.propertyTaxPct / 100)) / 12
  const monthlyInsurance = (k.housePrice * (f.insurancePct / 100)) / 12
  const monthlyRentalDrag = f.rentals.reduce((sum, r) => sum + (r.costs - r.rent), 0)
  const monthlyTotal = monthlyLoan + monthlyPropertyTax + monthlyInsurance + monthlyRentalDrag

  const rentingAfterPayoffs = monthlyRentalDrag + f.currentRent
  const todayMonthly = rentingAfterPayoffs + payoffMonthly

  const burn = monthlyTotal + f.livingExpensesMonthly

  // solve price(1+c) − afterTax + payoffTotal + reserve = cap
  const priceOnCap = (f.deductionCap + afterTax - payoffTotal - reserve) / (1 + f.closingCostPct / 100)

  return {
    bankTotal,
    accountsTotal,
    gains,
    afterTax,
    payoffTotal,
    payoffMonthly,
    closingCosts,
    available,
    reserve,
    downPayment,
    short,
    loanAmount,
    aboveCap,
    aboveCapAnnualCost,
    monthlyLoan,
    monthlyPropertyTax,
    monthlyInsurance,
    monthlyRentalDrag,
    monthlyTotal,
    shareOfTakeHome: monthlyTotal / f.takeHomeMonthly,
    todayMonthly,
    rentingAfterPayoffs,
    reserveMonths: burn > 0 ? reserve / burn : 0,
    priceOnCap,
  }
}
