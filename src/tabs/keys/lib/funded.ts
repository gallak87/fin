/**
 * The address set the local engine checks against.
 *
 * Ships with every address holding at least 1 BTC — ~971k of them in a 3.5MB
 * filter, fetched once and cached by the browser. That is where the money
 * actually is; the other ~49M funded addresses are mostly dust and would cost
 * 180MB to cover. Load a wider filter from the panel if you want them.
 */
import bundledUrl from '../data/funded.bloom?url'
import type { Bloom } from './bloom'
import { deserializeBloom } from './bloom'

export interface FilterInfo {
  filter: Bloom
  label: string
  count: number
  bytes: number
  /** true when the user loaded their own filter file over the bundled one */
  custom: boolean
}

let bundled: FilterInfo | null = null

export async function loadBundledFilter(): Promise<FilterInfo> {
  if (bundled) return bundled
  const res = await fetch(bundledUrl)
  if (!res.ok) throw new Error(`could not load the bundled filter (${res.status})`)
  const filter = deserializeBloom(await res.arrayBuffer())
  bundled = {
    filter,
    label: 'bundled · every address holding ≥ 1 BTC',
    count: filter.n,
    bytes: filter.bits.length,
    custom: false,
  }
  return bundled
}

export function loadFilterFile(buf: ArrayBuffer, name: string): FilterInfo {
  const filter = deserializeBloom(buf)
  return {
    filter,
    label: name,
    count: filter.n,
    bytes: filter.bits.length,
    custom: true,
  }
}

export function fmtBytes(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}MB`
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}KB`
  return `${n}B`
}
