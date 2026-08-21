import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SeedGrid } from './components/SeedGrid'
import type { Slot } from './components/WordSlot'
import { SeedResult } from './components/SeedResult'
import { OddsStrip } from './components/OddsStrip'
import { SpinFeed } from './components/SpinFeed'
import type { SpinRow } from './components/SpinFeed'
import { fetchStats, totals, ZERO } from './lib/balance'
import type { AddrStat } from './lib/balance'
import {
  deriveAddresses,
  fmtBtc,
  isValidPhrase,
  isWord,
  searchSpace,
  solveLastWord,
  spin,
} from './lib/seed'
import type { WordCount } from './lib/seed'

const STORE_KEY = 'fin-keys'
const SPIN_MS = 1800
const DEEP_DEPTH = 10
const WALL_LIMIT = 300

interface Lookup {
  key: string
  map: Map<string, AddrStat> | null
  error: string | null
}

const EMPTY_STATS: Map<string, AddrStat> = new Map()

function emptySlots(n: number): Slot[] {
  return Array.from({ length: n }, () => ({ word: '', pinned: false }))
}

function loadSaved(): { count: WordCount; slots: Slot[] } {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) {
      const saved = JSON.parse(raw) as { count?: number; pins?: string[] }
      const count: WordCount = saved.count === 12 ? 12 : 24
      const pins = saved.pins ?? []
      return {
        count,
        slots: Array.from({ length: count }, (_, i) => ({
          word: pins[i] ?? '',
          pinned: Boolean(pins[i]),
        })),
      }
    }
  } catch {
    // corrupt payload — start clean
  }
  return { count: 24, slots: emptySlots(24) }
}

export default function KeysPage() {
  const [{ count, slots }, setState] = useState(loadSaved)
  const [depth, setDepth] = useState(1)
  const [lookup, setLookup] = useState<Lookup>({ key: '', map: null, error: null })
  const [auto, setAuto] = useState(false)
  const [rows, setRows] = useState<SpinRow[]>([])
  // the wall is capped for memory; the tally is not
  const [checked, setChecked] = useState(0)
  const [hit, setHit] = useState<SpinRow | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [retry, setRetry] = useState(0)

  const startedAt = useRef<number | null>(null)
  const lastRowKey = useRef<string | null>(null)

  const setSlots = useCallback(
    (fn: (prev: Slot[]) => Slot[]) => setState((s) => ({ ...s, slots: fn(s.slots) })),
    [],
  )

  const words = useMemo(() => slots.map((s) => s.word), [slots])
  const pinnedCount = slots.filter((s) => s.pinned && s.word !== '').length
  const filled = words.filter(Boolean).length
  const complete = filled === count
  const valid = complete && isValidPhrase(words)
  const phrase = valid ? words.join(' ') : ''
  const space = useMemo(
    () => searchSpace(slots.map((s) => s.pinned && s.word !== ''), count),
    [slots, count],
  )

  const addresses = useMemo(() => (phrase ? deriveAddresses(phrase, depth) : []), [phrase, depth])

  // one lookup at a time, identified by what was asked for — so stale results
  // never paint over a phrase that has since changed
  const lookupKey = `${phrase}|${depth}|${retry}`
  const fresh = lookup.key === lookupKey
  const stats = fresh && lookup.map ? lookup.map : EMPTY_STATS
  const error = fresh ? lookup.error : null
  const checking = valid && !fresh

  useEffect(() => {
    localStorage.setItem(
      STORE_KEY,
      JSON.stringify({ count, pins: slots.map((s) => (s.pinned ? s.word : '')) }),
    )
  }, [count, slots])

  // Every complete, checksum-valid phrase gets looked up — whether it arrived
  // by spin or by typing. Debounced so typing the last word doesn't fire twice.
  useEffect(() => {
    if (!addresses.length) return
    let cancelled = false
    const timer = setTimeout(() => {
      fetchStats(addresses.map((a) => a.address))
        .then((map) => {
          if (cancelled) return
          setLookup({ key: lookupKey, map, error: null })
          const sum = totals(addresses.map((a) => map.get(a.address) ?? ZERO))
          const row: SpinRow = {
            key: phrase,
            words: phrase.split(' '),
            address: addresses[0]!.address,
            balance: sum.balance,
            txs: sum.txs,
          }
          startedAt.current ??= Date.now()
          setElapsed(Date.now() - startedAt.current)
          // a deep scan re-checks a phrase already on the wall: replace it in
          // place rather than counting it as a fresh seed
          const recheck = lastRowKey.current === row.key
          lastRowKey.current = row.key
          setRows((prev) =>
            recheck ? [row, ...prev.slice(1)] : [row, ...prev].slice(0, WALL_LIMIT),
          )
          if (!recheck) setChecked((n) => n + 1)
          if (sum.balance > 0) {
            setHit(row)
            setAuto(false)
          }
        })
        .catch((err: unknown) => {
          if (cancelled) return
          setLookup({
            key: lookupKey,
            map: null,
            error: err instanceof Error ? err.message : 'chain lookup failed',
          })
          setAuto(false)
        })
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [addresses, phrase, lookupKey])

  const doSpin = useCallback(() => {
    setDepth(1)
    setState((s) => {
      const rolled = spin(s.slots.map((sl) => (sl.pinned ? sl.word : null)))
      if (!rolled) return s
      return { ...s, slots: rolled.map((w, i) => ({ word: w, pinned: s.slots[i]!.pinned })) }
    })
  }, [])

  // keep the interval callback pointed at the latest closure
  const spinRef = useRef(doSpin)
  const busyRef = useRef(false)
  useEffect(() => {
    spinRef.current = doSpin
    busyRef.current = checking
  })

  useEffect(() => {
    if (!auto) return
    spinRef.current()
    const id = setInterval(() => {
      if (!busyRef.current) spinRef.current()
    }, SPIN_MS)
    return () => clearInterval(id)
  }, [auto])

  const setSlot = useCallback(
    (i: number, word: string, pinned: boolean) =>
      setSlots((prev) => prev.map((s, j) => (j === i ? { word, pinned } : s))),
    [setSlots],
  )

  const togglePin = useCallback(
    (i: number) => setSlots((prev) => prev.map((s, j) => (j === i ? { ...s, pinned: !s.pinned } : s))),
    [setSlots],
  )

  const pasteMany = useCallback((start: number, pasted: string[]) => {
    setState((s) => {
      const next: WordCount = start === 0 && pasted.length === 12 ? 12 : start === 0 && pasted.length >= 24 ? 24 : s.count
      const slots = Array.from({ length: next }, (_, i) => s.slots[i] ?? { word: '', pinned: false })
      pasted.forEach((w, k) => {
        const i = start + k
        if (i < next) slots[i] = { word: w, pinned: true }
      })
      return { count: next, slots }
    })
  }, [])

  const loadPhrase = useCallback((picked: string[]) => {
    setDepth(1)
    setState({
      count: picked.length === 12 ? 12 : 24,
      slots: picked.map((w) => ({ word: w, pinned: true })),
    })
  }, [])

  const changeCount = useCallback((next: WordCount) => {
    setDepth(1)
    setState((s) => ({
      count: next,
      slots: Array.from({ length: next }, (_, i) => s.slots[i] ?? { word: '', pinned: false }),
    }))
  }, [])

  const fixChecksum = useCallback(() => {
    setSlots((prev) => {
      const candidates = solveLastWord(prev.map((s) => s.word))
      if (!candidates.length) return prev
      const pick = candidates[Math.floor(Math.random() * candidates.length)]!
      return prev.map((s, i) => (i === prev.length - 1 ? { word: pick, pinned: s.pinned } : s))
    })
  }, [setSlots])

  const allPinned = pinnedCount === count
  const badWord = words.some((w) => w !== '' && !isWord(w))

  const status = badWord
    ? { tone: 'text-red-400', text: 'not a BIP39 word' }
    : !complete
      ? { tone: 'text-gray-500', text: `${filled} / ${count} words` }
      : valid
        ? { tone: 'text-emerald-400', text: 'checksum valid' }
        : { tone: 'text-amber-400', text: 'checksum mismatch' }

  return (
    <main className="mx-auto max-w-4xl space-y-3 p-4">
      <header className="pt-2 pb-1">
        <h1 className="text-xl font-semibold tracking-tight">Seed Roulette</h1>
        <p className="mt-0.5 text-[13px] text-gray-500">
          Pin the words you know. Roll the rest. Every spin gets checked against the chain.
        </p>
      </header>

      {hit && (
        <div className="rounded-xl border border-emerald-500/50 bg-emerald-500/10 px-4 py-3">
          <div className="text-[11px] tracking-wide text-emerald-400 uppercase">Funded wallet</div>
          <div className="mt-1 font-mono text-2xl text-emerald-300">{fmtBtc(hit.balance)} BTC</div>
          <p className="mt-1 font-mono text-[11px] break-all text-emerald-200/70">{hit.words.join(' ')}</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-[11px] text-emerald-200/60">
              Someone's coins are on the other end of this phrase. Spinning stopped.
            </p>
            <button
              onClick={() => setHit(null)}
              className="shrink-0 text-[11px] text-emerald-300/60 hover:text-emerald-200"
            >
              dismiss
            </button>
          </div>
        </div>
      )}

      <section className="rounded-xl border border-gray-800 bg-gray-900/50 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex overflow-hidden rounded-lg border border-gray-800">
              {([12, 24] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => changeCount(c)}
                  className={`px-2.5 py-1 font-mono text-[11px] transition-colors ${
                    count === c ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <span className={`text-[11px] ${status.tone}`}>{status.text}</span>
            {complete && !valid && !badWord && (
              <button
                onClick={fixChecksum}
                className="rounded border border-amber-500/40 px-2 py-0.5 text-[11px] text-amber-300 transition-colors hover:bg-amber-500/10"
              >
                fix last word
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 text-[11px] text-gray-500">
            <button
              onClick={() => setSlots((prev) => prev.map((s) => ({ ...s, pinned: false })))}
              className="transition-colors hover:text-gray-200"
            >
              unpin all
            </button>
            <button
              onClick={() => setState((s) => ({ ...s, slots: emptySlots(s.count) }))}
              className="transition-colors hover:text-gray-200"
            >
              clear
            </button>
          </div>
        </div>

        <SeedGrid slots={slots} spinning={auto} onSet={setSlot} onTogglePin={togglePin} onPasteMany={pasteMany} />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-gray-600">
            {pinnedCount === 0
              ? 'nothing pinned — every word rolls'
              : allPinned
                ? 'all 24 pinned — unpin a word to roll'
                : `${pinnedCount} pinned · ${count - pinnedCount} rolling`}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={doSpin}
              disabled={allPinned || auto}
              className="rounded-lg bg-amber-500 px-5 py-1.5 text-[13px] font-semibold text-gray-950 transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-600"
            >
              Spin
            </button>
            <button
              onClick={() => setAuto((a) => !a)}
              disabled={allPinned}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                auto
                  ? 'border-amber-500/60 bg-amber-500/10 text-amber-300'
                  : 'border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white'
              }`}
            >
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${auto ? 'animate-pulse bg-amber-400' : 'bg-gray-600'}`}
              />
              {auto ? 'Stop' : 'Auto'}
            </button>
          </div>
        </div>
      </section>

      <OddsStrip space={space} pinned={pinnedCount} checked={checked} elapsedMs={elapsed} />

      {valid && (
        <SeedResult
          phrase={words}
          addresses={addresses}
          stats={stats}
          checking={checking}
          error={error}
          deep={depth > 1}
          onDeepScan={() => setDepth(DEEP_DEPTH)}
          onRetry={() => setRetry((n) => n + 1)}
        />
      )}

      <SpinFeed rows={rows} total={checked} onPick={loadPhrase} />

      <p className="pb-6 text-center text-[11px] text-gray-700">
        Keys never leave your browser. Balances come from blockchain.info · mempool.space.
      </p>
    </main>
  )
}
