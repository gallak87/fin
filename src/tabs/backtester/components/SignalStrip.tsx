import type { BacktestResult } from '../engine/types'
import { fmtMoney } from '../../../lib/format'

/** One-row "what is the strategy doing right now" readout. */
export function SignalStrip({ result, cursor }: { result: BacktestResult; cursor: number }) {
  const { bars, equity, position, run, contributed } = result
  const bar = bars[cursor]
  const long = position[cursor] === 'long'

  const prevClose = cursor > 0 ? bars[cursor - 1].c : bar.o
  const dayChange = bar.c / prevClose - 1

  const basis = contributed ? contributed[cursor] : equity[run.warmup]
  const gain = basis > 0 ? equity[cursor] / basis - 1 : 0

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 px-3 py-2 flex items-center gap-3 text-xs">
      <span
        className={`px-2 py-0.5 rounded font-semibold ${
          long ? 'bg-green-500/15 text-green-400' : 'bg-gray-700/40 text-gray-400'
        }`}
      >
        {long ? 'LONG' : 'FLAT'}
      </span>

      <span className="font-mono tabular-nums text-gray-200">
        ${bar.c.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        <span className={`ml-1.5 ${dayChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {dayChange >= 0 ? '+' : ''}
          {(dayChange * 100).toFixed(2)}%
        </span>
      </span>

      <span className="flex-1 text-gray-400 truncate" title={run.explainAt(cursor)}>
        {run.explainAt(cursor)}
      </span>

      <span className="font-mono tabular-nums text-gray-200">
        {fmtMoney(equity[cursor])}
        <span className={`ml-1.5 ${gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {gain >= 0 ? '+' : '−'}
          {Math.abs(gain * 100).toFixed(1)}%
        </span>
      </span>
    </div>
  )
}
