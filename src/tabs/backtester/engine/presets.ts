import type { EngineSettings } from './types'
import { DEFAULT_SETTINGS } from './engine'

export interface Preset {
  id: string
  ticker: string
  /** short label chunk after the ticker, e.g. "MA 13/20" */
  name: string
  strategyId: string
  params: Record<string, number>
  settings: EngineSettings
  blurb: string
}

const SL7: EngineSettings = { ...DEFAULT_SETTINGS, stopPct: 7 }

/** Field-tested configs (found 2026-07-05) — each matched to its asset's trend timescale. */
export const PRESETS: Preset[] = [
  {
    id: 'btc-fast-cross',
    ticker: 'BTC',
    name: 'MA 13/20',
    strategyId: 'ma-cross',
    params: { fast: 13, slow: 20, useEma: 0 },
    settings: SL7,
    blurb: 'Fast cross for a fast asset — BTC trends at weeks-scale. Survived the gauntlet.',
  },
  {
    id: 'qqq-regime-cross',
    ticker: 'QQQ',
    name: 'MA 7/200',
    strategyId: 'ma-cross',
    params: { fast: 7, slow: 200, useEma: 0 },
    settings: SL7,
    blurb: 'Basically the classic 200-day regime filter with a hair-trigger entry — equities trend at regime-scale.',
  },
  {
    id: 'spy-mid-cross',
    ticker: 'SPY',
    name: 'MA 30/180',
    strategyId: 'ma-cross',
    params: { fast: 30, slow: 180, useEma: 0 },
    settings: SL7,
    blurb: 'Mid-tempo cross for the S&P — near-matches buy & hold with a far shallower worst drawdown. Insurance, cheap.',
  },
  {
    id: 'gld-slow-cross',
    ticker: 'GLD',
    name: 'MA 42/200',
    strategyId: 'ma-cross',
    params: { fast: 42, slow: 200, useEma: 0 },
    settings: SL7,
    blurb: 'Slow cross for a macro asset — gold grinds in multi-month waves. Drawdown insurance, not a return engine.',
  },
]
