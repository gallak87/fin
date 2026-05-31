export interface EquitySource {
  id: string
  name: string
  amount: number
  include: boolean
}

export interface Inputs {
  // location / purchase
  locationId: string | null
  housePrice: number

  // context — who you are (constant across a comparison)
  totalLiquidAssets: number
  liquidDownPayment: number
  equitySources: EquitySource[]
  income1: number
  income2: number
  income2Active: boolean
  holdingPeriodYears: number

  // loan
  mortgageRate: number
  loanTermYears: 15 | 30

  // assumptions (pre-filled, rarely touched)
  propertyTaxRate: number
  insuranceRate: number // %/yr of home value
  maintenanceRate: number // %/yr of home value
  closingCostPct: number // % of price, paid by buyer up front
  sellingCostPct: number // % of sale price, paid on exit
  pmiRate: number // %/yr of loan balance while LTV > 80%
  effectiveTaxRate: number // derived from income unless overridden
  taxRateOverride: boolean

  // rent side
  rentToPriceRatio: number // annual; monthly rent = price / ratio / 12
  rentGrowth: number // %/yr

  // projection
  annualAppreciation: number
  investmentReturn: number

  // affordability sanity panel only
  monthlyNonHousingExpenses: number
  discretionaryGoal: number
}

export interface LocationYear {
  medianHomePrice: number
  sfhRent: number // derived SFH-equivalent rent (editable default)
  zoriBlended: number // raw Zillow ZORI, reference floor only
}

export interface Location {
  id: string
  city: string
  district: string
  schoolRating: number // hand-set placeholder
  years: Record<string, LocationYear>
}

export interface Metrics {
  downPayment: number
  downPaymentPct: number
  loanAmount: number
  monthlyPI: number
  monthlyTax: number
  monthlyInsurance: number
  monthlyPITI: number
  grossMonthlyIncome: number
  frontEndDTI: number
  cashReserve: number
  monthsOfReserve: number
  monthlyTakeHome: number
  discretionaryMonthly: number
}

/** Net-wealth series for both households, sampled monthly. */
export interface Simulation {
  months: number
  buy: number[] // net wealth at each month (index 0 = month 0)
  rent: number[]
}

export interface Comparison {
  breakEvenMonth: number | null
  wealthDelta: number // buy − rent at the holding horizon
  equivalentRent: number // rent at which buy == rent at the horizon
  sim: Simulation
}

/** One line on the comparison chart — buy advantage over renting, by year. */
export interface ComparisonSeries {
  id: string
  name: string
  points: { year: number; delta: number }[]
  breakEvenMonth: number | null
  color: string
  emphasis: boolean // the median (0% offset) line is drawn bolder
  dashed: boolean
}
