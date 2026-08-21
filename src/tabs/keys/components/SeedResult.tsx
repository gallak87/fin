import { useState } from 'react'
import type { AddrStat } from '../lib/balance'
import { ZERO, totals } from '../lib/balance'
import type { DerivedAddress } from '../lib/seed'
import { KIND_LABEL, fmtBtc, shortAddr } from '../lib/seed'

function CopyButton({ text, label = 'copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text)
        setDone(true)
        setTimeout(() => setDone(false), 1200)
      }}
      className="text-[10px] text-gray-600 transition-colors hover:text-gray-300"
    >
      {done ? 'copied' : label}
    </button>
  )
}

function AddressRow({ addr, stat }: { addr: DerivedAddress; stat: AddrStat }) {
  const funded = stat.balance > 0
  const used = !funded && stat.txs > 0
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-3 py-2 font-mono text-[12px] ${
        funded ? 'bg-emerald-500/10 ring-1 ring-emerald-500/40' : used ? 'bg-amber-500/5' : ''
      }`}
    >
      <span className="w-28 shrink-0 truncate font-sans text-[11px] text-gray-500">
        {KIND_LABEL[addr.kind]}
        {addr.chain === 1 && <span className="text-gray-700"> · change</span>}
        {addr.index > 0 && <span className="text-gray-700"> · {addr.index}</span>}
      </span>
      <a
        href={`https://mempool.space/address/${addr.address}`}
        target="_blank"
        rel="noreferrer"
        className="min-w-0 flex-1 truncate text-gray-300 hover:text-blue-400"
        title={addr.address}
      >
        <span className="hidden sm:inline">{addr.address}</span>
        <span className="sm:hidden">{shortAddr(addr.address)}</span>
      </a>
      <CopyButton text={addr.address} />
      <span className={`w-28 shrink-0 text-right tabular-nums ${funded ? 'text-emerald-400' : 'text-gray-600'}`}>
        {fmtBtc(stat.balance)}
      </span>
      <span
        className={`w-12 shrink-0 text-right text-[11px] tabular-nums ${
          stat.txs > 0 ? 'text-amber-400' : 'text-gray-700'
        }`}
      >
        {stat.txs} tx
      </span>
    </div>
  )
}

interface Props {
  phrase: string[]
  addresses: DerivedAddress[]
  stats: Map<string, AddrStat>
  checking: boolean
  error: string | null
  deep: boolean
  onDeepScan: () => void
  onRetry: () => void
}

export function SeedResult({ phrase, addresses, stats, checking, error, deep, onDeepScan, onRetry }: Props) {
  const sum = totals(addresses.map((a) => stats.get(a.address) ?? ZERO))
  const known = stats.size > 0
  // deep scans derive 60 addresses; only the interesting ones earn a row
  const shown = deep
    ? addresses.filter((a) => (stats.get(a.address)?.txs ?? 0) > 0 || (a.chain === 0 && a.index === 0))
    : addresses.filter((a) => a.chain === 0)

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900/50">
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-800 px-3 py-2">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[11px] tracking-wide text-gray-500 uppercase">Derived addresses</h2>
          {checking && <span className="text-[11px] text-gray-600">checking chain…</span>}
        </div>
        <div className="flex items-baseline gap-3">
          {known && (
            <span className="font-mono text-[12px] tabular-nums">
              <span className={sum.balance > 0 ? 'text-emerald-400' : 'text-gray-500'}>{fmtBtc(sum.balance)}</span>
              <span className="text-gray-600"> BTC</span>
            </span>
          )}
          <CopyButton text={phrase.join(' ')} label="copy phrase" />
        </div>
      </header>

      <div className="divide-y divide-gray-800/60 p-1">
        {shown.map((a) => (
          <AddressRow key={a.path} addr={a} stat={stats.get(a.address) ?? ZERO} />
        ))}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-800 px-3 py-2 text-[11px]">
        {error ? (
          <span className="text-red-400">
            {error}{' '}
            <button onClick={onRetry} className="underline hover:text-red-300">
              retry
            </button>
          </span>
        ) : (
          <span className="text-gray-600">
            {deep
              ? `scanned ${addresses.length} addresses · ${addresses.filter((a) => (stats.get(a.address)?.txs ?? 0) > 0).length} with history`
              : 'receive index 0 · change addresses checked too'}
          </span>
        )}
        <button
          onClick={onDeepScan}
          disabled={deep || checking}
          className="rounded border border-gray-700 px-2 py-1 text-gray-400 transition-colors hover:border-gray-600 hover:text-white disabled:opacity-40"
        >
          {deep ? 'deep scan done' : 'deep scan · 60 addresses'}
        </button>
      </footer>
    </section>
  )
}
