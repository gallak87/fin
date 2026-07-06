import type { BacktestResult } from '../engine/types'
import { Histogram } from './lab/labCommon'
import { fmtPct } from '../../../lib/format'

/** Distribution view of the trades taken so far: P&L % and holding period. */
export function TradeStats({ result, cursor }: { result: BacktestResult; cursor: number }) {
  const closed = result.trades.filter((t) => t.exitIdx != null && t.exitIdx <= cursor && t.pnlPct != null)
  if (closed.length < 3) return null

  const pnls = closed.map((t) => t.pnlPct!)
  const holds = closed.map((t) => t.barsHeld ?? t.exitIdx! - t.entryIdx)
  const avgWin = pnls.filter((p) => p > 0)
  const avgLoss = pnls.filter((p) => p <= 0)
  const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0)

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-3">
      <div className="pb-2 text-xs uppercase tracking-wide text-gray-400">
        Trade distributions — {closed.length} closed
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
            P&amp;L per trade · avg win {fmtPct(mean(avgWin))} / avg loss {fmtPct(mean(avgLoss))}
          </div>
          <Histogram values={pnls} format={(v) => fmtPct(v)} height={100} bins={24} />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
            Holding period (bars) · avg {Math.round(mean(holds))}
          </div>
          <Histogram values={holds} format={(v) => `${Math.round(v)}`} height={100} bins={24} />
        </div>
      </div>
    </div>
  )
}
