import type { Signal, Strategy } from './types'
import { sma, ema, rsi, macd, bollinger, donchian, roc, drawdownFromPeak } from './indicators'

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
      strip: {
        label: `RSI — buy below ${params.buyBelow}, sell above ${params.sellAbove}`,
        series: [{ label: 'RSI', color: '#a78bfa', values }],
        guides: [params.buyBelow, params.sellAbove],
        range: { min: 0, max: 100 },
      },
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

const macdTrend: Strategy = {
  id: 'macd',
  name: 'MACD Trend',
  blurb: 'Buy when short-term momentum (MACD) crosses above its signal line; sell when it crosses back.',
  params: [
    { key: 'fast', label: 'Fast EMA (days)', min: 5, max: 20, step: 1, default: 12 },
    { key: 'slow', label: 'Slow EMA (days)', min: 20, max: 60, step: 1, default: 26 },
    { key: 'signal', label: 'Signal EMA (days)', min: 3, max: 20, step: 1, default: 9 },
  ],
  contribution: 'lump',
  init(bars, params) {
    const m = macd(bars.map((b) => b.c), params.fast, params.slow, params.signal)
    const warmup = m.signal.findIndex((x) => x != null)
    const above = (i: number) => m.macd[i] != null && m.signal[i] != null && m.macd[i]! > m.signal[i]!
    return {
      warmup: warmup === -1 ? bars.length : warmup,
      overlays: [],
      strip: {
        label: `MACD ${params.fast}/${params.slow}/${params.signal}`,
        series: [
          { label: 'MACD', color: '#60a5fa', values: m.macd },
          { label: 'signal', color: '#f59e0b', values: m.signal },
        ],
        guides: [0],
      },
      signalAt: (i) => (above(i) ? 'long' : 'flat'),
      explainAt: (i) => {
        if (m.signal[i] == null) return 'Warming up — MACD needs more history.'
        return above(i)
          ? `MACD ${fmt(m.macd[i])} above signal ${fmt(m.signal[i])} — momentum up, stay in.`
          : `MACD ${fmt(m.macd[i])} below signal ${fmt(m.signal[i])} — momentum down, stay out.`
      },
    }
  },
}

const donchianBreakout: Strategy = {
  id: 'donchian',
  name: 'Donchian Breakout',
  blurb: 'Buy when price breaks above its recent high; sell when it falls below its recent low. Classic turtle-style trend following.',
  params: [
    { key: 'entry', label: 'Entry channel (days)', min: 10, max: 120, step: 5, default: 55 },
    { key: 'exit', label: 'Exit channel (days)', min: 5, max: 60, step: 5, default: 20 },
  ],
  contribution: 'lump',
  init(bars, params) {
    const highs = bars.map((b) => b.h)
    const lows = bars.map((b) => b.l)
    const entryCh = donchian(highs, lows, params.entry)
    const exitCh = donchian(highs, lows, params.exit)
    const warmup = entryCh.upper.findIndex((x) => x != null)
    // stateful: break above prior entry-high → long; close below prior exit-low → flat
    const signals: Signal[] = new Array(bars.length).fill('flat')
    let inPos = false
    for (let i = 1; i < bars.length; i++) {
      const hi = entryCh.upper[i - 1]
      const lo = exitCh.lower[i - 1]
      if (!inPos && hi != null && bars[i].c > hi) inPos = true
      else if (inPos && lo != null && bars[i].c < lo) inPos = false
      signals[i] = inPos ? 'long' : 'flat'
    }
    return {
      warmup: warmup === -1 ? bars.length : warmup,
      overlays: [
        { label: `${params.entry}d high`, color: '#22c55e', values: entryCh.upper },
        { label: `${params.exit}d low`, color: '#ef4444', values: exitCh.lower },
      ],
      signalAt: (i) => signals[i],
      explainAt: (i) => {
        if (entryCh.upper[i] == null) return `Warming up — need ${params.entry} days of prices first.`
        return signals[i] === 'long'
          ? `In position — holding until price closes below the ${params.exit}-day low (${fmt(exitCh.lower[i])}).`
          : `Waiting for a close above the ${params.entry}-day high (${fmt(entryCh.upper[i])}).`
      },
    }
  },
}

const bollingerRevert: Strategy = {
  id: 'bollinger',
  name: 'Bollinger Reversion',
  blurb: 'Buy when price drops below the lower band (stretched down); sell when it recovers to the middle.',
  params: [
    { key: 'period', label: 'Band period (days)', min: 10, max: 50, step: 1, default: 20 },
    { key: 'width', label: 'Band width (std devs ×10)', min: 10, max: 30, step: 5, default: 20 },
  ],
  contribution: 'lump',
  init(bars, params) {
    const closes = bars.map((b) => b.c)
    const bands = bollinger(closes, params.period, params.width / 10)
    const warmup = bands.mid.findIndex((x) => x != null)
    const signals: Signal[] = new Array(bars.length).fill('flat')
    let inPos = false
    for (let i = 0; i < bars.length; i++) {
      if (bands.mid[i] == null) continue
      if (!inPos && closes[i] < bands.lower[i]!) inPos = true
      else if (inPos && closes[i] > bands.mid[i]!) inPos = false
      signals[i] = inPos ? 'long' : 'flat'
    }
    return {
      warmup: warmup === -1 ? bars.length : warmup,
      overlays: [
        { label: 'upper band', color: '#6b7280', values: bands.upper },
        { label: `SMA ${params.period}`, color: '#f59e0b', values: bands.mid },
        { label: 'lower band', color: '#6b7280', values: bands.lower },
      ],
      signalAt: (i) => signals[i],
      explainAt: (i) => {
        if (bands.mid[i] == null) return `Warming up — need ${params.period} days of prices first.`
        return signals[i] === 'long'
          ? `In position — waiting for a recovery above the middle band (${fmt(bands.mid[i])}).`
          : `Waiting for price to stretch below the lower band (${fmt(bands.lower[i])}).`
      },
    }
  },
}

const momentum: Strategy = {
  id: 'momentum',
  name: 'Momentum (ROC)',
  blurb: 'Stay in while the trailing return is positive; step out when it goes negative. Time-series momentum.',
  params: [{ key: 'lookback', label: 'Lookback (days)', min: 21, max: 252, step: 7, default: 126 }],
  contribution: 'lump',
  init(bars, params) {
    const values = roc(bars.map((b) => b.c), params.lookback)
    const warmup = values.findIndex((x) => x != null)
    return {
      warmup: warmup === -1 ? bars.length : warmup,
      overlays: [],
      strip: {
        label: `${params.lookback}-day rate of change (%)`,
        series: [{ label: 'ROC', color: '#34d399', values }],
        guides: [0],
      },
      signalAt: (i) => (values[i] != null && values[i]! > 0 ? 'long' : 'flat'),
      explainAt: (i) => {
        if (values[i] == null) return `Warming up — need ${params.lookback} days of prices first.`
        return values[i]! > 0
          ? `Up ${fmt(values[i])}% over the lookback — momentum positive, stay in.`
          : `Down ${fmt(values[i])}% over the lookback — momentum negative, stay out.`
      },
    }
  },
}

const dipBuyer: Strategy = {
  id: 'dip',
  name: 'Drawdown Dip Buyer',
  blurb: 'Buy after price falls a set % from its all-time peak; sell once it climbs back near the peak. Knife-catching, made honest.',
  params: [
    { key: 'buyDown', label: 'Buy when down (%)', min: 5, max: 50, step: 1, default: 20 },
    { key: 'sellNear', label: 'Sell when within (%) of peak', min: 0, max: 20, step: 1, default: 2 },
  ],
  contribution: 'lump',
  init(bars, params) {
    const dd = drawdownFromPeak(bars.map((b) => b.c))
    const signals: Signal[] = new Array(bars.length).fill('flat')
    let inPos = false
    for (let i = 0; i < bars.length; i++) {
      const d = dd[i]!
      if (!inPos && d <= -params.buyDown) inPos = true
      else if (inPos && d >= -params.sellNear) inPos = false
      signals[i] = inPos ? 'long' : 'flat'
    }
    return {
      warmup: 0,
      overlays: [],
      strip: {
        label: `Drawdown from peak — buy at −${params.buyDown}%`,
        series: [{ label: 'drawdown', color: '#f87171', values: dd }],
        guides: [-params.buyDown, -params.sellNear],
      },
      signalAt: (i) => signals[i],
      explainAt: (i) => {
        const d = dd[i]!
        return signals[i] === 'long'
          ? `Down ${fmt(-d)}% from peak — holding until within ${params.sellNear}% of the peak.`
          : d <= -params.buyDown
            ? `Down ${fmt(-d)}% — buying the dip.`
            : `Down ${fmt(-d)}% from peak — waiting for a ${params.buyDown}% drawdown.`
      },
    }
  },
}

export const STRATEGIES: Strategy[] = [
  maCross,
  buyHold,
  dca,
  rsiDip,
  macdTrend,
  donchianBreakout,
  bollingerRevert,
  momentum,
  dipBuyer,
]

export function getStrategy(id: string): Strategy {
  return STRATEGIES.find((s) => s.id === id) ?? STRATEGIES[0]
}

export function defaultParams(s: Strategy): Record<string, number> {
  return Object.fromEntries(s.params.map((p) => [p.key, p.default]))
}
