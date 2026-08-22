/**
 * One derivation worker. Rolls seeds against the pinned words and tests every
 * derived address against a local Bloom filter — no network in the hot loop,
 * which is the entire reason this is ~1000x the manual spinner.
 */
import { bloomHas, deserializeBloom } from './bloom'
import type { Bloom } from './bloom'
import { deriveAddresses, spin } from './seed'
import type { EngineMessage, EngineRequest, EngineSample } from './engineTypes'

const ctx = self as unknown as Worker
const BATCH_MS = 150

let running = false
let filter: Bloom | null = null
let pins: (string | null)[] = []

function post(msg: EngineMessage) {
  ctx.postMessage(msg)
}

function runBatch() {
  if (!running || !filter) return
  const started = performance.now()
  let checked = 0
  let sample: EngineSample | null = null

  while (performance.now() - started < BATCH_MS) {
    const words = spin(pins)
    if (!words) {
      running = false
      break
    }
    const addresses = deriveAddresses(words.join(' '), 1)
    for (const a of addresses) {
      if (bloomHas(filter, a.address)) post({ type: 'candidate', words, address: a.address })
    }
    sample = { words, address: addresses[0]!.address }
    checked++
  }

  post({ type: 'progress', checked, ms: performance.now() - started, sample })
  // yield to the message queue so a stop lands between batches
  if (running) setTimeout(runBatch, 0)
}

ctx.addEventListener('message', (event: MessageEvent<EngineRequest>) => {
  const msg = event.data
  if (msg.type === 'stop') {
    running = false
    return
  }
  filter = deserializeBloom(msg.filter)
  pins = msg.pins
  if (!running) {
    running = true
    runBatch()
  }
})
