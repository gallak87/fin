import { useRef } from 'react'
import type { EngineState } from '../lib/useEngine'
import type { FilterInfo } from '../lib/funded'
import { fmtBytes } from '../lib/funded'
import { shortAddr, shortPhrase } from '../lib/seed'

/** the chain-checked spinner manages about one seed every two seconds */
const CHAIN_RATE = 0.5

interface Props {
  state: EngineState
  info: FilterInfo | null
  threads: number
  maxThreads: number
  disabled: boolean
  error: string | null
  onThreads: (n: number) => void
  onStart: () => void
  onStop: () => void
  onLoadFilter: (file: File) => void
}

function Stat({ value, label, tone }: { value: string; label: string; tone?: string }) {
  return (
    <div>
      <div className={`font-mono text-3xl leading-none tabular-nums ${tone ?? 'text-white'}`}>
        {value}
      </div>
      <div className="mt-1 text-[10px] tracking-wide text-gray-500 uppercase">{label}</div>
    </div>
  )
}

export function LudicrousPanel({
  state,
  info,
  threads,
  maxThreads,
  disabled,
  error,
  onThreads,
  onStart,
  onStop,
  onLoadFilter,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const { running, rate, checked, candidates, perWorker, stream } = state
  const peak = Math.max(1, ...perWorker)

  return (
    <section
      className={`relative overflow-hidden rounded-xl border transition-colors ${
        running
          ? 'border-amber-500/50 bg-gradient-to-b from-amber-500/10 via-orange-500/[0.04] to-transparent'
          : 'border-gray-800 bg-gray-900/40'
      }`}
    >
      {running && (
        <div className="absolute inset-x-0 top-0 h-px animate-pulse bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
      )}

      <header className="flex flex-wrap items-center justify-between gap-3 px-4 pt-3.5 pb-2">
        <h2
          className={`bg-gradient-to-r from-amber-200 via-amber-400 to-orange-500 bg-clip-text font-mono text-sm font-black tracking-[0.2em] text-transparent uppercase ${
            running ? 'drop-shadow-[0_0_18px_rgba(251,146,60,0.5)]' : 'opacity-70'
          }`}
        >
          ⚡ Ludicrous Mode
        </h2>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-800 px-2 py-1">
            <button
              onClick={() => onThreads(Math.max(1, threads - 1))}
              disabled={running || threads <= 1}
              className="text-gray-500 hover:text-white disabled:opacity-30"
            >
              −
            </button>
            <span className="w-14 text-center font-mono text-[11px] text-gray-400 tabular-nums">
              {threads} {threads === 1 ? 'core' : 'cores'}
            </span>
            <button
              onClick={() => onThreads(Math.min(maxThreads, threads + 1))}
              disabled={running || threads >= maxThreads}
              className="text-gray-500 hover:text-white disabled:opacity-30"
            >
              +
            </button>
          </div>
          <button
            onClick={running ? onStop : onStart}
            disabled={disabled && !running}
            className={`rounded-lg px-5 py-1.5 text-[13px] font-bold tracking-wide uppercase transition-all disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-600 disabled:shadow-none ${
              running
                ? 'bg-red-500 text-white hover:bg-red-400'
                : 'bg-gradient-to-r from-amber-400 to-orange-500 text-gray-950 shadow-[0_0_24px_rgba(251,146,60,0.35)] hover:brightness-110'
            }`}
          >
            {running ? 'Stop' : 'Engage'}
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-x-10 gap-y-4 px-4 pt-2 pb-3">
        <Stat
          value={running ? Math.round(rate).toLocaleString() : '—'}
          label="seeds / sec"
          tone={running ? 'text-amber-300 drop-shadow-[0_0_14px_rgba(251,191,36,0.45)]' : 'text-gray-600'}
        />
        <Stat value={checked.toLocaleString()} label="derived this run" tone="text-gray-300" />
        <Stat
          value={candidates.toLocaleString()}
          label="filter hits"
          tone={candidates > 0 ? 'text-emerald-400' : 'text-gray-600'}
        />
        {running && rate > 0 && (
          <div className="ml-auto text-right">
            <div className="font-mono text-lg text-orange-400 tabular-nums">
              {Math.round(rate / CHAIN_RATE).toLocaleString()}×
            </div>
            <div className="text-[10px] tracking-wide text-gray-500 uppercase">vs chain mode</div>
          </div>
        )}
      </div>

      <div className="flex h-8 items-end gap-1 px-4">
        {(running ? perWorker : Array<number>(threads).fill(0)).map((r, i) => (
          <div key={i} className="flex-1 rounded-sm bg-gray-800/60" style={{ height: '100%' }}>
            <div
              className="w-full rounded-sm bg-gradient-to-t from-amber-500 to-orange-400 transition-[height] duration-150"
              style={{ height: `${running ? Math.max(8, (r / peak) * 100) : 0}%`, marginTop: 'auto' }}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3 pb-2 text-[11px]">
        <span className="text-gray-500">
          {info ? (
            <>
              filter · <span className="text-gray-300">{info.count.toLocaleString()}</span>{' '}
              {info.full ? 'addresses' : 'confirmed-funded addresses'} ·{' '}
              {fmtBytes(info.bytes)} · <span className="text-gray-600">{info.label}</span>
            </>
          ) : (
            'loading filter…'
          )}
        </span>
        <button
          onClick={() => fileInput.current?.click()}
          className="rounded border border-gray-700 px-2 py-1 text-gray-400 transition-colors hover:border-gray-600 hover:text-white"
        >
          load full filter
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".bloom,application/octet-stream"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) onLoadFilter(file)
            e.target.value = ''
          }}
        />
      </div>

      {!info?.full && (
        <p className="px-4 pb-2 text-[11px] text-amber-500/70">
          The starter set is a sample, not the chain — it covers a few thousand of the ~50M funded
          addresses. Ludicrous is faster and blinder than chain mode. Build a full filter with{' '}
          <code className="text-amber-400/80">npm run keys:filter</code>.
        </p>
      )}

      {error && <p className="px-4 pb-2 text-[11px] text-red-400">{error}</p>}

      {stream.length > 0 && (
        <div className="relative border-t border-gray-800/60">
          <ol className="h-40 overflow-hidden px-4 py-2 font-mono text-[10px] leading-4 text-gray-600">
            {stream.map((s, i) => (
              <li key={`${s.address}-${i}`} className="flex gap-3" style={{ opacity: 1 - i / 14 }}>
                <span className="w-6 shrink-0 text-gray-800">0.0</span>
                <span className="min-w-0 flex-1 truncate">{shortPhrase(s.words)}</span>
                <span className="hidden shrink-0 text-gray-700 sm:inline">
                  {shortAddr(s.address, 14, 6)}
                </span>
              </li>
            ))}
          </ol>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-gray-950 to-transparent" />
        </div>
      )}
    </section>
  )
}
