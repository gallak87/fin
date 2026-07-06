import { describe, expect, it } from 'vitest'
import type { Bar, EngineSettings, Strategy } from './types'
import { runBacktest, DEFAULT_SETTINGS } from './engine'
import { STRATEGIES, defaultParams } from './strategies'

function mkBars(specs: [number, number, number, number][]): Bar[] {
  return specs.map(([o, h, l, c], i) => ({
    t: new Date(Date.UTC(2020, 0, 1 + i)).toISOString().slice(0, 10),
    o,
    h,
    l,
    c,
    v: 1000,
  }))
}

const alwaysLong: Strategy = {
  id: 'x',
  name: 'x',
  blurb: '',
  params: [],
  contribution: 'lump',
  init: () => ({ warmup: 0, overlays: [], signalAt: () => 'long', explainAt: () => '' }),
}

const S = (over: Partial<EngineSettings>): EngineSettings => ({
  ...DEFAULT_SETTINGS,
  slippageBps: 0,
  feePerTrade: 0,
  ...over,
})

describe('intrabar exit fills', () => {
  it('stop-loss fills at the level when the bar trades through it', () => {
    const bars = mkBars([
      [100, 101, 99, 100],
      [100, 101, 99, 100], // entry at open 100
      [100, 100, 90, 95], // low 90 pierces stop 92 → fill at 92
      [95, 96, 94, 95],
    ])
    const r = runBacktest(bars, alwaysLong, {}, 10_000, S({ stopPct: 8 }))
    const t = r.trades[0]
    expect(t.entryPrice).toBe(100)
    expect(t.exitReason).toBe('stop')
    expect(t.exitPrice).toBeCloseTo(92, 9)
    expect(r.equity.at(-1)).toBeCloseTo(9200, 6)
  })

  it('gap open below the stop fills at the open, not the stop', () => {
    const bars = mkBars([
      [100, 101, 99, 100],
      [100, 101, 99, 100], // entry 100
      [80, 85, 78, 82], // gaps open at 80, stop was 92 → fill 80
    ])
    const t = runBacktest(bars, alwaysLong, {}, 10_000, S({ stopPct: 8 })).trades[0]
    expect(t.exitReason).toBe('stop')
    expect(t.exitPrice).toBeCloseTo(80, 9)
  })

  it('does not re-enter after a protective exit until a fresh signal edge', () => {
    const bars = mkBars([
      [100, 101, 99, 100],
      [100, 101, 99, 100],
      [100, 100, 90, 95],
      [95, 96, 94, 95],
      [95, 96, 94, 95],
    ])
    const r = runBacktest(bars, alwaysLong, {}, 10_000, S({ stopPct: 8 }))
    expect(r.trades).toHaveLength(1) // signal never goes flat → stays out
  })

  it('take-profit fills at the level intrabar', () => {
    const bars = mkBars([
      [100, 101, 99, 100],
      [100, 101, 99, 100], // entry 100
      [100, 115, 99, 110], // high 115 crosses tp 110 → fill 110
    ])
    const t = runBacktest(bars, alwaysLong, {}, 10_000, S({ tpPct: 10 })).trades[0]
    expect(t.exitReason).toBe('take-profit')
    expect(t.exitPrice).toBeCloseTo(110, 9)
  })

  it('trailing stop ratchets off prior highs, not the current bar', () => {
    const bars = mkBars([
      [100, 101, 99, 100],
      [100, 101, 99, 100], // entry 100, peak=100
      [100, 120, 100, 118], // peak → 120 after today
      [118, 119, 105, 106], // trail 10% of 120 = 108; low 105 → fill 108
    ])
    const t = runBacktest(bars, alwaysLong, {}, 10_000, S({ trailPct: 10 })).trades[0]
    expect(t.exitReason).toBe('trail')
    expect(t.exitPrice).toBeCloseTo(108, 9)
  })

  it('time exit fires at the open after N bars held', () => {
    const bars = mkBars([
      [100, 101, 99, 100],
      [100, 101, 99, 100], // entry i=1
      [101, 102, 100, 101],
      [102, 103, 101, 102],
      [103, 104, 102, 103], // i=4: held 3 bars → exit at open 103
      [104, 105, 103, 104],
    ])
    const t = runBacktest(bars, alwaysLong, {}, 10_000, S({ maxBars: 3 })).trades[0]
    expect(t.exitReason).toBe('time')
    expect(t.exitIdx).toBe(4)
    expect(t.exitPrice).toBeCloseTo(103, 9)
  })
})

describe('friction and sizing', () => {
  it('entry pays slippage and the fee comes out of the buy', () => {
    const bars = mkBars([
      [100, 101, 99, 100],
      [100, 101, 99, 100],
      [100, 101, 99, 100],
    ])
    const t = runBacktest(bars, alwaysLong, {}, 10_000, S({ slippageBps: 10, feePerTrade: 5 })).trades[0]
    expect(t.entryPrice).toBeCloseTo(100.1, 9)
    expect(t.shares).toBeCloseTo((10_000 - 5) / 100.1, 9)
  })

  it('fixed-fraction sizing leaves the rest in cash', () => {
    const bars = mkBars([
      [100, 101, 99, 100],
      [100, 101, 99, 100],
      [100, 101, 99, 200], // close doubles
    ])
    const r = runBacktest(bars, alwaysLong, {}, 10_000, S({ sizingMode: 'fixed', fixedPct: 50 }))
    // 5000 in shares (50 @ 100) → 10000 at close 200, +5000 cash
    expect(r.equity.at(-1)).toBeCloseTo(15_000, 6)
  })
})

describe('regime filter and metrics', () => {
  it('blocks entries while price is below the regime MA', () => {
    const specs: [number, number, number, number][] = []
    for (let i = 0; i < 30; i++) {
      const p = 100 - i
      specs.push([p, p + 0.5, p - 0.5, p])
    }
    const r = runBacktest(mkBars(specs), alwaysLong, {}, 10_000, S({ regimeMaDays: 5 }))
    expect(r.trades).toHaveLength(0)
    expect(r.warmup).toBeGreaterThanOrEqual(4)
  })

  it('exposure ~1 for an always-long strategy', () => {
    const bars = mkBars(Array.from({ length: 10 }, () => [100, 101, 99, 100]))
    const r = runBacktest(bars, alwaysLong, {}, 10_000, S({}))
    expect(r.metrics.exposure).not.toBeNull()
    expect(r.metrics.exposure!).toBeGreaterThan(0.8)
  })
})

describe('every built-in strategy with all knobs on', () => {
  const specs: [number, number, number, number][] = []
  let p = 100
  for (let i = 0; i < 2000; i++) {
    const drift = (Math.sin(i / 50) + 0.02) * 0.8
    const o = p
    const c = Math.max(5, p + drift + (((i * 2654435761) % 100) / 100 - 0.5) * 2)
    specs.push([o, Math.max(o, c) + 0.5, Math.min(o, c) - 0.5, c])
    p = c
  }
  const bars = mkBars(specs)
  const knobs = S({ stopPct: 10, trailPct: 15, tpPct: 30, maxBars: 100, regimeMaDays: 100, sizingMode: 'vol' })

  for (const s of STRATEGIES) {
    it(`${s.id}: finite equity end to end`, () => {
      const r = runBacktest(bars, s, defaultParams(s), 10_000, knobs)
      expect(r.equity.every(Number.isFinite)).toBe(true)
      expect(Number.isFinite(r.metrics.sharpe)).toBe(true)
      expect(r.equity.at(-1)!).toBeGreaterThan(0)
    })
  }
})
