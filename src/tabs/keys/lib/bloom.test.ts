import { describe, expect, it } from 'vitest'
import { bloomFrom, bloomHas, createBloom, deserializeBloom, serializeBloom } from './bloom'

const SAMPLE = [
  '1LqBGSKuX5yYUonjxT5qGfpUsXKYYWeabA',
  'bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu',
  '37VucYSaXLCAsxYyAPfbSi9eh4iEcbShgf',
]

describe('bloom', () => {
  it('never misses a member', () => {
    const f = bloomFrom(SAMPLE)
    for (const s of SAMPLE) expect(bloomHas(f, s)).toBe(true)
  })

  it('holds its false positive rate on a realistic load', () => {
    const members = Array.from({ length: 20_000 }, (_, i) => `addr-member-${i}`)
    const f = bloomFrom(members, 1e-6)
    let hits = 0
    for (let i = 0; i < 200_000; i++) if (bloomHas(f, `stranger-${i}`)) hits++
    // 1e-6 over 200k probes: expect ~0, allow slack without letting a broken
    // hash (which would light up thousands) through
    expect(hits).toBeLessThan(10)
  })

  it('sizes itself to ~3.6MB per million entries', () => {
    const f = createBloom(1_000_000, 1e-6)
    const mb = f.bits.length / 1e6
    expect(mb).toBeGreaterThan(3.4)
    expect(mb).toBeLessThan(3.8)
  })

  it('survives a serialize round trip', () => {
    const f = bloomFrom(SAMPLE)
    const back = deserializeBloom(serializeBloom(f).buffer as ArrayBuffer)
    expect(back.m).toBe(f.m)
    expect(back.k).toBe(f.k)
    for (const s of SAMPLE) expect(bloomHas(back, s)).toBe(true)
  })

  it('rejects a file that is not a filter', () => {
    expect(() => deserializeBloom(new ArrayBuffer(32))).toThrow(/not a bloom/)
  })
})
