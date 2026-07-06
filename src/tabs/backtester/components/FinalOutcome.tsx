import { useBacktestStore } from '../store'
import { fmtK } from '../../../lib/format'
import { verdict } from '../engine/verdict'

const pctFmt = (pct: number) =>
  `${pct >= 0 ? '+' : ''}${pct >= 10 ? `${Math.round(pct * 100).toLocaleString()}%` : `${(pct * 100).toFixed(1)}%`}`

/**
 * Where the tape ends, shown up front — the full series is precomputed, so
 * there's no need to fast-forward for the final outcome. Second line is the
 * plain-words verdict: which story the numbers are telling.
 */
export function FinalOutcome() {
  const result = useBacktestStore((s) => s.result)
  const capital = useBacktestStore((s) => s.capital)
  if (!result) return null
  const end = result.equity[result.equity.length - 1]
  const bench = result.benchmark[result.benchmark.length - 1]
  const basis = result.contributed ? result.contributed[result.contributed.length - 1] : capital
  const pct = basis > 0 ? end / basis - 1 : 0
  const benchPct = basis > 0 ? bench / basis - 1 : 0
  const mult = bench > 0 ? end / bench : 0
  const win = end >= bench
  const v = verdict(result.metrics, result.benchMetrics)
  const vColor =
    v.tone === 'good' ? 'text-green-400/90' : v.tone === 'bad' ? 'text-red-400/90' : 'text-gray-300'
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 px-3 py-2 space-y-1 text-xs">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-[10px] uppercase tracking-wide text-gray-500">End of tape</span>
        <span className="font-mono tabular-nums">
          <span className="text-gray-400">{fmtK(basis)} → </span>
          <span className={win ? 'text-green-400' : 'text-red-400'}>
            {fmtK(end)} ({pctFmt(pct)})
          </span>
        </span>
        <span className="font-mono tabular-nums text-gray-400">
          buy &amp; hold → {fmtK(bench)} ({pctFmt(benchPct)})
        </span>
        <span className={`font-mono tabular-nums ${win ? 'text-green-400' : 'text-red-400'}`}>
          {mult >= 1 ? `${mult.toFixed(1)}× B&H` : `${mult.toFixed(2)}× B&H`}
        </span>
      </div>
      <div className={`leading-snug ${vColor}`}>{v.text}</div>
    </div>
  )
}
