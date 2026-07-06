import type { BacktestResult, Bar, EngineSettings, Strategy } from './types'
import { runBacktest } from './engine'
import {
  gridValues,
  mapChunked,
  metricsOnWindow,
  mulberry32,
  percentileRank,
  quantile,
  shuffleRuns,
  signalStrategy,
  type LabData,
} from './lab'

export type GauntletStatus = 'pass' | 'warn' | 'fail' | 'skip'

export interface GauntletCheck {
  name: string
  status: GauntletStatus
  detail: string
}

export interface GauntletReport {
  checks: GauntletCheck[]
  overall: GauntletStatus
  /** everything computed along the way, in lab-panel format — prepopulates the full lab */
  artifacts: LabData
}

interface Opts {
  bars: Bar[]
  strategy: Strategy
  params: Record<string, number>
  capital: number
  settings: EngineSettings
  result: BacktestResult
  onProgress?: (label: string, frac: number) => void
}

/**
 * The full luck-test battery, run headlessly in order: vs-random → param
 * plateau → walk-forward → Monte Carlo. Coarser grids than the interactive
 * panels (speed over resolution) — deep-dive in the lab below.
 */
export async function runGauntlet(opts: Opts): Promise<GauntletReport> {
  const { bars, strategy, params, capital, settings, result, onProgress } = opts
  const checks: GauntletCheck[] = []
  const artifacts: LabData = {}

  // ---- 1. vs random (exposure-matched shuffled timing) --------------------
  onProgress?.('vs random timing', 0)
  const exposure = result.metrics.exposure ?? 1
  if (result.trades.length === 0 || exposure > 0.97) {
    checks.push({
      name: 'Vs. random',
      status: 'skip',
      detail: exposure > 0.97 ? 'always in the market — timing shuffle proves nothing' : 'no trades to test',
    })
  } else {
    const rand = mulberry32(1337)
    const nullSettings = { ...settings, stopPct: 0, trailPct: 0, tpPct: 0, maxBars: 0, regimeMaDays: 0 }
    const sims = await mapChunked(
      Array.from({ length: 300 }, (_, i) => i),
      () => {
        const sig = shuffleRuns(result.position, result.warmup, rand)
        return runBacktest(bars, signalStrategy(sig, result.warmup), {}, capital, nullSettings).metrics
      },
      (d, t) => onProgress?.('vs random timing', (d / t) * 0.2),
    )
    artifacts.luck = {
      cagr: sims.map((m) => m.cagr),
      sharpe: sims.map((m) => m.sharpe),
      maxDrawdown: sims.map((m) => m.maxDrawdown),
    }
    const pct = percentileRank(artifacts.luck.cagr, result.metrics.cagr)
    checks.push({
      name: 'Vs. random',
      status: pct >= 0.95 ? 'pass' : pct >= 0.6 ? 'warn' : 'fail',
      detail:
        pct >= 0.95
          ? `beats ${Math.round(pct * 100)}% of 300 exposure-matched random timings — hard to call luck`
          : pct >= 0.6
            ? `beats only ${Math.round(pct * 100)}% of random timings — weak evidence of a timing edge`
            : `beats just ${Math.round(pct * 100)}% of random timings — the asset did the work, not the rule`,
    })
  }

  // ---- 2. param plateau (coarse sweep around the current pick) ------------
  onProgress?.('parameter plateau', 0.2)
  const numeric = strategy.params.filter((p) => !p.toggle)
  if (numeric.length < 2) {
    checks.push({ name: 'Param plateau', status: 'skip', detail: 'needs two numeric parameters to sweep' })
  } else {
    const [px, py] = numeric
    const xs = gridValues(px, 12)
    const ys = gridValues(py, 12)
    const combos: { xi: number; yi: number }[] = []
    ys.forEach((_, yi) => xs.forEach((_, xi) => combos.push({ xi, yi })))
    const flat = await mapChunked(
      combos,
      ({ xi, yi }) => {
        try {
          return runBacktest(bars, strategy, { ...params, [px.key]: xs[xi], [py.key]: ys[yi] }, capital, settings)
            .metrics
        } catch {
          return null
        }
      },
      (d, t) => onProgress?.('parameter plateau', 0.2 + (d / t) * 0.3),
    )
    artifacts.sweep = {
      xKey: px.key,
      yKey: py.key,
      xLabel: px.label,
      yLabel: py.label,
      xs,
      ys,
      cells: ys.map((_, yi) => xs.map((_, xi) => flat[yi * xs.length + xi])),
    }
    const sharpes = flat.map((m) => (m ? m.sharpe : NaN))
    const nearest = (vals: number[], v: number) =>
      vals.reduce((best, x, i) => (Math.abs(x - v) < Math.abs(vals[best] - v) ? i : best), 0)
    const cxi = nearest(xs, params[px.key])
    const cyi = nearest(ys, params[py.key])
    const cell = sharpes[cyi * xs.length + cxi]
    const hood: number[] = []
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const xi = cxi + dx
        const yi = cyi + dy
        if (xi < 0 || yi < 0 || xi >= xs.length || yi >= ys.length) continue
        const s = sharpes[yi * xs.length + xi]
        if (Number.isFinite(s)) hood.push(s)
      }
    const hoodMean = hood.length ? hood.reduce((a, b) => a + b, 0) / hood.length : NaN
    if (!Number.isFinite(cell) || !Number.isFinite(hoodMean)) {
      checks.push({ name: 'Param plateau', status: 'skip', detail: 'sweep failed around the current parameters' })
    } else if (cell <= 0) {
      checks.push({
        name: 'Param plateau',
        status: 'fail',
        detail: `current parameters score Sharpe ${cell.toFixed(2)} on the coarse grid — nothing to be robust about`,
      })
    } else {
      const ratio = hoodMean / cell
      checks.push({
        name: 'Param plateau',
        status: ratio >= 0.7 ? 'pass' : ratio >= 0.4 ? 'warn' : 'fail',
        detail:
          ratio >= 0.7
            ? `neighbors average ${Math.round(ratio * 100)}% of your cell's Sharpe (${hoodMean.toFixed(2)} vs ${cell.toFixed(2)}) — a plateau, not a pixel`
            : `neighbors average only ${Math.round(ratio * 100)}% of your cell's Sharpe — the pick may be a lucky pixel`,
      })
    }
  }

  // ---- 3. walk-forward (optimize on 70%, judge on 30%) ---------------------
  onProgress?.('walk-forward', 0.5)
  if (numeric.length < 2) {
    checks.push({ name: 'Walk-forward', status: 'skip', detail: 'needs two numeric parameters to optimize' })
  } else {
    const [px, py] = numeric
    const oosStart = Math.floor(bars.length * 0.7)
    const isBars = bars.slice(0, oosStart)
    const xs = gridValues(px, 10)
    const ys = gridValues(py, 10)
    const combos: Record<string, number>[] = []
    for (const yv of ys) for (const xv of xs) combos.push({ ...params, [px.key]: xv, [py.key]: yv })
    const isScores = await mapChunked(
      combos,
      (p) => {
        try {
          return runBacktest(isBars, strategy, p, capital, settings).metrics.sharpe
        } catch {
          return -Infinity
        }
      },
      (d, t) => onProgress?.('walk-forward', 0.5 + (d / t) * 0.35),
    )
    const fullScores = combos.map((p) => {
      try {
        return runBacktest(bars, strategy, p, capital, settings).metrics.sharpe
      } catch {
        return -Infinity
      }
    })
    const isBest = combos[isScores.indexOf(Math.max(...isScores))]
    const fullBest = combos[fullScores.indexOf(Math.max(...fullScores))]
    const honest = runBacktest(bars, strategy, isBest, capital, settings)
    const isM = metricsOnWindow(honest.equity, bars, honest.trades, honest.warmup, oosStart - 1, honest.contributed)
    const oosM = metricsOnWindow(honest.equity, bars, honest.trades, oosStart, bars.length - 1, honest.contributed)
    const cheat = runBacktest(bars, strategy, fullBest, capital, settings)
    const cheatOosM = metricsOnWindow(cheat.equity, bars, cheat.trades, oosStart, bars.length - 1, cheat.contributed)
    artifacts.wf = {
      isBest,
      fullBest,
      oosStart,
      isSharpe: isM.sharpe,
      isCagr: isM.cagr,
      oosSharpe: oosM.sharpe,
      oosCagr: oosM.cagr,
      fullSharpe: Math.max(...fullScores),
      fullOosSharpe: cheatOosM.sharpe,
    }
    const retention = isM.sharpe > 0 ? oosM.sharpe / isM.sharpe : 0
    checks.push({
      name: 'Walk-forward',
      status: oosM.sharpe > 0 && retention >= 0.5 ? 'pass' : oosM.sharpe > 0 ? 'warn' : 'fail',
      detail:
        oosM.sharpe > 0
          ? `params picked blind on 70% kept ${Math.round(retention * 100)}% of their Sharpe out-of-sample (${isM.sharpe.toFixed(2)} → ${oosM.sharpe.toFixed(2)})`
          : `out-of-sample Sharpe ${oosM.sharpe.toFixed(2)} — the edge didn't survive data it hadn't seen`,
    })
  }

  // ---- 4. Monte Carlo (trade-order fragility) ------------------------------
  onProgress?.('Monte Carlo', 0.85)
  const closed = result.trades.filter((t) => t.pnlPct != null)
  if (closed.length < 5) {
    checks.push({ name: 'Monte Carlo', status: 'skip', detail: 'needs ≥5 closed trades to resample' })
  } else {
    const rand = mulberry32(42)
    const returns = closed.map((t) => ({ pnl: t.pnlPct!, mae: t.maePct ?? Math.min(t.pnlPct!, 0) }))
    const sims = await mapChunked(
      Array.from({ length: 1000 }, (_, i) => i),
      () => {
        let eq = capital
        let peak = capital
        let maxDd = 0
        for (let k = 0; k < returns.length; k++) {
          const r = returns[Math.floor(rand() * returns.length)]
          const low = eq * (1 + r.mae)
          if (low < peak) maxDd = Math.min(maxDd, low / peak - 1)
          eq *= 1 + r.pnl
          peak = Math.max(peak, eq)
          if (eq < peak) maxDd = Math.min(maxDd, eq / peak - 1)
        }
        return { end: eq, dd: maxDd }
      },
      (d, t) => onProgress?.('Monte Carlo', 0.85 + (d / t) * 0.15),
    )
    const ends = sims.map((s) => s.end).sort((a, b) => a - b)
    const dds = sims.map((s) => s.dd).sort((a, b) => a - b)
    const pLoss = ends.filter((e) => e < capital).length / ends.length
    artifacts.mc = { ends, dds, actualEnd: result.equity[result.equity.length - 1], pLoss }
    const worst5 = quantile(dds, 0.05)
    checks.push({
      name: 'Monte Carlo',
      status: pLoss < 0.1 ? 'pass' : pLoss < 0.3 ? 'warn' : 'fail',
      detail: `${Math.round(pLoss * 100)}% of 1,000 trade reshuffles end below start; worst-5% drawdown ${(worst5 * 100).toFixed(0)}% — could you sit through that?`,
    })
  }

  const overall: GauntletStatus = checks.some((c) => c.status === 'fail')
    ? 'fail'
    : checks.some((c) => c.status === 'warn')
      ? 'warn'
      : checks.every((c) => c.status === 'skip')
        ? 'skip'
        : 'pass'
  return { checks, overall, artifacts }
}
