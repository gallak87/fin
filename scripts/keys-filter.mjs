/**
 * Build a Bloom filter of funded addresses for BTC Roulette's local engine.
 *
 * Input is a TSV of `address <tab> balance-in-satoshis`, one per line — the
 * Blockchair dumps or the Loyce.club mirror. Reads a file or stdin, so the
 * dump can be streamed straight off the wire:
 *
 *   curl -s http://addresses.loyce.club/blockchair_bitcoin_addresses_and_balance_LATEST.tsv.gz \
 *     | gunzip | node --experimental-strip-types scripts/keys-filter.mjs - rich.bloom --min 1
 *
 * Those dumps are sorted by balance descending, so --min stops reading as soon
 * as the balances fall through the floor — a 1 BTC cut costs ~20MB of transfer
 * instead of 1.8GB. Order is verified while reading; if the file turns out not
 * to be sorted, it falls back to scanning the whole thing.
 *
 * Imports the app's own bloom.ts so the filter is built with exactly the hash
 * the browser reads it back with — a divergent implementation would produce a
 * filter that silently never matches.
 */
import { createReadStream, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { bloomAdd, createBloom, serializeBloom } from '../src/tabs/keys/lib/bloom.ts'

const argv = process.argv.slice(2)
const flag = (name, fallback) => {
  const i = argv.indexOf(name)
  return i === -1 ? fallback : argv[i + 1]
}
const positional = argv.filter((a, i) => !a.startsWith('--') && !argv[i - 1]?.startsWith('--'))

const [dump, out = 'funded.bloom'] = positional
const minBtc = Number(flag('--min', '0'))
const fpRate = Number(flag('--fp', '1e-6'))

if (!dump) {
  console.error('usage: keys-filter.mjs <dump.tsv|-> [out.bloom] [--min <btc>] [--fp <rate>]')
  process.exit(1)
}

const minSats = Math.round(minBtc * 1e8)
const looksLikeAddress = (s) => s.startsWith('1') || s.startsWith('3') || s.startsWith('bc1')

function lines() {
  const input = dump === '-' ? process.stdin : createReadStream(dump)
  return createInterface({ input, crlfDelay: Infinity })
}

/** Collect every address at or above the floor, stopping early where possible. */
async function collect() {
  const kept = []
  let seen = 0
  let previous = Infinity
  let sorted = true

  for await (const line of lines()) {
    const tab = line.indexOf('\t')
    const address = tab === -1 ? line : line.slice(0, tab)
    if (!looksLikeAddress(address)) continue // header and blank lines
    const balance = tab === -1 ? Infinity : Number(line.slice(tab + 1))
    seen++

    if (balance > previous) sorted = false
    previous = balance

    if (balance >= minSats) {
      kept.push(address)
    } else if (sorted) {
      console.log(`\n  sorted dump — stopped at ${seen.toLocaleString()} rows`)
      break
    }
    if (kept.length % 250_000 === 0 && kept.length) {
      process.stdout.write(`\r  ${kept.length.toLocaleString()} kept`)
    }
  }
  return kept
}

console.log(
  `reading ${dump === '-' ? 'stdin' : dump}${minBtc > 0 ? ` · keeping >= ${minBtc} BTC` : ''}`,
)
const addresses = await collect()

if (addresses.length === 0) {
  console.error('no addresses matched — wrong file, or --min set too high')
  process.exit(1)
}

const filter = createBloom(addresses.length, fpRate)
console.log(
  `\rhashing ${addresses.length.toLocaleString()} addresses -> ` +
    `${(filter.bits.length / 1e6).toFixed(1)}MB · k=${filter.k} · p=${fpRate}`,
)
for (const address of addresses) bloomAdd(filter, address)

writeFileSync(out, serializeBloom(filter))
console.log(`wrote ${out} · load it from the Ludicrous panel`)
