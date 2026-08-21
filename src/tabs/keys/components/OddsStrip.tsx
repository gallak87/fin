import { groupDigits, sci } from '../lib/seed'

const YEAR_SECONDS = 31_557_600
const UNIVERSE_SECONDS = 4.35e17 // ~13.8 billion years

function sciNum(n: number, dp = 1): string {
  if (n < 1000) return n.toFixed(n < 10 ? 1 : 0)
  const exp = Math.floor(Math.log10(n))
  return `${(n / 10 ** exp).toFixed(dp)} × 10^${exp}`
}

function fmtSpan(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '—'
  const universes = seconds / UNIVERSE_SECONDS
  if (universes >= 1) return `${sciNum(universes)} × the age of the universe`
  const years = seconds / YEAR_SECONDS
  if (years >= 1) return `${sciNum(years)} years`
  if (seconds >= 3600) return `${(seconds / 3600).toFixed(1)} hours`
  return `${seconds.toFixed(0)} seconds`
}

interface Props {
  space: bigint
  pinned: number
  checked: number
  /** seeds per second, from whichever engine is driving */
  rate: number
}

export function OddsStrip({ space, pinned, checked, rate }: Props) {
  const exhaust = rate > 0 ? Number(space) / rate : Infinity
  const odds = checked > 0 ? Number(space) / checked : Number(space)

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-900/30 px-3 py-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <div>
          <div className="text-[10px] tracking-wide text-gray-500 uppercase">
            Seeds still matching your pins
          </div>
          <div className="font-mono text-lg text-amber-300/90">{sci(space)}</div>
        </div>
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-[11px]">
          <div>
            <dt className="text-gray-500">checked</dt>
            <dd className="font-mono tabular-nums text-gray-300">{checked.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="text-gray-500">odds so far</dt>
            <dd className="font-mono text-gray-300">1 in {sciNum(odds)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">to check them all</dt>
            <dd className="font-mono text-gray-300">{fmtSpan(exhaust)}</dd>
          </div>
        </dl>
      </div>
      <p className="mt-2 font-mono text-[9px] leading-relaxed break-all text-gray-700">
        {groupDigits(space)}
      </p>
      {pinned > 0 && (
        <p className="mt-1 text-[10px] text-gray-600">
          {pinned} pinned {pinned === 1 ? 'word' : 'words'} — each one you lock cuts the space by 2048×.
        </p>
      )}
    </section>
  )
}
