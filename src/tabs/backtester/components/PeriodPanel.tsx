import { useBacktestStore } from '../store'

const MIN_BARS = 30 // smallest sensible window

const YEARS = [1, 2, 3, 5]

function isoYearsBack(fromIso: string, years: number): string {
  const d = new Date(fromIso)
  d.setFullYear(d.getFullYear() - years)
  return d.toISOString().slice(0, 10)
}

/**
 * Backtest window: everything (engine, charts, lab, B&H benchmark) runs on
 * this slice — start at a prior top and buy & hold enters at that top too.
 */
export function PeriodPanel() {
  const allBars = useBacktestStore((s) => s.allBars)
  const bars = useBacktestStore((s) => s.bars)
  const setRange = useBacktestStore((s) => s.setRange)
  if (!allBars || !bars) return null

  const n = allBars.length
  // current window as indices into the full series
  const startIdx = allBars.findIndex((b) => b.t === bars[0].t)
  const endIdx = allBars.findIndex((b) => b.t === bars[bars.length - 1].t)
  const isMax = startIdx <= 0 && endIdx >= n - 1
  const last = allBars[n - 1].t

  const apply = (si: number, ei: number) => {
    const s = Math.max(0, Math.min(si, ei - MIN_BARS))
    const e = Math.min(n - 1, Math.max(ei, s + MIN_BARS))
    setRange(s <= 0 ? null : allBars[s].t, e >= n - 1 ? null : allBars[e].t)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {YEARS.map((y) => (
          <button
            key={y}
            onClick={() => setRange(isoYearsBack(last, y), null)}
            className="flex-1 text-xs rounded-lg border border-gray-800 py-1 text-gray-400 hover:border-gray-600 hover:text-gray-200"
          >
            {y}y
          </button>
        ))}
        <button
          onClick={() => setRange(null, null)}
          className={`flex-1 text-xs rounded-lg border py-1 ${
            isMax ? 'border-blue-500 bg-blue-500/10 text-gray-100' : 'border-gray-800 text-gray-400 hover:border-gray-600'
          }`}
        >
          Max
        </button>
      </div>
      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-300">From</span>
          <span className="font-mono text-gray-100 tabular-nums text-xs">{bars[0].t}</span>
        </div>
        <input
          type="range"
          min={0}
          max={n - 1}
          value={startIdx}
          onChange={(e) => apply(Number(e.target.value), endIdx)}
          className="w-full accent-blue-500"
        />
      </div>
      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-300">To</span>
          <span className="font-mono text-gray-100 tabular-nums text-xs">{bars[bars.length - 1].t}</span>
        </div>
        <input
          type="range"
          min={0}
          max={n - 1}
          value={endIdx}
          onChange={(e) => apply(startIdx, Number(e.target.value))}
          className="w-full accent-blue-500"
        />
      </div>
      <div className="text-[10px] text-gray-600">
        {bars.length.toLocaleString()} of {n.toLocaleString()} bars — buy &amp; hold enters at the window start
      </div>
    </div>
  )
}
