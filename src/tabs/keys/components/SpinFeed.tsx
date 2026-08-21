import { fmtBtc, shortAddr, shortPhrase } from '../lib/seed'

export interface SpinRow {
  key: string
  words: string[]
  address: string
  balance: number
  txs: number
}

interface Props {
  rows: SpinRow[]
  /** seeds checked in total — the list itself only keeps the most recent */
  total: number
  onPick: (words: string[]) => void
}

export function SpinFeed({ rows, total, onPick }: Props) {
  if (rows.length === 0) return null

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900/30">
      <header className="flex items-baseline justify-between border-b border-gray-800 px-3 py-2">
        <h2 className="text-[11px] tracking-wide text-gray-500 uppercase">Everything you've checked</h2>
        <span className="font-mono text-[11px] text-gray-600">
          {rows.length < total ? `latest ${rows.length} of ${total.toLocaleString()}` : total.toLocaleString()}
        </span>
      </header>
      <ol className="max-h-80 overflow-y-auto p-1">
        {rows.map((r) => {
          const funded = r.balance > 0
          return (
            <li key={r.key}>
              <button
                onClick={() => onPick(r.words)}
                title="load this phrase into the grid"
                className={`flex w-full items-center gap-3 rounded px-2 py-1 text-left font-mono text-[11px] hover:bg-gray-800/50 ${
                  funded ? 'bg-emerald-500/10' : ''
                }`}
              >
                <span
                  className={`w-24 shrink-0 tabular-nums ${funded ? 'text-emerald-400' : 'text-gray-600'}`}
                >
                  {fmtBtc(r.balance)}
                </span>
                <span className={`w-12 shrink-0 tabular-nums ${r.txs > 0 ? 'text-amber-400' : 'text-gray-700'}`}>
                  ({r.txs} tx)
                </span>
                <span className="min-w-0 flex-1 truncate text-gray-500">{shortPhrase(r.words)}</span>
                <span className="hidden shrink-0 text-gray-600 sm:inline">{shortAddr(r.address, 12, 6)}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
