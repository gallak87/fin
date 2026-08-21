/**
 * The address set the local engine checks against.
 *
 * Ships with a starter set sampled from recent blocks, every entry confirmed
 * funded by a balance lookup at build time (`npm run keys:sample`). It is a
 * rounding error next to the ~50M funded addresses that exist — load a full
 * filter built by `npm run keys:filter` to cover the real set.
 */
import type { Bloom } from './bloom'
import { bloomFrom, deserializeBloom } from './bloom'

export interface FilterInfo {
  filter: Bloom
  label: string
  count: number
  bytes: number
  /** true once a full filter file replaces the bundled starter set */
  full: boolean
}

let starter: FilterInfo | null = null

export async function loadStarterFilter(): Promise<FilterInfo> {
  if (starter) return starter
  const data = (await import('../data/funded.json')).default
  const filter = bloomFrom(data.addresses)
  starter = {
    filter,
    label: `starter set · sampled ${data.built}`,
    count: data.addresses.length,
    bytes: filter.bits.length,
    full: false,
  }
  return starter
}

export function loadFilterFile(buf: ArrayBuffer, name: string): FilterInfo {
  const filter = deserializeBloom(buf)
  return {
    filter,
    label: name,
    count: filter.n,
    bytes: filter.bits.length,
    full: true,
  }
}

export function fmtBytes(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}MB`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}KB`
  return `${n}B`
}
