#!/usr/bin/env node
/**
 * Refresh src/data/locations.json from Zillow Research public CSVs.
 *
 *   npm run data:pull                  # default metric (4+ bedroom)
 *   npm run data:pull -- --metric=sfr  # single-family only (incl. small homes)
 *   npm run data:pull -- --metric=4br  # exactly 4-bedroom
 *
 * No API key, no dependencies. Downloads a few large CSVs each run (~50-100MB
 * each) and filters to the cities below. Home prices are real; SFH rent is
 * DERIVED from price (Zillow's rent index blends apartments and understates
 * single-family rent), so it ships as an editable default, not a measurement.
 */
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// ── config ──────────────────────────────────────────────────────────────
const PRICE_TO_RENT = 26 // annual; monthly SFH rent ≈ price / 26 / 12
const TARGET_YEARS = [2023, 2024, 2025] // plus the latest available, auto-added

const CITIES = [
  { id: 'kirkland', city: 'Kirkland', district: 'Lake Washington SD', schoolRating: 8 },
  { id: 'redmond', city: 'Redmond', district: 'Lake Washington SD', schoolRating: 8 },
  { id: 'bellevue', city: 'Bellevue', district: 'Bellevue SD', schoolRating: 8 },
  { id: 'woodinville', city: 'Woodinville', district: 'Northshore SD', schoolRating: 8 },
  { id: 'sammamish', city: 'Sammamish', district: 'Issaquah / Lake Washington SD', schoolRating: 9 },
]
const STATE = 'WA'

const BASE = 'https://files.zillowstatic.com/research/public_csvs'
const ZHVI = (slug) => `${BASE}/zhvi/City_zhvi_${slug}_tier_0.33_0.67_sm_sa_month.csv`
// metric → list of ZHVI series to average together
const METRICS = {
  '4plus': ['bdrmcnt_4_uc_sfrcondo', 'bdrmcnt_5_uc_sfrcondo'],
  '4br': ['bdrmcnt_4_uc_sfrcondo'],
  '5br': ['bdrmcnt_5_uc_sfrcondo'],
  sfr: ['uc_sfr'],
  blended: ['uc_sfrcondo'],
}
const ZORI_URL = `${BASE}/zori/City_zori_uc_sfrcondomfr_sm_month.csv`

const METRIC_LABEL = {
  '4plus': 'ZHVI 4+ bedroom (mean of 4BR and 5BR+ typical values)',
  '4br': 'ZHVI 4-bedroom',
  '5br': 'ZHVI 5+ bedroom',
  sfr: 'ZHVI single-family only (excludes condos)',
  blended: 'ZHVI all homes (single-family + condo, blended)',
}

// ── tiny quoted-CSV line parser (Metro column contains commas) ───────────
function parseLine(line) {
  const out = []
  let cur = ''
  let q = false
  for (const ch of line) {
    if (ch === '"') q = !q
    else if (ch === ',' && !q) {
      out.push(cur)
      cur = ''
    } else cur += ch
  }
  out.push(cur)
  return out
}

const cityNames = CITIES.map((c) => c.city)

/** Fetch a Zillow city CSV → { headerDateCols, rows: { [city]: number[] } } */
async function fetchCsv(url) {
  process.stdout.write(`  ↓ ${url.split('/').pop()}\n`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`)
  const text = await res.text()
  const lines = text.split('\n')
  const header = parseLine(lines[0])
  const dateCols = header
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => /^\d{4}-\d{2}-\d{2}$/.test(h))
  const rows = {}
  for (let k = 1; k < lines.length; k++) {
    const line = lines[k]
    if (!line.includes(`,${STATE},`)) continue
    if (!cityNames.some((n) => line.includes(n))) continue
    const f = parseLine(line)
    if (f[5] !== STATE || !cityNames.includes(f[2])) continue
    rows[f[2]] = f
  }
  return { header, dateCols, rows }
}

/** Pick the column name to use for each target year (last column in that year). */
function resolveYearColumns(dateCols) {
  const byYear = {}
  for (const { h } of dateCols) {
    const y = h.slice(0, 4)
    byYear[y] = h // later columns overwrite → ends on the year's last month
  }
  const latestYear = dateCols.at(-1).h.slice(0, 4)
  const years = [...new Set([...TARGET_YEARS.map(String), latestYear])].sort()
  const map = {}
  for (const y of years) if (byYear[y]) map[y] = byYear[y]
  return map
}

async function main() {
  const arg = process.argv.find((a) => a.startsWith('--metric='))
  const metric = arg ? arg.split('=')[1] : '4plus'
  if (!METRICS[metric]) {
    console.error(`Unknown metric "${metric}". Options: ${Object.keys(METRICS).join(', ')}`)
    process.exit(1)
  }
  console.log(`Pulling Zillow data — home metric: ${metric} (${METRIC_LABEL[metric]})`)

  // home price: fetch each series in the metric, average them per city/column
  const series = await Promise.all(METRICS[metric].map((slug) => fetchCsv(ZHVI(slug))))
  const zori = await fetchCsv(ZORI_URL)

  const yearCols = resolveYearColumns(series[0].dateCols)
  const zoriCols = resolveYearColumns(zori.dateCols)
  const colIndex = (csv, name) => csv.header.indexOf(name)

  const locations = CITIES.map(({ id, city, district, schoolRating }) => {
    const years = {}
    for (const [year, col] of Object.entries(yearCols)) {
      // average the metric's series for this city/column
      const vals = series
        .map((s) => s.rows[city])
        .filter(Boolean)
        .map((row, i) => Number(row[colIndex(series[i], col)]))
        .filter((v) => Number.isFinite(v) && v > 0)
      if (vals.length === 0) continue
      const price = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
      const sfhRent = Math.round(price / PRICE_TO_RENT / 12 / 50) * 50
      const zCol = zoriCols[year]
      const zRow = zori.rows[city]
      const zoriBlended = zCol && zRow ? Math.round(Number(zRow[colIndex(zori, zCol)])) || null : null
      years[year] = { medianHomePrice: price, sfhRent, zoriBlended }
    }
    return { id, city, district, schoolRating, years }
  })

  const doc = {
    _meta: {
      source: `Zillow Research public CSVs, pulled ${new Date().toISOString().slice(0, 10)}`,
      generatedBy: 'npm run data:pull',
      homePrice: `${METRIC_LABEL[metric]}, city level, last month of each year + latest available`,
      sfhRent: `DERIVED, NOT MEASURED — medianHomePrice / ${PRICE_TO_RENT} / 12, rounded to $50. Editable default.`,
      zoriBlended: 'Raw Zillow ZORI — blends apartments+condos+SFH, understates single-family rent. Reference floor only.',
      schoolRating: 'HAND-SET PLACEHOLDER — verify against GreatSchools before shipping',
    },
    locations,
  }

  const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'locations.json')
  await writeFile(out, JSON.stringify(doc, null, 2) + '\n')

  console.log(`\nWrote ${out}`)
  const latest = Object.keys(locations[0].years).sort().at(-1)
  console.log(`\nLatest (${latest}):`)
  for (const l of [...locations].sort((a, b) => a.years[latest].medianHomePrice - b.years[latest].medianHomePrice)) {
    const y = l.years[latest]
    console.log(`  ${l.city.padEnd(12)} $${y.medianHomePrice.toLocaleString().padStart(10)}  rent ~$${y.sfhRent.toLocaleString()}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
