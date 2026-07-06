import { useMemo } from 'react'
import type { BacktestResult } from '../engine/types'
import { computeMetrics, tradingDaysPerYear } from '../engine/engine'
import { fmtPct } from '../../../lib/format'

type Tone = 'good' | 'bad' | 'neutral'

const toneCls = (t: Tone) =>
  t === 'good' ? 'text-green-400' : t === 'bad' ? 'text-red-400' : 'text-gray-200'

/**
 * Cursor-linked metrics as compact pills, overlaid on the equity (hero)
 * chart. Values fill in while the tape plays; hover for the B&H comparison.
 */
export function MetricsPills({ result, cursor }: { result: BacktestResult; cursor: number }) {
  const { m, b } = useMemo(() => {
    const ppy = tradingDaysPerYear(result.bars)
    return {
      m: computeMetrics(result.equity, result.bars, result.trades, ppy, cursor, result.contributed, result.position),
      b: computeMetrics(result.benchmark, result.bars, [], ppy, cursor),
    }
  }, [result, cursor])

  const vs = (a: number, bench: number, higherBetter = true): Tone =>
    a === bench ? 'neutral' : (a > bench) === higherBetter ? 'good' : 'bad'

  const pills: { label: string; value: string; tone: Tone; title?: string }[] = [
    {
      label: 'total',
      value: fmtPct(m.totalReturn, 0),
      tone: vs(m.totalReturn, b.totalReturn),
      title: `B&H: ${fmtPct(b.totalReturn, 0)}`,
    },
    { label: 'cagr', value: fmtPct(m.cagr), tone: vs(m.cagr, b.cagr), title: `B&H: ${fmtPct(b.cagr)}` },
    {
      label: 'max dd',
      value: fmtPct(m.maxDrawdown),
      tone: vs(m.maxDrawdown, b.maxDrawdown),
      title: `B&H: ${fmtPct(b.maxDrawdown)}`,
    },
    {
      label: 'sharpe',
      value: m.sharpe.toFixed(2),
      tone: vs(m.sharpe, b.sharpe),
      title: `B&H: ${b.sharpe.toFixed(2)}`,
    },
    {
      label: 'win',
      value: m.winRate == null ? '—' : `${Math.round(m.winRate * 100)}%`,
      tone: 'neutral',
      title: 'closed trades',
    },
    { label: 'trades', value: String(m.numTrades), tone: 'neutral', title: 'entries so far' },
    {
      label: 'exp',
      value: m.exposure == null ? '—' : `${Math.round(m.exposure * 100)}%`,
      tone: 'neutral',
      title: 'time in market',
    },
  ]

  return (
    <div className="flex flex-wrap gap-1">
      {pills.map((p) => (
        <span
          key={p.label}
          title={p.title}
          className="inline-flex items-baseline gap-1 rounded-full bg-gray-950/85 border border-gray-800 px-2 py-0.5 backdrop-blur-[2px]"
        >
          <span className="text-[9px] uppercase tracking-wide text-gray-500">{p.label}</span>
          <span className={`font-mono text-[11px] tabular-nums ${toneCls(p.tone)}`}>{p.value}</span>
        </span>
      ))}
    </div>
  )
}
