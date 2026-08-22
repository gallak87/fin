/**
 * BIP39 seed phrases ↔ bitcoin addresses.
 *
 * The whole page rests on one idea: a mnemonic is just entropy with a checksum
 * stapled on, so "pick 24 words" and "jump to a point in the keyspace" are the
 * same move. Pinning words fixes bits; the rest are rolled.
 */
import { HDKey } from '@scure/bip32'
import { entropyToMnemonic, mnemonicToSeedSync, validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { base58check, bech32 } from '@scure/base'
import { sha256 } from '@noble/hashes/sha2.js'
import { ripemd160 } from '@noble/hashes/legacy.js'

export const WORDS: readonly string[] = wordlist
const WORD_SET = new Set(wordlist)

export type WordCount = 12 | 24
export type AddressKind = 'segwit' | 'nested' | 'legacy'

export const KINDS: AddressKind[] = ['segwit', 'nested', 'legacy']

export const KIND_LABEL: Record<AddressKind, string> = {
  segwit: 'Native SegWit',
  nested: 'Nested SegWit',
  legacy: 'Legacy',
}

/** BIP44/49/84 account paths — the three ways wallets have derived mainnet keys. */
const ACCOUNT_PATH: Record<AddressKind, string> = {
  segwit: "m/84'/0'/0'",
  nested: "m/49'/0'/0'",
  legacy: "m/44'/0'/0'",
}

export function isWord(w: string) {
  return WORD_SET.has(w)
}

/** Up to `n` wordlist entries starting with `prefix`. */
export function suggest(prefix: string, n = 6): string[] {
  const p = prefix.trim().toLowerCase()
  if (!p) return []
  const out: string[] = []
  for (const w of wordlist) {
    if (w.startsWith(p)) {
      out.push(w)
      if (out.length === n) break
    }
  }
  return out
}

// ---------------------------------------------------------------- addresses

const b58check = base58check(sha256)
const hash160 = (b: Uint8Array) => ripemd160(sha256(b))

function concat(...parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let off = 0
  for (const p of parts) {
    out.set(p, off)
    off += p.length
  }
  return out
}

function encodeAddress(kind: AddressKind, pubkey: Uint8Array): string {
  const h = hash160(pubkey)
  switch (kind) {
    case 'legacy':
      return b58check.encode(concat(new Uint8Array([0x00]), h))
    case 'nested': {
      // P2SH-wrapped P2WPKH: the redeem script is the witness program itself
      const redeem = concat(new Uint8Array([0x00, 0x14]), h)
      return b58check.encode(concat(new Uint8Array([0x05]), hash160(redeem)))
    }
    case 'segwit':
      return bech32.encode('bc', [0, ...bech32.toWords(h)])
  }
}

export interface DerivedAddress {
  kind: AddressKind
  path: string
  address: string
  /** 0 = receive chain, 1 = change chain */
  chain: 0 | 1
  index: number
}

/**
 * Derive every receive+change address up to `depth` for all three address
 * kinds. depth=1 (48 addrs saved as 6) is the per-spin check; deeper scans are
 * on demand, since funds often sit past index 0.
 */
export function deriveAddresses(mnemonic: string, depth = 1): DerivedAddress[] {
  const root = HDKey.fromMasterSeed(mnemonicToSeedSync(mnemonic))
  const out: DerivedAddress[] = []
  for (const kind of KINDS) {
    const account = root.derive(ACCOUNT_PATH[kind])
    for (const chain of [0, 1] as const) {
      const branch = account.deriveChild(chain)
      for (let i = 0; i < depth; i++) {
        const node = branch.deriveChild(i)
        out.push({
          kind,
          chain,
          index: i,
          path: `${ACCOUNT_PATH[kind]}/${chain}/${i}`,
          address: encodeAddress(kind, node.publicKey!),
        })
      }
    }
  }
  return out
}

// ------------------------------------------------------------------- spins

export function isValidPhrase(words: string[]) {
  return words.length > 0 && words.every(isWord) && validateMnemonic(words.join(' '), wordlist)
}

const WORD_INDEX = new Map(wordlist.map((w, i) => [w, i]))

/** How many of the final word's 11 bits are checksum rather than entropy. */
const CHECKSUM_BITS = { 12: 4, 24: 8 } as const
const ENTROPY_BYTES = { 12: 16, 24: 32 } as const

/** Pack word indices into their raw 11-bits-per-word bitstream. */
function packBits(indices: number[]): Uint8Array {
  const out = new Uint8Array(Math.ceil((indices.length * 11) / 8))
  let bit = 0
  for (const idx of indices) {
    for (let b = 10; b >= 0; b--) {
      if ((idx >> b) & 1) out[bit >> 3]! |= 0x80 >> (bit & 7)
      bit++
    }
  }
  return out
}

/**
 * Checksum test straight off the bitstream — the same rule validateMnemonic
 * applies, minus the string parsing, because a spin runs it thousands of times.
 */
function checksumHolds(indices: number[], count: WordCount): boolean {
  const csBits = CHECKSUM_BITS[count]
  const packed = packBits(indices)
  const entropy = packed.slice(0, ENTROPY_BYTES[count])
  const want = packed[ENTROPY_BYTES[count]]! >> (8 - csBits)
  return sha256(entropy)[0]! >> (8 - csBits) === want
}

/**
 * Every final word that completes the phrase. The last word spends most of its
 * bits on the checksum, so only its few entropy bits need enumerating: 8
 * candidates for a 24-word phrase, 128 for a 12-word one.
 */
function lastWordOptions(indices: number[], count: WordCount): number[] {
  const csBits = CHECKSUM_BITS[count]
  const draft = [...indices]
  const out: number[] = []
  for (let prefix = 0; prefix < 1 << (11 - csBits); prefix++) {
    draft[count - 1] = prefix << csBits
    const entropy = packBits(draft).slice(0, ENTROPY_BYTES[count])
    out.push((prefix << csBits) | (sha256(entropy)[0]! >> (8 - csBits)))
  }
  return out
}

function randomInts(n: number, max: number): number[] {
  const buf = new Uint32Array(n)
  crypto.getRandomValues(buf)
  // 2048 divides 2^32 evenly, so a plain modulo stays uniform here
  return Array.from(buf, (v) => v % max)
}

function randomPick<T>(arr: T[]): T {
  return arr[randomInts(1, arr.length)[0]!]!
}

/**
 * Fill every unpinned slot with random words, landing on a phrase whose
 * checksum actually passes.
 *
 * Rolling blindly only works 1-in-256 of the time (1-in-16 for 12 words), so
 * one unpinned slot is held back as a solver: roll the rest, then work out
 * which of its 2048 values check out and take one at random.
 */
export function spin(pins: (string | null)[]): string[] | null {
  const count = (pins.length === 12 ? 12 : 24) as WordCount
  if (pins.length !== count) return null
  const open: number[] = []
  for (let i = 0; i < count; i++) if (!pins[i]) open.push(i)
  if (open.length === 0) return null

  const indices = pins.map((w) => (w ? (WORD_INDEX.get(w) ?? 0) : 0))
  // the last word is mostly checksum, which makes it the cheapest solver slot
  const lastOpen = !pins[count - 1]
  const solver = lastOpen ? count - 1 : open[open.length - 1]!
  const rollers = open.filter((i) => i !== solver)

  for (let attempt = 0; attempt < 64; attempt++) {
    const rolled = randomInts(rollers.length, 2048)
    rollers.forEach((slot, k) => {
      indices[slot] = rolled[k]!
    })

    if (lastOpen) {
      indices[solver] = randomPick(lastWordOptions(indices, count))
      return indices.map((i) => wordlist[i]!)
    }

    // last word pinned: the checksum is fixed, so hunt for solver values that
    // produce entropy hashing to it
    const valid: number[] = []
    for (let c = 0; c < 2048; c++) {
      indices[solver] = c
      if (checksumHolds(indices, count)) valid.push(c)
    }
    if (valid.length) {
      indices[solver] = randomPick(valid)
      return indices.map((i) => wordlist[i]!)
    }
  }
  return null
}

/** Valid last words for an otherwise-complete phrase — the "fix checksum" fixer. */
export function solveLastWord(words: string[]): string[] {
  const count = (words.length === 12 ? 12 : 24) as WordCount
  if (words.length !== count || words.slice(0, -1).some((w) => !isWord(w))) return []
  const indices = words.map((w) => WORD_INDEX.get(w) ?? 0)
  return lastWordOptions(indices, count).map((i) => wordlist[i]!)
}

export function randomPhrase(count: WordCount): string[] {
  const entropy = new Uint8Array(count === 24 ? 32 : 16)
  crypto.getRandomValues(entropy)
  return entropyToMnemonic(entropy, wordlist).split(' ')
}

// -------------------------------------------------------------------- odds

/**
 * How many valid phrases still match the pins. Every word is 11 bits, except
 * the last, which spends 8 of its 11 on the checksum (4 for a 12-word phrase).
 */
export function searchSpace(pinned: boolean[], count: WordCount): bigint {
  const entropyBits = count === 24 ? 256 : 128
  const checksumBits = count === 24 ? 8 : 4
  let fixed = 0
  for (let i = 0; i < count; i++) {
    if (!pinned[i]) continue
    fixed += i === count - 1 ? 11 - checksumBits : 11
  }
  return 2n ** BigInt(Math.max(0, entropyBits - fixed))
}

// --------------------------------------------------------------- formatting

/** Same idea as sci(), for values that arrive as plain numbers. */
export function sciNum(n: number, dp = 1): string {
  if (!isFinite(n)) return '∞'
  if (n === 0) return '0'
  if (n >= 1000 || n < 0.001) {
    const exp = Math.floor(Math.log10(Math.abs(n)))
    return `${(n / 10 ** exp).toFixed(dp)} × 10^${exp}`
  }
  return n < 10 ? n.toFixed(1) : n.toFixed(0)
}

/** "1.16 × 10^77" — big numbers, honestly. */
export function sci(n: bigint, dp = 2): string {
  if (n < 1000n) return n.toString()
  const digits = n.toString()
  const exp = digits.length - 1
  const mantissa = `${digits[0]}.${digits.slice(1, 1 + dp)}`
  return `${mantissa} × 10^${exp}`
}

export function groupDigits(n: bigint): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

export function fmtBtc(sats: number): string {
  return (sats / 1e8).toFixed(8)
}

export function shortAddr(a: string, head = 10, tail = 6): string {
  return a.length <= head + tail + 1 ? a : `${a.slice(0, head)}…${a.slice(-tail)}`
}

export function shortPhrase(words: string[]): string {
  if (words.length <= 4) return words.join(' ')
  return `${words.slice(0, 3).join(' ')} … ${words[words.length - 1]}`
}
