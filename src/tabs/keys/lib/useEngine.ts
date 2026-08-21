import { useCallback, useEffect, useRef, useState } from 'react'
import type { Bloom } from './bloom'
import { serializeBloom } from './bloom'
import type { EngineMessage, EngineSample } from './engineTypes'

export const MAX_THREADS = Math.max(1, navigator.hardwareConcurrency || 4)
const FLUSH_MS = 100
const STREAM_ROWS = 24

export interface EngineState {
  running: boolean
  /** seeds derived since start */
  checked: number
  /** seeds per second, summed across workers */
  rate: number
  /** per-worker rate, for the activity bars */
  perWorker: number[]
  stream: EngineSample[]
  /** addresses that matched the filter and are being verified against the chain */
  candidates: number
}

const IDLE: EngineState = {
  running: false,
  checked: 0,
  rate: 0,
  perWorker: [],
  stream: [],
  candidates: 0,
}

/**
 * A pool of derivation workers. Progress lands ~6x/sec per worker, which would
 * be ~50 renders/sec across the pool — so messages accumulate in refs and flush
 * to state on a fixed interval instead.
 */
export function useEngine(onCandidate: (words: string[], address: string) => void) {
  const [state, setState] = useState<EngineState>(IDLE)
  const workers = useRef<Worker[]>([])
  const checked = useRef(0)
  const candidates = useRef(0)
  const rates = useRef<number[]>([])
  const stream = useRef<EngineSample[]>([])
  const dirty = useRef(false)
  const candidateCb = useRef(onCandidate)

  useEffect(() => {
    candidateCb.current = onCandidate
  })

  const stop = useCallback(() => {
    for (const w of workers.current) w.terminate()
    workers.current = []
    rates.current = []
    setState((s) => ({ ...s, running: false, rate: 0, perWorker: [] }))
  }, [])

  const start = useCallback(
    (pins: (string | null)[], filter: Bloom, threads: number) => {
      stop()
      checked.current = 0
      candidates.current = 0
      stream.current = []
      rates.current = Array(threads).fill(0)

      const packed = serializeBloom(filter)
      workers.current = Array.from({ length: threads }, (_, i) => {
        const worker = new Worker(new URL('./engine.worker.ts', import.meta.url), {
          type: 'module',
        })
        worker.addEventListener('message', (event: MessageEvent<EngineMessage>) => {
          const msg = event.data
          if (msg.type === 'progress') {
            checked.current += msg.checked
            rates.current[i] = msg.ms > 0 ? (msg.checked / msg.ms) * 1000 : 0
            if (msg.sample) {
              stream.current = [msg.sample, ...stream.current].slice(0, STREAM_ROWS)
            }
          } else {
            candidates.current += 1
            candidateCb.current(msg.words, msg.address)
          }
          dirty.current = true
        })
        // each worker gets its own copy of the filter bits
        worker.postMessage({ type: 'start', pins, filter: packed.slice().buffer }, [])
        return worker
      })

      setState({ ...IDLE, running: true, perWorker: Array(threads).fill(0) })
    },
    [stop],
  )

  useEffect(() => {
    const id = setInterval(() => {
      if (!dirty.current) return
      dirty.current = false
      setState((s) =>
        s.running
          ? {
              ...s,
              checked: checked.current,
              candidates: candidates.current,
              rate: rates.current.reduce((a, b) => a + b, 0),
              perWorker: [...rates.current],
              stream: stream.current,
            }
          : s,
      )
    }, FLUSH_MS)
    return () => clearInterval(id)
  }, [])

  useEffect(() => stop, [stop])

  return { state, start, stop }
}
