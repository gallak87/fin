import type {
  Inputs,
  Metrics,
  Simulation,
  Comparison,
  ComparisonSeries,
  Location,
} from './types'
import locationsData from '../../data/locations.json'

export const LOCATIONS = (locationsData.locations as Location[])

export function getLocation(id: string | null): Location | null {
  if (!id) return null
  return LOCATIONS.find((l) => l.id === id) ?? null
}

/** Latest year key present in a location's data (e.g. "2026"). */
export function latestYear(loc: Location): string {
  return Object.keys(loc.years).sort().at(-1)!
}

/** Latest median home price for a location. */
export function medianPrice(id: string): number {
  const loc = getLocation(id)
  if (!loc) return 0
  return loc.years[latestYear(loc)].medianHomePrice
}

/** One base hue per city; price-offset shade-lines vary lightness within it. */
const CITY_HUE: Record<string, number> = {
  kirkland: 217, // blue
  redmond: 152, // green
  bellevue: 38, // amber
  woodinville: 268, // violet
  sammamish: 330, // pink
}

export function lineColor(cityId: string, offsetPct: number): string {
  const h = CITY_HUE[cityId] ?? 217
  const l = Math.max(34, Math.min(70, 52 + (offsetPct / 25) * 16))
  return `hsl(${h} 68% ${l}%)`
}

/** Monthly rent for an equivalent home at this price. */
export function monthlyRent(inputs: Inputs): number {
  return inputs.housePrice / inputs.rentToPriceRatio / 12
}

export function monthlyPayment(principal: number, annualRate: number, termYears: number): number {
  if (principal <= 0) return 0
  const r = annualRate / 100 / 12
  const n = termYears * 12
  if (r === 0) return principal / n
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

/** Rough federal (MFJ-ish) effective rate from gross household income. Editable in UI. */
export function deriveEffectiveTaxRate(grossAnnual: number): number {
  const brackets = [
    [0, 0.1],
    [23_850, 0.12],
    [96_950, 0.22],
    [206_700, 0.24],
    [394_600, 0.32],
    [501_050, 0.35],
    [751_600, 0.37],
  ] as const
  let tax = 0
  for (let i = 0; i < brackets.length; i++) {
    const [floor, rate] = brackets[i]
    const ceil = i + 1 < brackets.length ? brackets[i + 1][0] : Infinity
    if (grossAnnual > floor) tax += (Math.min(grossAnnual, ceil) - floor) * rate
    else break
  }
  return grossAnnual > 0 ? Math.round((tax / grossAnnual) * 100) : 0
}

export function totalDownPayment(inputs: Inputs): number {
  const equity = inputs.equitySources
    .filter((s) => s.include)
    .reduce((sum, s) => sum + s.amount, 0)
  return inputs.liquidDownPayment + equity
}

/** Total starting wealth — identical for both households. */
export function startingWealth(inputs: Inputs): number {
  const equity = inputs.equitySources
    .filter((s) => s.include)
    .reduce((sum, s) => sum + s.amount, 0)
  return inputs.totalLiquidAssets + equity
}

export function effectiveTaxRate(inputs: Inputs): number {
  if (inputs.taxRateOverride) return inputs.effectiveTaxRate
  const gross = inputs.income1 + (inputs.income2Active ? inputs.income2 : 0)
  return deriveEffectiveTaxRate(gross)
}

/**
 * Two identical households, simulated month by month.
 * Buyer sinks down payment + closing into the house; renter keeps it invested.
 * Whoever spends less on housing each month invests the difference.
 * Returns net wealth for each, sampled at every month (index 0 = today).
 */
export function simulate(
  inputs: Inputs,
  months = inputs.holdingPeriodYears * 12,
  rentOverride?: number,
): Simulation {
  const price = inputs.housePrice
  const down = totalDownPayment(inputs)
  const loan0 = Math.max(0, price - down)
  const closing = price * (inputs.closingCostPct / 100)
  const W = startingWealth(inputs)

  const monthlyPI = monthlyPayment(loan0, inputs.mortgageRate, inputs.loanTermYears)
  const mRate = inputs.mortgageRate / 100 / 12
  const invM = inputs.investmentReturn / 100 / 12
  const apprM = inputs.annualAppreciation / 100 / 12
  const rentM = inputs.rentGrowth / 100 / 12
  const sellPct = inputs.sellingCostPct / 100

  let buyerLiquid = W - down - closing
  let renterLiquid = W
  let balance = loan0
  let homeValue = price
  let rent = rentOverride ?? monthlyRent(inputs)

  const buy: number[] = []
  const rentSeries: number[] = []

  const netBuy = () => buyerLiquid + (homeValue - sellPct * homeValue - balance)
  buy.push(netBuy())
  rentSeries.push(renterLiquid)

  for (let m = 1; m <= months; m++) {
    // monthly carrying costs for the owner
    const tax = (homeValue * (inputs.propertyTaxRate / 100)) / 12
    const ins = (homeValue * (inputs.insuranceRate / 100)) / 12
    const maint = (homeValue * (inputs.maintenanceRate / 100)) / 12
    const pmi =
      balance > 0.8 * price ? (balance * (inputs.pmiRate / 100)) / 12 : 0
    const buyerOut = monthlyPI + tax + ins + maint + pmi
    const renterOut = rent

    // whoever spends less invests the difference
    const maxOut = Math.max(buyerOut, renterOut)
    buyerLiquid = buyerLiquid * (1 + invM) + (maxOut - buyerOut)
    renterLiquid = renterLiquid * (1 + invM) + (maxOut - renterOut)

    // amortize
    const interest = balance * mRate
    balance = Math.max(0, balance - Math.max(0, monthlyPI - interest))

    // appreciate / inflate
    homeValue *= 1 + apprM
    rent *= 1 + rentM

    buy.push(netBuy())
    rentSeries.push(renterLiquid)
  }

  return { months, buy, rent: rentSeries }
}

export function compare(inputs: Inputs): Comparison {
  const sim = simulate(inputs)
  const h = inputs.holdingPeriodYears * 12
  const wealthDelta = sim.buy[h] - sim.rent[h]

  let breakEvenMonth: number | null = null
  for (let m = 1; m < sim.buy.length; m++) {
    if (sim.buy[m] >= sim.rent[m]) {
      breakEvenMonth = m
      break
    }
  }

  return { breakEvenMonth, wealthDelta, equivalentRent: equivalentRent(inputs), sim }
}

/**
 * Rent at which buying and renting end at the same net wealth at the horizon.
 * Buyer net is independent of rent; renter net falls as rent rises, so the
 * buy−rent gap increases monotonically with rent → bisection is safe.
 * Reading: if an equivalent rental costs MORE than this, buying wins.
 */
export function equivalentRent(inputs: Inputs): number {
  const h = inputs.holdingPeriodYears * 12
  const delta = (rent: number) => {
    const s = simulate(inputs, h, rent)
    return s.buy[h] - s.rent[h]
  }
  let lo = 0
  let hi = 30_000
  if (delta(hi) < 0) return hi // buying never wins even at sky-high rent
  if (delta(lo) > 0) return 0 // buying wins even at $0 rent
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (delta(mid) > 0) hi = mid
    else lo = mid
  }
  return Math.round((lo + hi) / 2)
}

/** How many years of buy-advantage curve to draw. */
export function chartHorizonYears(inputs: Inputs): number {
  return Math.min(30, Math.max(inputs.holdingPeriodYears, 15))
}

/** Price offsets (%) available as shade-lines under the price slider. */
export const PRICE_OFFSETS = [-25, -15, -5, 0, 5]

function fmtPrice(p: number): string {
  return p >= 1_000_000 ? `$${(p / 1_000_000).toFixed(2)}M` : `$${Math.round(p / 1000)}k`
}

/**
 * Build the chart's family of buy-advantage curves: one line per
 * (selected city × active price offset). Each city keeps its own base price;
 * offsets shade around it. Rent derives from each line's price.
 */
export function sweep(
  inputs: Inputs,
  cities: { id: string; price: number }[],
  offsets: number[],
): ComparisonSeries[] {
  const years = chartHorizonYears(inputs)
  const months = years * 12
  const single = cities.length === 1
  const sortedOffsets = [...offsets].sort((a, b) => a - b)

  const out: ComparisonSeries[] = []
  for (const { id, price } of cities) {
    const loc = getLocation(id)
    for (const offset of sortedOffsets) {
      const p = Math.round(price * (1 + offset / 100))
      const vi = { ...inputs, locationId: id, housePrice: p }
      const sim = simulate(vi, months)
      const points = []
      for (let yr = 0; yr <= years; yr++) {
        const m = yr * 12
        points.push({ year: yr, delta: Math.round(sim.buy[m] - sim.rent[m]) })
      }
      let breakEvenMonth: number | null = null
      for (let m = 1; m < sim.buy.length; m++) {
        if (sim.buy[m] >= sim.rent[m]) {
          breakEvenMonth = m
          break
        }
      }
      const cityLabel = loc?.city ?? id
      const name =
        offset === 0
          ? single
            ? fmtPrice(p)
            : cityLabel
          : `${single ? '' : cityLabel + ' '}${offset > 0 ? '+' : ''}${offset}% (${fmtPrice(p)})`
      out.push({
        id: `${id}_${offset}`,
        name,
        points,
        breakEvenMonth,
        color: lineColor(id, offset),
        emphasis: offset === 0,
        dashed: offset !== 0,
      })
    }
  }
  return out
}

/** Affordability sanity metrics only — the comparison engine owns break-even now. */
export function computeMetrics(inputs: Inputs): Metrics {
  const downPayment = totalDownPayment(inputs)
  const loanAmount = Math.max(0, inputs.housePrice - downPayment)
  const downPaymentPct = inputs.housePrice > 0 ? (downPayment / inputs.housePrice) * 100 : 0

  const monthlyPI = monthlyPayment(loanAmount, inputs.mortgageRate, inputs.loanTermYears)
  const monthlyTax = (inputs.housePrice * inputs.propertyTaxRate) / 100 / 12
  const monthlyInsurance = (inputs.housePrice * inputs.insuranceRate) / 100 / 12
  const monthlyPITI = monthlyPI + monthlyTax + monthlyInsurance

  const grossAnnual = inputs.income1 + (inputs.income2Active ? inputs.income2 : 0)
  const grossMonthlyIncome = grossAnnual / 12
  const frontEndDTI = grossMonthlyIncome > 0 ? (monthlyPITI / grossMonthlyIncome) * 100 : 0

  const cashReserve = inputs.totalLiquidAssets - inputs.liquidDownPayment
  const monthlyExpenses = inputs.monthlyNonHousingExpenses + monthlyPITI
  const monthsOfReserve = monthlyExpenses > 0 ? cashReserve / monthlyExpenses : 0

  const monthlyTakeHome = grossMonthlyIncome * (1 - effectiveTaxRate(inputs) / 100)
  const discretionaryMonthly = monthlyTakeHome - monthlyPITI - inputs.monthlyNonHousingExpenses

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
    monthlyTakeHome,
    discretionaryMonthly,
  }
}
