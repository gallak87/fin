export interface EquitySource {
  id: string
  name: string
  amount: number
  include: boolean
}

export interface Inputs {
  housePrice: number
  totalLiquidAssets: number
  liquidDownPayment: number
  equitySources: EquitySource[]
  mortgageRate: number
  loanTermYears: 15 | 30
  propertyTaxRate: number
  income1: number
  income2: number
  income2Active: boolean
  effectiveTaxRate: number
  discretionaryGoal: number
  annualAppreciation: number
  investmentReturn: number
  currentRent: number
  monthlyNonHousingExpenses: number
}

export interface Scenario {
  id: string
  name: string
  inputs: Inputs
  createdAt: number
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
  opportunityCostAnnual: number
  monthlyTakeHome: number
  discretionaryMonthly: number
  breakEvenYear: number | null
}

export interface ProjectionPoint {
  year: number
  buyNetWorth: number
  rentNetWorth: number
}

export interface ScenarioProjection {
  scenarioId: string
  name: string
  points: ProjectionPoint[]
}
