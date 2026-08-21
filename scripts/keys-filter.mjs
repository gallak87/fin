/**
 * Build a full Bloom filter of funded addresses for Seed Roulette's local
 * engine, from a dump of one address per line (Blockchair / Loyce.club daily
 * lists; a trailing balance column is ignored).
 *
 * Imports the app's own bloom.ts so the filter is built with exactly the hash
 * the browser reads it back with — a divergent implementation would produce a
 * filter that silently never matches.
 *
 * Usage: node --experimental-strip-types scripts/keys-filter.mjs <dump> [out.bloom] [fpRate]
 */
import { createReadStream, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline'
import { bloomAdd, createBloom, serializeBloom } from '../src/tabs/keys/lib/bloom.ts'

const [dump, out = 'funded.bloom', rate = '1e-6'] = process.argv.slice(2)
if (!dump) {
  console.error('usage: keys-filter.mjs <dump-file> [out.bloom] [fpRate]')
  process.exit(1)
}

const looksLikeAddress = (s) => s.startsWith('1') || s.startsWith('3') || s.startsWith('bc1')

async function* addresses() {
  const rl = createInterface({ input: createReadStream(dump), crlfDelay: Infinity })
  for await (const line of rl) {
    const addr = line.split(/[\s,]/, 1)[0]
    if (addr && looksLikeAddress(addr)) yield addr
  }
}

// sizing needs the count up front, so the dump gets read twice
console.log(`counting ${dump}…`)
let n = 0
for await (const _ of addresses()) {
  if (++n % 5_000_000 === 0) process.stdout.write(`\r  ${n.toLocaleString()}`)
}
console.log(`\r  ${n.toLocaleString()} addresses`)

const filter = createBloom(n, Number(rate))
console.log(`filter: ${(filter.bits.length / 1e6).toFixed(1)}MB · k=${filter.k} · p=${rate}`)

let i = 0
for await (const addr of addresses()) {
  bloomAdd(filter, addr)
  if (++i % 5_000_000 === 0) process.stdout.write(`\r  hashing ${i.toLocaleString()}`)
}

writeFileSync(out, serializeBloom(filter))
console.log(`\rwrote ${out} · ${(filter.bits.length / 1e6).toFixed(1)}MB · load it from the Ludicrous panel`)
