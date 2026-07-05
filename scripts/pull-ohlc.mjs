#!/usr/bin/env node
/**
 * Refresh src/data/ohlc/ from Yahoo Finance's chart API (Stooq now sits
 * behind a JS anti-bot wall).
 *
 *   npm run data:ohlc
 *
 * No API key, no dependencies. Writes one column-oriented JSON per ticker
 * plus index.json (the manifest the ticker picker reads). Prices are
 * dividend/split ADJUSTED (o/h/l scaled by adjclose/close) so buy-and-hold
 * returns include dividends.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// ── config ──────────────────────────────────────────────────────────────
const START_DATE = '2000-01-01'

const TICKERS = [
  { sym: 'SPY', ticker: 'SPY', name: 'S&P 500 ETF' },
  { sym: 'QQQ', ticker: 'QQQ', name: 'Nasdaq 100 ETF' },
  { sym: 'GLD', ticker: 'GLD', name: 'Gold ETF' },
  { sym: 'AAPL', ticker: 'AAPL', name: 'Apple' },
  { sym: 'TLT', ticker: 'TLT', name: '20y Treasury ETF' },
  { sym: 'BTC-USD', ticker: 'BTC', name: 'Bitcoin / USD' },
]

const URL_FOR = (sym) =>
  `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=max&interval=1d`
const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'ohlc')

// ── pull ────────────────────────────────────────────────────────────────
const round4 = (x) => Math.round(x * 10000) / 10000

async function pull({ sym, ticker, name }) {
  const res = await fetch(URL_FOR(sym), { headers: { 'User-Agent': 'Mozilla/5.0' } })
  const body = await res.text()
  if (!res.ok) throw new Error(`yahoo ${sym}: HTTP ${res.status}: ${body.slice(0, 200)}`)

  const result = JSON.parse(body)?.chart?.result?.[0]
  const ts = result?.timestamp
  const quote = result?.indicators?.quote?.[0]
  const adj = result?.indicators?.adjclose?.[0]?.adjclose
  if (!ts?.length || !quote) throw new Error(`yahoo ${sym}: unexpected payload: ${body.slice(0, 200)}`)

  const cols = { t: [], o: [], h: [], l: [], c: [], v: [] }
  for (let i = 0; i < ts.length; i++) {
    const date = new Date(ts[i] * 1000).toISOString().slice(0, 10)
    if (date < START_DATE) continue
    const [o, h, l, c] = [quote.open[i], quote.high[i], quote.low[i], quote.close[i]]
    if (![o, h, l, c].every((x) => Number.isFinite(x) && x > 0)) continue
    // scale the whole candle so closes match the dividend/split-adjusted series
    const k = Number.isFinite(adj?.[i]) && adj[i] > 0 ? adj[i] / c : 1
    cols.t.push(date)
    cols.o.push(round4(o * k))
    cols.h.push(round4(h * k))
    cols.l.push(round4(l * k))
    cols.c.push(round4(c * k))
    cols.v.push(quote.volume[i] || 0)
  }
  if (cols.t.length < 100) throw new Error(`yahoo ${sym}: only ${cols.t.length} usable rows`)

  const data = { ticker, name, source: 'yahoo', pulledAt: new Date().toISOString(), ...cols }
  await writeFile(join(OUT_DIR, `${ticker}.json`), JSON.stringify(data))
  console.log(`${ticker.padEnd(5)} ${cols.t.length} bars  ${cols.t[0]} → ${cols.t.at(-1)}`)
  return { ticker, name, firstDate: cols.t[0], lastDate: cols.t.at(-1), bars: cols.t.length }
}

await mkdir(OUT_DIR, { recursive: true })
const manifest = []
for (const t of TICKERS) manifest.push(await pull(t)) // sequential — be polite
await writeFile(join(OUT_DIR, 'index.json'), JSON.stringify(manifest, null, 2))
console.log(`wrote ${manifest.length} tickers + index.json to src/data/ohlc/`)
