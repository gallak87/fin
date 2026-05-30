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
  const discretionaryMonthly = inputs.monthlyTakeHome - monthlyPITI - inputs.monthlyNonHousingExpenses

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
  // Uses identical math to projectNetWorth so the pill always matches the chart
  const monthlyRate = inputs.mortgageRate / 100 / 12
  const monthlyPI = monthlyPayment(loanAmount, inputs.mortgageRate, inputs.loanTermYears)
  const monthlySurplus = monthlyPITI - inputs.currentRent
  const investReturn = inputs.investmentReturn / 100
  const appreciation = inputs.annualAppreciation / 100

  let balance = loanAmount
  let homeValue = inputs.housePrice
  let investedDown = downPayment

  for (let year = 1; year <= 30; year++) {
    for (let m = 0; m < 12; m++) {
      const interest = balance * monthlyRate
      balance = Math.max(0, balance - Math.max(0, monthlyPI - interest))
    }
    homeValue *= 1 + appreciation
    investedDown *= 1 + investReturn

    // cashReserve term is identical in both paths so it cancels in the delta
    const buyNetWorth = homeValue - balance
    const rentNetWorth = investedDown - monthlySurplus * 12 * year

    if (buyNetWorth >= rentNetWorth) return year
  }
  return null
}

export function projectTimingBands(inputs: Inputs, years = 10): ScenarioProjection[] {
  const delays = [0, 6, 12, 18, 24]
  const monthlyInvReturn = inputs.investmentReturn / 100 / 12
  const monthlyAppreciation = inputs.annualAppreciation / 100 / 12
  const origDown = totalDownPayment(inputs)

  return delays.map((delayMonths) => {
    const name = delayMonths === 0 ? 'buy now' : `+${delayMonths}mo`

    // Down payment and house price at purchase time
    const adjustedDown = origDown * Math.pow(1 + monthlyInvReturn, delayMonths)
    const adjustedPrice = inputs.housePrice * Math.pow(1 + monthlyAppreciation, delayMonths)
    const loanAmount = Math.max(0, adjustedPrice - adjustedDown)

    const monthlyPI = monthlyPayment(loanAmount, inputs.mortgageRate, inputs.loanTermYears)
    const monthlyTax = (adjustedPrice * inputs.propertyTaxRate) / 100 / 12
    const monthlyInsurance = (adjustedPrice * 0.05) / 100 / 12
    const monthlyPITI = monthlyPI + monthlyTax + monthlyInsurance
    const monthlySurplus = monthlyPITI - inputs.currentRent

    const monthlyRate = inputs.mortgageRate / 100 / 12
    const investReturn = inputs.investmentReturn / 100
    const appreciation = inputs.annualAppreciation / 100

    const points: ProjectionPoint[] = []
    let balance = loanAmount
    let homeValue = adjustedPrice
    let ownershipMonths = 0

    for (let year = 1; year <= years; year++) {
      // How many mortgage months fall within this year's window
      const monthsOwned_prev = Math.max(0, (year - 1) * 12 - delayMonths)
      const monthsOwned_now = Math.max(0, year * 12 - delayMonths)
      const advanceMonths = monthsOwned_now - monthsOwned_prev

      for (let m = 0; m < advanceMonths; m++) {
        const interest = balance * monthlyRate
        balance = Math.max(0, balance - Math.max(0, monthlyPI - interest))
        homeValue *= 1 + appreciation / 12
        ownershipMonths++
      }

      if (ownershipMonths === 0) {
        points.push({ year, buyNetWorth: 0, rentNetWorth: 0 })
        continue
      }

      const ownershipYears = ownershipMonths / 12
      const equity = homeValue - balance
      const investedDown = adjustedDown * Math.pow(1 + investReturn, ownershipYears)
      const buyNetWorth = equity
      const rentNetWorth = investedDown - monthlySurplus * ownershipMonths

      points.push({ year, buyNetWorth, rentNetWorth })
    }

    return { scenarioId: `timing_${delayMonths}`, name, points }
  })
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
