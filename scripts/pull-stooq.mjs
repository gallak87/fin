#!/usr/bin/env node
/**
 * Refresh src/data/ohlc/ from Stooq's free daily-history CSV endpoint.
 *
 *   npm run data:ohlc
 *
 * No API key, no dependencies. Writes one column-oriented JSON per ticker
 * plus index.json (the manifest the ticker picker reads). Stooq rate-limits
 * by IP (~a few hundred hits/day); the script fails loudly if it hits that.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// ── config ──────────────────────────────────────────────────────────────
const START_DATE = '2000-01-01'

const TICKERS = [
  { sym: 'spy.us', ticker: 'SPY', name: 'S&P 500 ETF' },
  { sym: 'qqq.us', ticker: 'QQQ', name: 'Nasdaq 100 ETF' },
  { sym: 'gld.us', ticker: 'GLD', name: 'Gold ETF' },
  { sym: 'aapl.us', ticker: 'AAPL', name: 'Apple' },
  { sym: 'tlt.us', ticker: 'TLT', name: '20y Treasury ETF' },
  { sym: 'btcusd', ticker: 'BTC', name: 'Bitcoin / USD' },
]

const URL_FOR = (sym) => `https://stooq.com/q/d/l/?s=${sym}&i=d`
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'ohlc')

// ── pull ────────────────────────────────────────────────────────────────
const round4 = (x) => Math.round(x * 10000) / 10000

async function pull({ sym, ticker, name }) {
  const res = await fetch(URL_FOR(sym))
  const body = await res.text()
  if (!res.ok || !body.startsWith('Date,')) {
    throw new Error(`stooq ${sym}: unexpected response (${res.status}): ${body.slice(0, 200)}`)
  }

  const cols = { t: [], o: [], h: [], l: [], c: [], v: [] }
  for (const line of body.split('\n').slice(1)) {
    const [date, o, h, l, c, v] = line.trim().split(',')
    if (!date || date < START_DATE) continue
    const [op, hi, lo, cl] = [o, h, l, c].map(Number)
    if (![op, hi, lo, cl].every((x) => Number.isFinite(x) && x > 0)) continue
    cols.t.push(date)
    cols.o.push(round4(op))
    cols.h.push(round4(hi))
    cols.l.push(round4(lo))
    cols.c.push(round4(cl))
    cols.v.push(Number(v) || 0)
  }
  if (cols.t.length < 100) throw new Error(`stooq ${sym}: only ${cols.t.length} usable rows`)

  const data = { ticker, name, source: 'stooq', pulledAt: new Date().toISOString(), ...cols }
  await writeFile(join(OUT_DIR, `${ticker}.json`), JSON.stringify(data))
  console.log(`${ticker.padEnd(5)} ${cols.t.length} bars  ${cols.t[0]} → ${cols.t.at(-1)}`)
  return { ticker, name, firstDate: cols.t[0], lastDate: cols.t.at(-1), bars: cols.t.length }
}

await mkdir(OUT_DIR, { recursive: true })
const manifest = []
for (const t of TICKERS) manifest.push(await pull(t)) // sequential — be polite to stooq
await writeFile(join(OUT_DIR, 'index.json'), JSON.stringify(manifest, null, 2))
console.log(`wrote ${manifest.length} tickers + index.json to src/data/ohlc/`)
