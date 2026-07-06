import type { Bar, Metrics, ParamDef, Signal, Strategy, Trade } from './types'
import { computeMetrics, tradingDaysPerYear } from './engine'
import { getStrategy } from './strategies'
import { CUSTOM_ID, compileCustomStrategy } from './custom'

/** 2-param sweep output — one full Metrics per cell, [yi][xi]. */
export interface SweepGrid {
  xKey: string
  yKey: string
  xLabel: string
  yLabel: string
  xs: number[]
  ys: number[]
  cells: (Metrics | null)[][]
}

export interface WfResult {
  isBest: Record<string, number>
  fullBest: Record<string, number>
  oosStart: number
  isSharpe: number
  isCagr: number
  oosSharpe: number
  oosCagr: number
  fullSharpe: number
  fullOosSharpe: number
}

export interface McResult {
  ends: number[]
  dds: number[]
  actualEnd: number
  pLoss: number
}

export type LuckValues = { cagr: number[]; sharpe: number[]; maxDrawdown: number[] }

/** Everything the lab (or the gauntlet) has computed for one backtest result. */
export interface LabData {
  sweep?: SweepGrid
  wf?: WfResult
  mc?: McResult
  luck?: LuckValues
}

/** Resolve the active strategy, compiling custom code when needed. Throws on bad code. */
export function resolveStrategy(id: string, customCode: string): Strategy {
  return id === CUSTOM_ID ? compileCustomStrategy(customCode) : getStrategy(id)
}

/** ~`steps` values across a param's range, snapped to its step size, unique. */
export function gridValues(p: ParamDef, steps = 16): number[] {
  const out: number[] = []
  const span = p.max - p.min
  for (let i = 0; i < steps; i++) {
    const raw = p.min + (span * i) / (steps - 1)
    const snapped = Math.min(p.max, p.min + Math.round((raw - p.min) / p.step) * p.step)
    if (out[out.length - 1] !== snapped) out.push(snapped)
  }
  return out
}

/** Map over items in time-boxed chunks so the UI stays responsive. */
export async function mapChunked<T, R>(
  items: T[],
  fn: (item: T, i: number) => R,
  onProgress?: (done: number, total: number) => void,
): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  while (i < items.length) {
    const deadline = performance.now() + 30
    while (i < items.length && performance.now() < deadline) {
      out[i] = fn(items[i], i)
      i++
    }
    onProgress?.(i, items.length)
    if (i < items.length) await new Promise((r) => setTimeout(r, 0))
  }
  return out
}

/** Metrics over a window [start, end] of an existing backtest. */
export function metricsOnWindow(
  equity: number[],
  bars: Bar[],
  trades: Trade[],
  start: number,
  end: number,
  contributed?: number[] | null,
  position?: Signal[],
): Metrics {
  const eq = equity.slice(start, end + 1)
  const bs = bars.slice(start, end + 1)
  const tr = trades
    .filter((t) => t.entryIdx >= start && t.entryIdx <= end)
    .map((t) => ({
      ...t,
      entryIdx: t.entryIdx - start,
      exitIdx: t.exitIdx != null && t.exitIdx <= end ? t.exitIdx - start : undefined,
    }))
  return computeMetrics(
    eq,
    bs,
    tr,
    tradingDaysPerYear(bars),
    undefined,
    contributed ? contributed.slice(start, end + 1) : undefined,
    position ? position.slice(start, end + 1) : undefined,
  )
}

/** Deterministic small PRNG so lab runs are reproducible per seed. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Exposure-matched random signals: cut the real position series into runs
 * (holds and gaps), shuffle the runs, and rebuild. Total time in market and
 * the holding-length profile are preserved; only the timing is randomized.
 */
export function shuffleRuns(position: Signal[], warmup: number, rand: () => number): Signal[] {
  const runs: { sig: Signal; len: number }[] = []
  for (let i = warmup; i < position.length; i++) {
    const last = runs[runs.length - 1]
    if (last && last.sig === position[i]) last.len++
    else runs.push({ sig: position[i], len: 1 })
  }
  // Fisher–Yates
  for (let i = runs.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[runs[i], runs[j]] = [runs[j], runs[i]]
  }
  const out: Signal[] = new Array(position.length).fill('flat')
  let k = warmup
  for (const r of runs) for (let x = 0; x < r.len && k < position.length; x++) out[k++] = r.sig
  return out
}

/** Wrap a precomputed signal array as a Strategy the engine can run. */
export function signalStrategy(signals: Signal[], warmup: number): Strategy {
  return {
    id: 'synthetic',
    name: 'synthetic',
    blurb: '',
    params: [],
    contribution: 'lump',
    init: () => ({
      warmup,
      overlays: [],
      signalAt: (i) => signals[i],
      explainAt: () => '',
    }),
  }
}

export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

/** Fraction of values strictly below x (percentile rank, 0..1). */
export function percentileRank(values: number[], x: number): number {
  let below = 0
  for (const v of values) if (v < x) below++
  return values.length ? below / values.length : NaN
}
