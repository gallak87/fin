import type { BacktestResult, Trade } from '../engine/types'
import { Histogram } from './lab/labCommon'
import { Tooltip } from '../../../components/Tooltip'
import { fmtPct } from '../../../lib/format'

/** How far past an exit the engine looks before calling it premature. */
const BAIL_LOOKAHEAD = 20

const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0)
const sum = (v: number[]) => v.reduce((a, b) => a + b, 0)
const pct0 = (v: number) => `${Math.round(v * 100)}%`

function Tile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div>
      <Tooltip content={hint}>
        <span className="text-[10px] uppercase tracking-wide text-gray-500 border-b border-dotted border-gray-700 cursor-help">
          {label}
        </span>
      </Tooltip>
      <div className="font-mono text-lg text-gray-100 tabular-nums leading-tight">{value}</div>
    </div>
  )
}

/**
 * Exit quality — how much of what the trade showed you actually made it to the
 * ledger — over the distributions of what it paid and how long it took.
 */
export function TradeStats({ result, cursor }: { result: BacktestResult; cursor: number }) {
  const closed = result.trades.filter((t) => t.exitIdx != null && t.exitIdx <= cursor && t.pnlPct != null)
  if (closed.length < 3) return null

  const pnls = closed.map((t) => t.pnlPct!)
  const holds = closed.map((t) => t.barsHeld ?? t.exitIdx! - t.entryIdx)
  const avgWin = pnls.filter((p) => p > 0)
  const avgLoss = pnls.filter((p) => p <= 0)

  // of all the paper profit that ever showed up, how much survived to the exit
  const ranUp = closed.filter((t) => (t.mfePct ?? 0) > 0)
  const captured = ranUp.length ? sum(ranUp.map((t) => t.pnlPct!)) / sum(ranUp.map((t) => t.mfePct!)) : null
  const gaveBack = ranUp.length ? mean(ranUp.map((t) => t.mfePct! - t.pnlPct!)) : null

  // payoff in units of the risk taken at entry — only meaningful with a stop set
  const risked = closed.filter((t) => (t.riskPct ?? 0) > 0)
  const avgR = risked.length ? mean(risked.map((t) => t.pnlPct! / t.riskPct!)) : null

  // premature exits, only counted once their look-ahead window is behind the cursor
  const settled = closed.filter(
    (t: Trade) => t.bailedEarly != null && t.exitIdx! + BAIL_LOOKAHEAD <= cursor,
  )
  const bailed = settled.length ? settled.filter((t) => t.bailedEarly).length / settled.length : null

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-3">
      <div className="pb-2 text-xs uppercase tracking-wide text-gray-400">
        Trade distributions — {closed.length} closed
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-3 mb-3 border-b border-gray-800">
        <Tile
          label="captured"
          value={captured == null ? '—' : pct0(captured)}
          hint="Of every dollar of profit these trades showed on the way, the share that was still there at the exit. Low means the exits give it back."
        />
        <Tile
          label="gave back"
          value={gaveBack == null ? '—' : pct0(gaveBack)}
          hint="Average distance from a trade's best unrealized gain down to where it actually closed."
        />
        <Tile
          label="avg R"
          value={avgR == null ? '—' : `${avgR.toFixed(1)}×`}
          hint="Average result in units of the risk taken at entry — the distance from the fill to the first protective stop. Needs a stop or trail turned on."
        />
        <Tile
          label="bailed early"
          value={bailed == null ? '—' : pct0(bailed)}
          hint={`Share of protective exits that fired while the strategy still wanted to be long, and price then closed a full unit of risk back above the exit within ${BAIL_LOOKAHEAD} bars. High means the stop is too tight for this strategy.`}
        />
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
