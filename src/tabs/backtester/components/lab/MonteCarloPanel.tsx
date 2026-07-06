import { useState } from 'react'
import { mapChunked, mulberry32, quantile } from '../../engine/lab'
import { useBacktestStore } from '../../store'
import { Histogram, RunButton, StaleNote, Stat } from './labCommon'
import { useComputed } from './labUtils'
import { fmtMoney, fmtPct } from '../../../../lib/format'

interface McResult {
  ends: number[]
  dds: number[]
  actualEnd: number
  pLoss: number
}

const N = 2000

export function MonteCarloPanel() {
  const result = useBacktestStore((s) => s.result)
  const capital = useBacktestStore((s) => s.capital)
  const [res, setRes, resStale] = useComputed<McResult>([result])
  const [progress, setProgress] = useState<number | null>(null)

  const closed = (result?.trades ?? []).filter((t) => t.pnlPct != null)
  if (!result || closed.length < 5) {
    return (
      <p className="text-xs text-gray-500 p-1">
        Needs at least 5 closed trades — run a strategy that trades in and out (not buy &amp; hold / DCA).
      </p>
    )
  }

  const run = async () => {
    setProgress(0)
    const rand = mulberry32(42)
    const returns = closed.map((t) => ({ pnl: t.pnlPct!, mae: t.maePct ?? Math.min(t.pnlPct!, 0) }))
    const sims = await mapChunked(
      Array.from({ length: N }, (_, i) => i),
      () => {
        let eq = capital
        let peak = capital
        let maxDd = 0
        for (let k = 0; k < returns.length; k++) {
          const r = returns[Math.floor(rand() * returns.length)]
          // the low inside the trade counts against drawdown, not just its close
          const low = eq * (1 + r.mae)
          if (low < peak) maxDd = Math.min(maxDd, low / peak - 1)
          eq *= 1 + r.pnl
          peak = Math.max(peak, eq)
          if (eq < peak) maxDd = Math.min(maxDd, eq / peak - 1)
        }
        return { end: eq, dd: maxDd }
      },
      (d, t) => setProgress(d / t),
    )
    const ends = sims.map((s) => s.end).sort((a, b) => a - b)
    const dds = sims.map((s) => s.dd).sort((a, b) => a - b)
    setRes({
      ends,
      dds,
      actualEnd: result.equity[result.equity.length - 1],
      pLoss: ends.filter((e) => e < capital).length / ends.length,
    })
    setProgress(null)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 leading-relaxed">
        Your backtest is one particular ordering of {closed.length} trades. Reshuffling them (sampling with
        replacement, {N.toLocaleString()} times) shows the range of outcomes the same trades could have
        produced — the point estimate is the least interesting number in the distribution.
      </p>
      <div className="flex items-center gap-2">
        <RunButton onClick={() => void run()} progress={progress} label={`Resample ${N.toLocaleString()}×`} />
        <StaleNote show={resStale} />
      </div>
      {res && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            <Stat label="Median end equity" value={fmtMoney(quantile(res.ends, 0.5))} />
            <Stat label="5th percentile" value={fmtMoney(quantile(res.ends, 0.05))} tone="bad" />
            <Stat label="95th percentile" value={fmtMoney(quantile(res.ends, 0.95))} tone="good" />
            <Stat label="Median max DD" value={fmtPct(quantile(res.dds, 0.5))} />
            <Stat label="Worst-5% max DD" value={fmtPct(quantile(res.dds, 0.05))} tone="bad" />
            <Stat
              label="P(end below start)"
              value={fmtPct(res.pLoss, 1)}
              tone={res.pLoss > 0.2 ? 'bad' : 'neutral'}
            />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
              End equity across {N.toLocaleString()} reshuffles
            </div>
            <Histogram
              values={res.ends}
              marker={res.actualEnd}
              markerLabel="your backtest"
              format={(v) => fmtMoney(v)}
            />
          </div>
          <p className="text-[11px] text-gray-600">
            Drawdowns use each trade's worst intrabar excursion (MAE), not just its closing P&amp;L. Ask
            yourself: would you actually keep following the rules through the worst-5% drawdown?
          </p>
        </div>
      )}
    </div>
  )
}
