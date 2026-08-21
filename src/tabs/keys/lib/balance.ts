/**
 * Chain lookups. blockchain.info's bulk endpoint takes a pile of addresses in
 * one CORS-friendly request, which is what makes checking a whole spin cheap —
 * one call instead of one per address. mempool.space covers small sets if it
 * goes down.
 */
export interface AddrStat {
  /** satoshis */
  balance: number
  received: number
  txs: number
}

export const ZERO: AddrStat = { balance: 0, received: 0, txs: 0 }

const cache = new Map<string, AddrStat>()
const CHUNK = 50

interface BulkRow {
  final_balance?: number
  n_tx?: number
  total_received?: number
}

async function bulk(addresses: string[]): Promise<Map<string, AddrStat>> {
  const out = new Map<string, AddrStat>()
  for (let i = 0; i < addresses.length; i += CHUNK) {
    const chunk = addresses.slice(i, i + CHUNK)
    const url = `https://blockchain.info/balance?cors=true&active=${chunk.join('|')}`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`blockchain.info ${res.status}`)
    const json = (await res.json()) as Record<string, BulkRow>
    for (const addr of chunk) {
      const row = json[addr]
      out.set(addr, {
        balance: row?.final_balance ?? 0,
        received: row?.total_received ?? 0,
        txs: row?.n_tx ?? 0,
      })
    }
  }
  return out
}

interface EsploraStats {
  funded_txo_sum: number
  spent_txo_sum: number
  tx_count: number
}

async function esplora(addresses: string[]): Promise<Map<string, AddrStat>> {
  const out = new Map<string, AddrStat>()
  for (const addr of addresses) {
    const res = await fetch(`https://mempool.space/api/address/${addr}`)
    if (!res.ok) throw new Error(`mempool.space ${res.status}`)
    const json = (await res.json()) as { chain_stats: EsploraStats }
    const s = json.chain_stats
    out.set(addr, {
      balance: s.funded_txo_sum - s.spent_txo_sum,
      received: s.funded_txo_sum,
      txs: s.tx_count,
    })
  }
  return out
}

/**
 * Look up every address, hitting the network only for ones not seen yet.
 * Balances are cached for the session — a rolled seed is not going to sprout
 * coins while you sit there.
 */
export async function fetchStats(addresses: string[]): Promise<Map<string, AddrStat>> {
  const missing = addresses.filter((a) => !cache.has(a))
  if (missing.length) {
    let fetched: Map<string, AddrStat>
    try {
      fetched = await bulk(missing)
    } catch (err) {
      if (missing.length > 8) throw err
      fetched = await esplora(missing)
    }
    for (const [addr, stat] of fetched) cache.set(addr, stat)
  }
  const out = new Map<string, AddrStat>()
  for (const a of addresses) out.set(a, cache.get(a) ?? ZERO)
  return out
}

export function totals(stats: Iterable<AddrStat>) {
  let balance = 0
  let received = 0
  let txs = 0
  for (const s of stats) {
    balance += s.balance
    received += s.received
    txs += s.txs
  }
  return { balance, received, txs }
}
