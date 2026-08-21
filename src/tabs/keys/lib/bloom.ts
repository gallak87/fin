/**
 * Bloom filter over funded addresses.
 *
 * The point of a local filter is to delete the network round trip from the hot
 * loop — a membership test costs a few multiplies instead of 2 seconds. Sized
 * the same way whether it holds the 2.6k starter set or a 50M-address dump, so
 * one code path serves both.
 */
export interface Bloom {
  bits: Uint8Array
  /** bit count */
  m: number
  /** hashes per entry */
  k: number
  /** entries it was sized for */
  n: number
}

const MAGIC = 0x424c4d31 // "BLM1"
const HEADER_BYTES = 16

/** Two independent FNV-1a-style hashes, combined below into k indices. */
function hashPair(s: string): [number, number] {
  let h1 = 0x811c9dc5
  let h2 = 0xc2b2ae35
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193)
    h2 = Math.imul(h2 ^ c, 0x85ebca6b)
  }
  // h2 must be odd so the probe sequence strides the whole array
  return [h1 >>> 0, (h2 | 1) >>> 0]
}

export function createBloom(n: number, p = 1e-6): Bloom {
  const m = Math.max(64, Math.ceil((-n * Math.log(p)) / Math.LN2 ** 2))
  // cap k so a tiny n can't ask for a pathological number of probes
  const k = Math.min(32, Math.max(1, Math.round((m / n) * Math.LN2)))
  return { bits: new Uint8Array(Math.ceil(m / 8)), m, k, n }
}

export function bloomAdd(f: Bloom, value: string): void {
  const [h1, h2] = hashPair(value)
  for (let i = 0; i < f.k; i++) {
    const idx = ((h1 + Math.imul(i, h2)) >>> 0) % f.m
    f.bits[idx >>> 3]! |= 1 << (idx & 7)
  }
}

export function bloomHas(f: Bloom, value: string): boolean {
  const [h1, h2] = hashPair(value)
  for (let i = 0; i < f.k; i++) {
    const idx = ((h1 + Math.imul(i, h2)) >>> 0) % f.m
    if ((f.bits[idx >>> 3]! & (1 << (idx & 7))) === 0) return false
  }
  return true
}

export function bloomFrom(values: string[], p = 1e-6): Bloom {
  const f = createBloom(values.length, p)
  for (const v of values) bloomAdd(f, v)
  return f
}

/** Header + bits, so a filter built offline can be loaded straight off disk. */
export function serializeBloom(f: Bloom): Uint8Array {
  const out = new Uint8Array(HEADER_BYTES + f.bits.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, MAGIC)
  view.setUint32(4, f.m)
  view.setUint32(8, f.k)
  view.setUint32(12, f.n)
  out.set(f.bits, HEADER_BYTES)
  return out
}

export function deserializeBloom(buf: ArrayBuffer): Bloom {
  const view = new DataView(buf)
  if (view.getUint32(0) !== MAGIC) throw new Error('not a bloom filter file')
  const m = view.getUint32(4)
  const k = view.getUint32(8)
  const n = view.getUint32(12)
  return { bits: new Uint8Array(buf, HEADER_BYTES), m, k, n }
}

export function bloomBytes(f: Bloom): number {
  return f.bits.length
}
