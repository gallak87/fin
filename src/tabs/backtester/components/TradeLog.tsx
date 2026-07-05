import type { BacktestResult } from '../engine/types'

const money = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`

export function TradeLog({ result, cursor }: { result: BacktestResult; cursor: number }) {
  const visible = result.trades.filter((t) => t.entryIdx <= cursor).reverse()

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800">
      <div className="px-3 pt-2.5 pb-1 text-xs uppercase tracking-wide text-gray-400">Trades</div>
      {visible.length === 0 ? (
        <div className="px-3 pb-3 text-xs text-gray-500">No trades yet — press play.</div>
      ) : (
        <div className="max-h-56 overflow-y-auto">
          <table className="w-full text-xs font-mono tabular-nums">
            <thead className="sticky top-0 bg-gray-900 text-gray-500">
              <tr className="text-left">
                <th className="px-3 py-1.5 font-normal">Entry</th>
                <th className="px-2 py-1.5 font-normal text-right">Entry $</th>
                <th className="px-2 py-1.5 font-normal">Exit</th>
                <th className="px-2 py-1.5 font-normal text-right">Exit $</th>
                <th className="px-2 py-1.5 font-normal text-right">P&amp;L</th>
                <th className="px-3 py-1.5 font-normal text-right">P&amp;L %</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              {visible.map((t) => {
                const closed = t.exitIdx != null && t.exitIdx <= cursor
                const pnlColor = (t.pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                return (
                  <tr key={t.entryIdx} className="border-t border-gray-800/60">
                    <td className="px-3 py-1">{t.entryDate}</td>
                    <td className="px-2 py-1 text-right">{money(t.entryPrice)}</td>
                    <td className="px-2 py-1">{closed ? t.exitDate : <span className="text-gray-500">open</span>}</td>
                    <td className="px-2 py-1 text-right">{closed ? money(t.exitPrice!) : '—'}</td>
                    <td className={`px-2 py-1 text-right ${closed ? pnlColor : 'text-gray-500'}`}>
                      {closed ? money(t.pnl!) : '—'}
                    </td>
                    <td className={`px-3 py-1 text-right ${closed ? pnlColor : 'text-gray-500'}`}>
                      {closed ? `${(t.pnlPct! * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
