import type { Figures } from './types'

/**
 * Placeholder figures. This file is committed, so keep it fictional.
 *
 * Real numbers live in `personal.local.ts` (gitignored, same shape, exports
 * `PERSONAL`). That file exists only on your machine — CI builds from a clean
 * checkout, so the deployed bundle ships these placeholders and nothing else.
 */
export const EXAMPLE: Figures = {
  label: 'Example figures',

  defaults: {
    btcPrice: 50_000,
    liquidInvestments: 250_000,
    housePrice: 1_000_000,
    mortgageRate: 6.5,
    reserve: 50_000,
  },

  accounts: [
    { name: 'Savings', amount: 50_000 },
    { name: 'Checking', amount: 25_000 },
  ],
  btcUsable: 1,
  btcCostBasis: 20_000,
  capitalLossCarryforward: 10_000,

  grossAnnualIncome: 200_000,
  takeHomeMonthly: 11_000,
  livingExpensesMonthly: 4_000,

  payoffs: [
    { name: 'Car loan', balance: 15_000, monthly: 600 },
    { name: 'Personal loan', balance: 20_000, monthly: 500 },
  ],

  rentals: [{ name: 'Rental', costs: 2_000, rent: 1_900 }],
  currentRent: 3_000,

  federalGainsRate: 15,
  niitRate: 3.8,
  niitThreshold: 250_000,
  stateGainsRate: 0,
  stateGainsDeduction: 278_000,

  closingCostPct: 2.0,
  propertyTaxPct: 0.9,
  insurancePct: 0.16,
  deductionCap: 750_000,
  cashFloor: 10_000,
}
