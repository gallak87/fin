import { describe, expect, it } from 'vitest'
import { deriveAddresses, isValidPhrase, searchSpace, solveLastWord, spin } from './seed'

// the canonical BIP39 test vector: entropy of all zero bits
const ABANDON_12 = 'abandon '.repeat(11) + 'about'
const ABANDON_24 = 'abandon '.repeat(23) + 'art'

describe('address derivation', () => {
  it('matches the published BIP44/49/84 vectors', () => {
    const at = (mnemonic: string) => {
      const map = new Map(deriveAddresses(mnemonic).map((a) => [`${a.kind}${a.chain}`, a.address]))
      return map
    }
    const a = at(ABANDON_12)
    expect(a.get('legacy0')).toBe('1LqBGSKuX5yYUonjxT5qGfpUsXKYYWeabA')
    expect(a.get('nested0')).toBe('37VucYSaXLCAsxYyAPfbSi9eh4iEcbShgf')
    expect(a.get('segwit0')).toBe('bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu')

    const b = at(ABANDON_24)
    expect(b.get('segwit0')).toBe('bc1qzmtrqsfuaf6l6kkcsseumq26ukaphfj9skkug6')
  })

  it('derives receive and change chains to the requested depth', () => {
    const addrs = deriveAddresses(ABANDON_24, 3)
    expect(addrs).toHaveLength(3 * 2 * 3)
    expect(new Set(addrs.map((a) => a.address)).size).toBe(addrs.length)
  })
})

describe('spin', () => {
  it('keeps pinned words and still lands on a valid checksum', () => {
    const pins = Array(24).fill(null) as (string | null)[]
    pins[0] = 'abandon'
    pins[5] = 'legal'
    pins[23] = 'art' // pinning the checksum word forces the solver elsewhere
    for (let i = 0; i < 5; i++) {
      const words = spin(pins)!
      expect(words[0]).toBe('abandon')
      expect(words[5]).toBe('legal')
      expect(words[23]).toBe('art')
      expect(isValidPhrase(words)).toBe(true)
    }
  })

  it('rolls a valid phrase from nothing', () => {
    const words = spin(Array(12).fill(null))!
    expect(words).toHaveLength(12)
    expect(isValidPhrase(words)).toBe(true)
  })

  it('returns null when every slot is pinned', () => {
    expect(spin(ABANDON_24.split(' '))).toBeNull()
  })
})

describe('checksum repair', () => {
  it('finds the 8 last words that complete a 24-word phrase', () => {
    const broken = [...ABANDON_24.split(' ').slice(0, 23), 'zoo']
    const fixes = solveLastWord(broken)
    expect(fixes).toHaveLength(8)
    expect(fixes).toContain('art')
    for (const w of fixes) expect(isValidPhrase([...broken.slice(0, 23), w])).toBe(true)
  })
})

describe('search space', () => {
  it('starts at the full 2^256 and shrinks 2048x per pinned word', () => {
    const none = Array(24).fill(false)
    expect(searchSpace(none, 24)).toBe(2n ** 256n)
    const one = [...none]
    one[0] = true
    expect(searchSpace(one, 24)).toBe(2n ** 245n)
  })

  it('only counts the entropy bits the checksum word actually carries', () => {
    const last = Array(24).fill(false)
    last[23] = true
    expect(searchSpace(last, 24)).toBe(2n ** 253n)
    expect(searchSpace(Array(24).fill(true), 24)).toBe(1n)
  })
})
