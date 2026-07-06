import { describe, expect, it } from 'vitest'
import type { Metrics } from './types'
import { verdict } from './verdict'

const M = (over: Partial<Metrics>): Metrics => ({
  totalReturn: 1,
  cagr: 0.1,
  maxDrawdown: -0.3,
  sharpe: 1,
  winRate: 0.5,
  numTrades: 20,
  exposure: 0.6,
  ...over,
})

describe('verdict', () => {
  it('flags buy-and-hold-like strategies as the benchmark', () => {
    const v = verdict(M({ numTrades: 1, exposure: 0.99 }), M({}))
    expect(v.text).toMatch(/buy & hold itself/)
  })

  it('celebrates the win-win (more return, shallower drawdown)', () => {
    const v = verdict(M({ totalReturn: 2, maxDrawdown: -0.2 }), M({ totalReturn: 1, maxDrawdown: -0.5 }))
    expect(v.tone).toBe('good')
    expect(v.text).toMatch(/win-win/)
  })

  it('calls out return bought with deeper drawdowns', () => {
    const v = verdict(M({ totalReturn: 2, maxDrawdown: -0.6 }), M({ totalReturn: 1, maxDrawdown: -0.3 }))
    expect(v.tone).toBe('neutral')
    expect(v.text).toMatch(/extra pain/)
  })

  it('prices drawdown insurance when return lags but the ride is smoother', () => {
    // gold 42/200-style: 0.87× on return, much shallower valley
    const v = verdict(M({ totalReturn: 6.4, maxDrawdown: -0.26 }), M({ totalReturn: 7.5, maxDrawdown: -0.45 }))
    expect(v.tone).toBe('neutral')
    expect(v.text).toMatch(/insurance/)
    expect(v.text).toMatch(/%/)
  })

  it('detects whipsaw noise-trading (many trades, few winners, big lag)', () => {
    // gold 13/20-style: 97 trades, 22% winners, 0.27× B&H
    const v = verdict(
      M({ totalReturn: 1.38, maxDrawdown: -0.33, numTrades: 97, winRate: 0.22 }),
      M({ totalReturn: 7.8, maxDrawdown: -0.45 }),
    )
    expect(v.tone).toBe('bad')
    expect(v.text).toMatch(/noise/)
  })

  it('condemns worse return with no smoother ride', () => {
    const v = verdict(M({ totalReturn: 0.5, maxDrawdown: -0.5 }), M({ totalReturn: 1.5, maxDrawdown: -0.45 }))
    expect(v.tone).toBe('bad')
    expect(v.text).toMatch(/subtracts value/)
  })
})
