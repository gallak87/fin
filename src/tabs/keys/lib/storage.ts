/**
 * The two things worth keeping between sessions.
 *
 * Not the seeds themselves: at ~700/sec that is 83MB an hour to answer a
 * question ("seen this one before?") whose answer stays no for longer than the
 * universe has existed.
 */
const LIFETIME_KEY = 'fin-keys-lifetime'
const HITS_KEY = 'fin-keys-hits'

export interface StoredHit {
  words: string[]
  address: string
  balance: number
  txs: number
  found: string
}

export function loadLifetime(): number {
  try {
    const raw = Number(localStorage.getItem(LIFETIME_KEY))
    return Number.isFinite(raw) && raw > 0 ? raw : 0
  } catch {
    return 0
  }
}

export function saveLifetime(total: number): void {
  try {
    localStorage.setItem(LIFETIME_KEY, String(Math.round(total)))
  } catch {
    // private mode / quota — the counter is decoration, never block on it
  }
}

export function loadHits(): StoredHit[] {
  try {
    const raw = localStorage.getItem(HITS_KEY)
    return raw ? (JSON.parse(raw) as StoredHit[]) : []
  } catch {
    return []
  }
}

/** Written the moment a hit is confirmed — a refresh must not eat it. */
export function appendHit(hit: StoredHit): void {
  try {
    localStorage.setItem(HITS_KEY, JSON.stringify([hit, ...loadHits()].slice(0, 20)))
  } catch {
    // nothing useful to do, and the banner still has it on screen
  }
}
