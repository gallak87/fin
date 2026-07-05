import { useMemo } from 'react'
import type { BacktestResult } from '../engine/types'
import { computeMetrics, tradingDaysPerYear } from '../engine/engine'
import { fmtPct } from '../../../lib/format'

type Tone = 'good' | 'bad' | 'neutral'

function Card({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: Tone }) {
  const color = tone === 'good' ? 'text-green-400' : tone === 'bad' ? 'text-red-400' : 'text-gray-200'
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`font-mono text-sm tabular-nums ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-gray-500">{sub}</div>}
    </div>
  )
}

/** Metrics as of the playback cursor — numbers fill in while the tape plays. */
export function BacktestMetrics({ result, cursor }: { result: BacktestResult; cursor: number }) {
  const { m, b } = useMemo(() => {
    const ppy = tradingDaysPerYear(result.bars)
    return {
      m: computeMetrics(result.equity, result.bars, result.trades, ppy, cursor, result.contributed),
      b: computeMetrics(result.benchmark, result.bars, [], ppy, cursor),
    }
  }, [result, cursor])

  const vs = (a: number, bench: number, higherBetter = true): Tone =>
    a === bench ? 'neutral' : (a > bench) === higherBetter ? 'good' : 'bad'

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
      <Card
        label="Total return"
        value={fmtPct(m.totalReturn, 0)}
        sub={`B&H: ${fmtPct(b.totalReturn, 0)}`}
        tone={vs(m.totalReturn, b.totalReturn)}
      />
      <Card
        label="CAGR"
        value={fmtPct(m.cagr)}
        sub={`B&H: ${fmtPct(b.cagr)}`}
        tone={vs(m.cagr, b.cagr)}
      />
      <Card
        label="Max drawdown"
        value={fmtPct(m.maxDrawdown)}
        sub={`B&H: ${fmtPct(b.maxDrawdown)}`}
        tone={vs(m.maxDrawdown, b.maxDrawdown)}
      />
      <Card
        label="Sharpe"
        value={m.sharpe.toFixed(2)}
        sub={`B&H: ${b.sharpe.toFixed(2)}`}
        tone={vs(m.sharpe, b.sharpe)}
      />
      <Card
        label="Win rate"
        value={m.winRate == null ? '—' : `${Math.round(m.winRate * 100)}%`}
        sub="closed trades"
        tone="neutral"
      />
      <Card label="Trades" value={String(m.numTrades)} sub="entries so far" tone="neutral" />
    </div>
  )
}
