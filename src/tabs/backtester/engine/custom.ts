import type { Signal, Strategy, StrategyRun } from './types'
import * as indicators from './indicators'

export const CUSTOM_ID = 'custom'

export const CUSTOM_META = {
  id: CUSTOM_ID,
  name: 'Custom (JS)',
  blurb: 'Write your own rule in JavaScript — full access to bars and the built-in indicators.',
}

export const DEFAULT_CUSTOM_CODE = `// Body of init(bars, ind). bars = [{t,o,h,l,c,v}], ind = indicators.
// Available: ind.sma, ind.ema, ind.rsi, ind.macd, ind.bollinger,
//            ind.donchian, ind.roc, ind.drawdownFromPeak, ind.atr
// Return { warmup, signalAt, overlays?, strip?, explainAt? }.

const closes = bars.map(b => b.c)
const fast = ind.ema(closes, 21)
const slow = ind.sma(closes, 100)
const warmup = slow.findIndex(x => x != null)

return {
  warmup: warmup === -1 ? bars.length : warmup,
  overlays: [
    { label: 'EMA 21', color: '#60a5fa', values: fast },
    { label: 'SMA 100', color: '#f59e0b', values: slow },
  ],
  signalAt: i => (fast[i] != null && slow[i] != null && fast[i] > slow[i] ? 'long' : 'flat'),
  explainAt: i =>
    slow[i] == null
      ? 'Warming up.'
      : fast[i] > slow[i]
        ? 'Fast EMA above slow SMA — stay in.'
        : 'Fast EMA below slow SMA — stay out.',
}
`

/**
 * Compile user code into a Strategy. The code is the body of init(bars, ind)
 * and must return { warmup, signalAt, ... }. Throws on syntax/shape errors;
 * runtime errors inside signalAt surface when the backtest runs.
 */
export function compileCustomStrategy(code: string): Strategy {
  const fn = new Function('bars', 'ind', `"use strict";\n${code}`) as (
    bars: unknown,
    ind: typeof indicators,
  ) => Partial<StrategyRun> | undefined

  return {
    id: CUSTOM_ID,
    name: CUSTOM_META.name,
    blurb: CUSTOM_META.blurb,
    params: [],
    contribution: 'lump',
    init(bars) {
      const raw = fn(bars, indicators)
      if (!raw || typeof raw !== 'object') throw new Error('Code must return an object.')
      if (typeof raw.signalAt !== 'function') throw new Error('Returned object needs a signalAt(i) function.')
      const warmup =
        typeof raw.warmup === 'number' && Number.isFinite(raw.warmup)
          ? Math.max(0, Math.min(Math.floor(raw.warmup), bars.length))
          : 0
      const signalAt = raw.signalAt
      const explainAt = typeof raw.explainAt === 'function' ? raw.explainAt : () => 'Custom strategy.'
      return {
        warmup,
        overlays: Array.isArray(raw.overlays) ? raw.overlays : [],
        strip: raw.strip,
        // coerce anything that isn't exactly 'long' to 'flat'
        signalAt: (i: number): Signal => (signalAt(i) === 'long' ? 'long' : 'flat'),
        explainAt: (i: number) => String(explainAt(i)),
      }
    },
  }
}
