/**
 * Build the starter set of funded addresses for BTC Roulette's local filter.
 *
 * Samples real output addresses from recent blocks, then keeps only the ones a
 * balance lookup confirms are currently funded — so every address shipped in
 * the bundle is one that actually holds coins.
 *
 * Usage: node scripts/keys-sample.mjs [targetCount]
 */
import { writeFileSync } from 'node:fs'

const TARGET = Number(process.argv[2] ?? 4000)
const OUT = new URL('../src/tabs/keys/data/funded.json', import.meta.url)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  return res.json()
}

console.log('fetching recent blocks…')
const blocks = await getJson('https://mempool.space/api/v1/blocks')
const candidates = new Set()

outer: for (const block of blocks) {
  for (let page = 0; page < 6; page++) {
    const txs = await getJson(`https://mempool.space/api/block/${block.id}/txs/${page * 25}`)
    for (const tx of txs) {
      for (const out of tx.vout ?? []) {
        if (out.scriptpubkey_address) candidates.add(out.scriptpubkey_address)
      }
    }
    process.stdout.write(`\r  block ${block.height} · ${candidates.size} candidates`)
    if (candidates.size >= TARGET * 2) break outer
    await sleep(120)
  }
}
console.log(`\ncollected ${candidates.size} candidate addresses`)

console.log('verifying balances…')
const list = [...candidates]
const funded = []
for (let i = 0; i < list.length; i += 50) {
  const chunk = list.slice(i, i + 50)
  try {
    const json = await getJson(
      `https://blockchain.info/balance?cors=true&active=${chunk.join('|')}`,
    )
    for (const [addr, row] of Object.entries(json)) {
      if (row.final_balance > 0) funded.push(addr)
    }
  } catch (err) {
    console.warn(`\n  chunk ${i} failed: ${err.message}`)
  }
  process.stdout.write(`\r  ${i + chunk.length}/${list.length} checked · ${funded.length} funded`)
  if (funded.length >= TARGET) break
  await sleep(250)
}

funded.sort()
writeFileSync(
  OUT,
  JSON.stringify({ built: new Date().toISOString().slice(0, 10), addresses: funded }),
)
console.log(`\nwrote ${funded.length} confirmed-funded addresses -> ${OUT.pathname}`)
