import { describe, it, expect } from 'vitest'
import { EXAMPLE } from './personal.example'
import { buildPlan, gainsTax, monthlyPayment } from './model'
import type { Knobs } from './model'

// Runs against the committed placeholders, so it works in a clean checkout.
const KNOBS: Knobs = {
  btcPrice: 100_000,
  liquidInvestments: 300_000,
  housePrice: 1_000_000,
  mortgageRate: 6.5,
  reserve: 40_000,
}

describe('monthlyPayment', () => {
  it('matches a known amortization', () => {
    expect(monthlyPayment(750_000, 6.5, 30)).toBeCloseTo(4740.51, 2)
  })

  it('handles a zero-interest loan as straight division', () => {
    expect(monthlyPayment(360_000, 0, 30)).toBeCloseTo(1000, 6)
  })

  it('is zero when nothing is borrowed', () => {
    expect(monthlyPayment(0, 6.5, 30)).toBe(0)
  })
})

describe('gainsTax', () => {
  it('charges nothing when the price is at cost basis', () => {
    const t = gainsTax(EXAMPLE, EXAMPLE.btcCostBasis)
    expect(t.gain).toBe(0)
    expect(t.total).toBe(0)
  })

  it('never reports a negative gain below cost basis', () => {
    expect(gainsTax(EXAMPLE, EXAMPLE.btcCostBasis / 2).gain).toBe(0)
  })

  it('spends prior-year losses against the gain with no $3k ceiling', () => {
    // 1 coin, 20k basis, sold at 100k -> 80k raw gain, less the 10k carryforward
    const t = gainsTax(EXAMPLE, 100_000)
    expect(t.grossGain).toBe(80_000)
    expect(t.carryforwardUsed).toBe(10_000)
    expect(t.gain).toBe(70_000)
  })

  it('never spends more carryforward than there is gain', () => {
    const t = gainsTax({ ...EXAMPLE, capitalLossCarryforward: 999_999 }, 100_000)
    expect(t.carryforwardUsed).toBe(t.grossGain)
    expect(t.gain).toBe(0)
    expect(t.total).toBe(0)
  })

  it('charges the surtax only on income above the threshold', () => {
    // net gain 70k on 200k income puts 20k over the 250k threshold
    const t = gainsTax(EXAMPLE, 100_000)
    expect(t.federal).toBeCloseTo(10_500, 6)
    expect(t.niit).toBeCloseTo(20_000 * 0.038, 6)
    expect(t.total).toBeCloseTo(10_500 + 760, 6)
  })

  it('drops the surtax entirely when losses pull income under the threshold', () => {
    const t = gainsTax({ ...EXAMPLE, capitalLossCarryforward: 65_000 }, 100_000)
    expect(t.gain).toBe(15_000) // 200k + 15k = 215k, under the 250k threshold
    expect(t.niit).toBe(0)
  })

  it('exempts state gains below the state deduction', () => {
    expect(gainsTax(EXAMPLE, 100_000).state).toBe(0)
  })
})

describe('buildPlan', () => {
  it('totals what you pay today from rentals, payoffs and rent', () => {
    const p = buildPlan(EXAMPLE, KNOBS)
    // rental drag 100 + payoffs 1100 + rent 3000
    expect(p.todayMonthly).toBeCloseTo(4_200, 6)
    expect(p.rentingAfterPayoffs).toBeCloseTo(3_100, 6)
  })

  it('splits the pool into reserve and down payment without losing a dollar', () => {
    const p = buildPlan(EXAMPLE, KNOBS)
    expect(p.reserve + p.downPayment).toBeCloseTo(p.available, 6)
    expect(p.afterTax - p.payoffTotal - p.closingCosts).toBeCloseTo(p.available, 6)
  })

  it('lands the loan exactly on the deduction cap at priceOnCap', () => {
    const p = buildPlan(EXAMPLE, KNOBS)
    const onCap = buildPlan(EXAMPLE, { ...KNOBS, housePrice: p.priceOnCap })
    expect(onCap.loanAmount).toBeCloseTo(EXAMPLE.deductionCap, 4)
    expect(onCap.aboveCap).toBeCloseTo(0, 4)
  })

  it('prices the non-deductible slice at the full mortgage rate', () => {
    const p = buildPlan(EXAMPLE, { ...KNOBS, housePrice: 1_400_000 })
    expect(p.aboveCap).toBeGreaterThan(0)
    expect(p.aboveCapAnnualCost).toBeCloseTo(p.aboveCap * 0.065, 6)
  })

  it('cannot spend a reserve larger than the pool', () => {
    const p = buildPlan(EXAMPLE, { ...KNOBS, reserve: 10_000_000 })
    expect(p.downPayment).toBe(0)
    expect(p.reserve).toBeCloseTo(p.available, 6)
  })

  it('counts the brokerage slider alongside the bank balances', () => {
    const p = buildPlan(EXAMPLE, KNOBS)
    expect(p.bankTotal).toBe(75_000)
    expect(p.accountsTotal).toBe(75_000 + KNOBS.liquidInvestments)
  })

  it('falls back to a full-price loan when there is nothing to put down', () => {
    const broke = { ...EXAMPLE, accounts: [], btcUsable: 0 }
    const p = buildPlan(broke, { ...KNOBS, liquidInvestments: 0 })
    expect(p.downPayment).toBe(0)
    expect(p.loanAmount).toBe(KNOBS.housePrice)
  })
})
