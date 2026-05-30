import type { Inputs, Metrics, ProjectionPoint, ScenarioProjection } from '../types'

export function monthlyPayment(principal: number, annualRate: number, termYears: number): number {
  if (principal <= 0) return 0
  const r = annualRate / 100 / 12
  const n = termYears * 12
  if (r === 0) return principal / n
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

export function totalDownPayment(inputs: Inputs): number {
  const equity = inputs.equitySources
    .filter(s => s.include)
    .reduce((sum, s) => sum + s.amount, 0)
  return inputs.liquidAssets + equity
}

export function computeMetrics(inputs: Inputs): Metrics {
  const downPayment = totalDownPayment(inputs)
  const loanAmount = Math.max(0, inputs.housePrice - downPayment)
  const downPaymentPct = inputs.housePrice > 0 ? (downPayment / inputs.housePrice) * 100 : 0

  const monthlyPI = monthlyPayment(loanAmount, inputs.mortgageRate, inputs.loanTermYears)
  const monthlyTax = (inputs.housePrice * inputs.propertyTaxRate) / 100 / 12
  const monthlyInsurance = (inputs.housePrice * 0.05) / 100 / 12
  const monthlyPITI = monthlyPI + monthlyTax + monthlyInsurance

  const grossMonthlyIncome =
    (inputs.income1 + (inputs.income2Active ? inputs.income2 : 0)) / 12
  const frontEndDTI = grossMonthlyIncome > 0 ? (monthlyPITI / grossMonthlyIncome) * 100 : 0

  // Cash left after purchase (liquid assets only — equity sources converted to down payment)
  const equityUsed = inputs.equitySources
    .filter(s => s.include)
    .reduce((sum, s) => sum + s.amount, 0)
  const cashReserve = inputs.liquidAssets - (downPayment - equityUsed)
  const monthlyExpenses = inputs.monthlyNonHousingExpenses + monthlyPITI
  const monthsOfReserve = monthlyExpenses > 0 ? cashReserve / monthlyExpenses : 0

  const opportunityCostAnnual = downPayment * (inputs.investmentReturn / 100)
  const discretionaryMonthly = grossMonthlyIncome - monthlyPITI - inputs.monthlyNonHousingExpenses

  const breakEvenYear = computeBreakEven(inputs, downPayment, loanAmount, monthlyPITI)

  return {
    downPayment,
    downPaymentPct,
    loanAmount,
    monthlyPI,
    monthlyTax,
    monthlyInsurance,
    monthlyPITI,
    grossMonthlyIncome,
    frontEndDTI,
    cashReserve,
    monthsOfReserve,
    opportunityCostAnnual,
    discretionaryMonthly,
    breakEvenYear,
  }
}

function computeBreakEven(
  inputs: Inputs,
  downPayment: number,
  loanAmount: number,
  monthlyPITI: number,
): number | null {
  const monthlyRate = inputs.mortgageRate / 100 / 12
  const n = inputs.loanTermYears * 12
  let balance = loanAmount

  let cumulativeBuyCost = downPayment
  let cumulativeRentCost = 0
  let homeValue = inputs.housePrice
  const investReturn = inputs.investmentReturn / 100
  const appreciation = inputs.annualAppreciation / 100

  // Track what the down payment would be worth if invested instead
  let investedDown = downPayment

  for (let year = 1; year <= 30; year++) {
    for (let m = 0; m < 12; m++) {
      const interest = balance * monthlyRate
      const principal = Math.min(balance, monthlyPITI - interest > 0 ? monthlyPITI - interest : 0)
      balance = Math.max(0, balance - principal)
      cumulativeBuyCost += monthlyPITI
      cumulativeRentCost += inputs.currentRent
    }
    homeValue *= 1 + appreciation
    investedDown *= 1 + investReturn
    // monthly rent surplus vs PITI also invested
    const annualRentSurplus = (monthlyPITI - inputs.currentRent) * 12

    const buyNetWorth = homeValue - balance - cumulativeBuyCost + downPayment
    const rentNetWorth = investedDown + annualRentSurplus * year - cumulativeRentCost

    if (buyNetWorth >= rentNetWorth) return year
  }
  return null
}

export function projectNetWorth(
  scenarios: { id: string; name: string; inputs: Inputs }[],
  years = 10,
): ScenarioProjection[] {
  return scenarios.map(({ id, name, inputs }) => {
    const metrics = computeMetrics(inputs)
    const monthlyRate = inputs.mortgageRate / 100 / 12
    let balance = metrics.loanAmount
    let homeValue = inputs.housePrice
    let investedDown = metrics.downPayment
    const investReturn = inputs.investmentReturn / 100
    const appreciation = inputs.annualAppreciation / 100
    const monthlySurplus = metrics.monthlyPITI - inputs.currentRent

    const points: ProjectionPoint[] = []

    for (let year = 1; year <= years; year++) {
      for (let m = 0; m < 12; m++) {
        const interest = balance * monthlyRate
        const principal = Math.max(0, metrics.monthlyPI - interest)
        balance = Math.max(0, balance - principal)
      }
      homeValue *= 1 + appreciation
      investedDown *= 1 + investReturn

      const equity = homeValue - balance
      const buyNetWorth = equity + metrics.cashReserve * Math.pow(1 + investReturn, year)
      const rentNetWorth =
        investedDown +
        metrics.cashReserve * Math.pow(1 + investReturn, year) -
        monthlySurplus * 12 * year

      points.push({ year, buyNetWorth, rentNetWorth })
    }

    return { scenarioId: id, name, points }
  })
}
