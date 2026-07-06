import { useState } from 'react'
import { runBacktest } from '../../engine/engine'
import { mapChunked, mulberry32, percentileRank, shuffleRuns, signalStrategy } from '../../engine/lab'
import { useBacktestStore } from '../../store'
import { Histogram, MetricPicker, RunButton, StaleNote, Stat } from './labCommon'
import { fmtMetric, useComputed, type MetricKey } from './labUtils'
import { fmtPct } from '../../../../lib/format'

const N = 500

export function LuckPanel() {
  const bars = useBacktestStore((s) => s.bars)
  const result = useBacktestStore((s) => s.result)
  const capital = useBacktestStore((s) => s.capital)
  const settings = useBacktestStore((s) => s.settings)
  const [metric, setMetric] = useState<MetricKey>('cagr')
  const [values, setValues, valuesStale] = useComputed<Record<MetricKey, number[]>>([result])
  const [progress, setProgress] = useState<number | null>(null)

  if (!bars || !result) return null
  const exposure = result.metrics.exposure ?? 1
  if (result.trades.length === 0) {
    return <p className="text-xs text-gray-500 p-1">No trades — nothing to benchmark against luck.</p>
  }

  const run = async () => {
    setProgress(0)
    const rand = mulberry32(1337)
    // exits/regime are already baked into the real position series — turn them
    // off for the nulls so exposure stays matched
    const nullSettings = { ...settings, stopPct: 0, trailPct: 0, tpPct: 0, maxBars: 0, regimeMaDays: 0 }
    const sims = await mapChunked(
      Array.from({ length: N }, (_, i) => i),
      () => {
        const sig = shuffleRuns(result.position, result.warmup, rand)
        const r = runBacktest(bars, signalStrategy(sig, result.warmup), {}, capital, nullSettings)
        return r.metrics
      },
      (d, t) => setProgress(d / t),
    )
    setValues({
      cagr: sims.map((m) => m.cagr),
      sharpe: sims.map((m) => m.sharpe),
      maxDrawdown: sims.map((m) => m.maxDrawdown),
    })
    setProgress(null)
  }

  const actual = result.metrics[metric]
  const pct = values ? percentileRank(values[metric], actual) : null
  const verdict =
    pct == null
      ? null
      : pct >= 0.95
        ? { text: 'Hard to explain by timing luck alone.', tone: 'good' as const }
        : pct >= 0.6
          ? { text: 'Better than most random timings, but not convincingly.', tone: 'neutral' as const }
          : { text: 'Random timing does about as well — the asset did the work, not the strategy.', tone: 'bad' as const }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 leading-relaxed">
        {N} fake strategies with the <span className="text-gray-300">same time in market and holding
        lengths</span> as yours, but random timing. If your result sits inside their distribution, the rule
        added nothing — being invested at all was the whole trick.
      </p>
      {exposure > 0.97 && (
        <p className="text-[11px] text-amber-400/80">
          This strategy is ~always in the market, so shuffled timing barely differs — compare against buy
          &amp; hold instead.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <MetricPicker value={metric} onChange={setMetric} />
        <RunButton onClick={() => void run()} progress={progress} label={`Run ${N} random strategies`} />
        <StaleNote show={valuesStale} />
      </div>
      {values && pct != null && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Stat label={`Your ${metric === 'maxDrawdown' ? 'max DD' : metric}`} value={fmtMetric(metric, actual)} />
            <Stat
              label="Beats % of random"
              value={fmtPct(pct, 0)}
              tone={pct >= 0.95 ? 'good' : pct < 0.6 ? 'bad' : 'neutral'}
            />
            <Stat label="Time in market" value={fmtPct(exposure, 0)} />
          </div>
          {verdict && (
            <p
              className={`text-xs ${
                verdict.tone === 'good' ? 'text-green-400' : verdict.tone === 'bad' ? 'text-red-400' : 'text-gray-300'
              }`}
            >
              {verdict.text}
            </p>
          )}
          <div>
            <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
              {N} exposure-matched random strategies
            </div>
            <Histogram
              values={values[metric]}
              marker={actual}
              markerLabel="your strategy"
              format={(v) => fmtMetric(metric, v)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
