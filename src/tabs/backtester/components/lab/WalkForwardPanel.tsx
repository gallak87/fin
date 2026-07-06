import { useState } from 'react'
import { runBacktest } from '../../engine/engine'
import { gridValues, mapChunked, metricsOnWindow } from '../../engine/lab'
import { useBacktestStore } from '../../store'
import { AxisSelect, RunButton, Stat } from './labCommon'
import { useActiveStrategy, useComputed, useParamAxes } from './labUtils'
import { fmtPct } from '../../../../lib/format'

interface WfResult {
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

export function WalkForwardPanel() {
  const bars = useBacktestStore((s) => s.bars)
  const strategyId = useBacktestStore((s) => s.strategyId)
  const params = useBacktestStore((s) => s.params)
  const capital = useBacktestStore((s) => s.capital)
  const settings = useBacktestStore((s) => s.settings)
  const setParams = useBacktestStore((s) => s.setParams)
  const setOosStart = useBacktestStore((s) => s.setOosStart)
  const strategy = useActiveStrategy()

  const { numeric, x, y, setXKey, setYKey } = useParamAxes(strategy?.params ?? [])
  const [split, setSplit] = useState(70)
  const [res, setRes] = useComputed<WfResult>([strategyId, bars, settings, capital, split])
  const [progress, setProgress] = useState<number | null>(null)

  if (!strategy || numeric.length < 2 || !x || !y) {
    return (
      <p className="text-xs text-gray-500 p-1">
        Walk-forward needs a strategy with two numeric parameters to optimize.
      </p>
    )
  }

  const run = async () => {
    if (!bars) return
    setProgress(0)
    const oosStart = Math.floor((bars.length * split) / 100)
    const isBars = bars.slice(0, oosStart)
    const base = { ...Object.fromEntries(strategy.params.map((p) => [p.key, p.default])), ...(params[strategyId] ?? {}) }
    const xs = gridValues(x, 12)
    const ys = gridValues(y, 12)
    const combos: Record<string, number>[] = []
    for (const yv of ys) for (const xv of xs) combos.push({ ...base, [x.key]: xv, [y.key]: yv })

    // optimize on the in-sample window only, then on the full sample (the cheat)
    const isScores = await mapChunked(
      combos,
      (p) => {
        try {
          return runBacktest(isBars, strategy, p, capital, settings).metrics.sharpe
        } catch {
          return -Infinity
        }
      },
      (d, t) => setProgress((d / t) * 0.5),
    )
    const fullScores = await mapChunked(
      combos,
      (p) => {
        try {
          return runBacktest(bars, strategy, p, capital, settings).metrics.sharpe
        } catch {
          return -Infinity
        }
      },
      (d, t) => setProgress(0.5 + (d / t) * 0.5),
    )
    const isBest = combos[isScores.indexOf(Math.max(...isScores))]
    const fullBest = combos[fullScores.indexOf(Math.max(...fullScores))]

    // replay the honest pick over everything, then split its metrics
    const honest = runBacktest(bars, strategy, isBest, capital, settings)
    const isM = metricsOnWindow(honest.equity, bars, honest.trades, honest.warmup, oosStart - 1, honest.contributed, honest.position)
    const oosM = metricsOnWindow(honest.equity, bars, honest.trades, oosStart, bars.length - 1, honest.contributed, honest.position)
    const cheat = runBacktest(bars, strategy, fullBest, capital, settings)
    const cheatOosM = metricsOnWindow(cheat.equity, bars, cheat.trades, oosStart, bars.length - 1, cheat.contributed, cheat.position)

    setRes({
      isBest,
      fullBest,
      oosStart,
      isSharpe: isM.sharpe,
      isCagr: isM.cagr,
      oosSharpe: oosM.sharpe,
      oosCagr: oosM.cagr,
      fullSharpe: Math.max(...fullScores),
      fullOosSharpe: cheatOosM.sharpe,
    })
    setProgress(null)
  }

  const pickLabel = (p: Record<string, number>) => `${x.label} ${p[x.key]} · ${y.label} ${p[y.key]}`

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 leading-relaxed">
        Pick the best parameters using only the first part of history (in-sample), then watch them meet data
        they have never seen (out-of-sample). The gap between the two Sharpes is what overfitting costs.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <AxisSelect label="optimize" value={x.key} options={numeric} exclude={y.key} onChange={setXKey} />
        <AxisSelect label="and" value={y.key} options={numeric} exclude={x.key} onChange={setYKey} />
        <label className="flex items-center gap-1.5 text-xs text-gray-400">
          split
          <input
            type="range"
            min={50}
            max={90}
            step={5}
            value={split}
            onChange={(e) => setSplit(Number(e.target.value))}
            className="w-24 accent-blue-500"
          />
          <span className="font-mono text-gray-200">{split}/{100 - split}</span>
        </label>
        <RunButton onClick={() => void run()} progress={progress} label="Run walk-forward" />
      </div>
      {res && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="In-sample Sharpe (honest pick)" value={res.isSharpe.toFixed(2)} />
            <Stat
              label="Out-of-sample Sharpe"
              value={res.oosSharpe.toFixed(2)}
              tone={res.oosSharpe >= res.isSharpe * 0.6 ? 'good' : 'bad'}
            />
            <Stat label="In-sample CAGR" value={fmtPct(res.isCagr)} />
            <Stat label="Out-of-sample CAGR" value={fmtPct(res.oosCagr)} />
          </div>
          <div className="text-xs text-gray-400 leading-relaxed">
            Honest pick (in-sample only): <span className="text-gray-200 font-mono">{pickLabel(res.isBest)}</span>.
            Full-sample pick (hindsight): <span className="text-gray-200 font-mono">{pickLabel(res.fullBest)}</span>{' '}
            scored {res.fullSharpe.toFixed(2)} overall but only {res.fullOosSharpe.toFixed(2)} on the
            out-of-sample window
            {res.isBest[x.key] === res.fullBest[x.key] && res.isBest[y.key] === res.fullBest[y.key]
              ? ' (both picks agree — a good sign).'
              : ' — hindsight flatters.'}
          </div>
          <button
            onClick={() => {
              setParams(res.isBest)
              setOosStart(res.oosStart)
            }}
            className="text-xs rounded px-3 py-1.5 font-medium bg-blue-600 hover:bg-blue-500 text-white"
          >
            Apply honest params + shade out-of-sample in replay
          </button>
        </div>
      )}
    </div>
  )
}
