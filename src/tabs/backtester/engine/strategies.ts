import type { Signal, Strategy } from './types'
import { sma, ema, rsi } from './indicators'

const fmt = (n: number | null) => (n == null ? '—' : n >= 100 ? n.toFixed(0) : n.toFixed(1))

const maCross: Strategy = {
  id: 'ma-cross',
  name: 'MA Crossover',
  blurb: 'Buy when the fast average climbs above the slow one; sell when it drops back below.',
  params: [
    { key: 'fast', label: 'Fast window (days)', min: 5, max: 50, step: 1, default: 20 },
    { key: 'slow', label: 'Slow window (days)', min: 20, max: 200, step: 5, default: 50 },
    { key: 'useEma', label: 'Exponential (EMA)', min: 0, max: 1, step: 1, default: 0, toggle: true },
  ],
  contribution: 'lump',
  init(bars, params) {
    const closes = bars.map((b) => b.c)
    const ma = params.useEma ? ema : sma
    const fast = ma(closes, params.fast)
    const slow = ma(closes, params.slow)
    const warmup = slow.findIndex((x) => x != null)
    const kind = params.useEma ? 'EMA' : 'MA'
    return {
      warmup: warmup === -1 ? bars.length : warmup,
      overlays: [
        { label: `${kind} ${params.fast}`, color: '#60a5fa', values: fast },
        { label: `${kind} ${params.slow}`, color: '#f59e0b', values: slow },
      ],
      signalAt: (i) => (fast[i] != null && slow[i] != null && fast[i]! > slow[i]! ? 'long' : 'flat'),
      explainAt: (i) => {
        if (fast[i] == null || slow[i] == null) return `Warming up — need ${params.slow} days of prices first.`
        return fast[i]! > slow[i]!
          ? `Fast ${kind} ${fmt(fast[i])} above slow ${fmt(slow[i])} — stay in.`
          : `Fast ${kind} ${fmt(fast[i])} below slow ${fmt(slow[i])} — stay out.`
      },
    }
  },
}

const buyHold: Strategy = {
  id: 'buy-hold',
  name: 'Buy & Hold',
  blurb: 'Buy on day one and never sell. The benchmark to beat.',
  params: [],
  contribution: 'lump',
  init() {
    return {
      warmup: 0,
      overlays: [],
      signalAt: () => 'long',
      explainAt: () => 'Fully invested — holding through everything.',
    }
  },
}

const dca: Strategy = {
  id: 'dca',
  name: 'Dollar-Cost Avg',
  blurb: 'Invest the same amount every month, whatever the price.',
  params: [],
  contribution: 'monthly',
  init() {
    return {
      warmup: 0,
      overlays: [],
      signalAt: () => 'long',
      explainAt: () => 'Buying a fixed amount on the first trading day of each month.',
    }
  },
}

const rsiDip: Strategy = {
  id: 'rsi',
  name: 'RSI Dip Buyer',
  blurb: 'Buy when the market looks oversold (RSI low), sell when it recovers (RSI high).',
  params: [
    { key: 'period', label: 'RSI period (days)', min: 5, max: 30, step: 1, default: 14 },
    { key: 'buyBelow', label: 'Buy below', min: 10, max: 45, step: 1, default: 30 },
    { key: 'sellAbove', label: 'Sell above', min: 55, max: 90, step: 1, default: 70 },
  ],
  contribution: 'lump',
  init(bars, params) {
    const values = rsi(bars.map((b) => b.c), params.period)
    const warmup = values.findIndex((x) => x != null)
    // stateful: enter on dip below buyBelow, hold until recovery above sellAbove
    const signals: Signal[] = new Array(bars.length).fill('flat')
    let inPos = false
    for (let i = 0; i < bars.length; i++) {
      const r = values[i]
      if (r == null) continue
      if (!inPos && r < params.buyBelow) inPos = true
      else if (inPos && r > params.sellAbove) inPos = false
      signals[i] = inPos ? 'long' : 'flat'
    }
    return {
      warmup: warmup === -1 ? bars.length : warmup,
      overlays: [],
      rsi: { values, buyBelow: params.buyBelow, sellAbove: params.sellAbove },
      signalAt: (i) => signals[i],
      explainAt: (i) => {
        const r = values[i]
        if (r == null) return `Warming up — need ${params.period + 1} days of prices first.`
        if (signals[i] === 'long')
          return r > params.sellAbove
            ? `RSI ${fmt(r)} — recovered, selling.`
            : `RSI ${fmt(r)} — in position, waiting for recovery above ${params.sellAbove}.`
        return r < params.buyBelow
          ? `RSI ${fmt(r)} — oversold, buying.`
          : `RSI ${fmt(r)} — waiting for a dip below ${params.buyBelow}.`
      },
    }
  },
}

export const STRATEGIES: Strategy[] = [maCross, buyHold, dca, rsiDip]

export function getStrategy(id: string): Strategy {
  return STRATEGIES.find((s) => s.id === id) ?? STRATEGIES[0]
}

export function defaultParams(s: Strategy): Record<string, number> {
  return Object.fromEntries(s.params.map((p) => [p.key, p.default]))
}
