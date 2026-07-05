import { useEffect } from 'react'
import { useBacktestStore } from '../store'

const SPEEDS = [1, 2, 4, 8, 16, 32, 64]
const BASE_BPS = 4 // bars per second at 1×

function usePlayback() {
  const playing = useBacktestStore((s) => s.playing)
  const speed = useBacktestStore((s) => s.speed)
  const stepFwd = useBacktestStore((s) => s.stepFwd)

  useEffect(() => {
    if (!playing) return
    const bps = BASE_BPS * speed
    const intervalMs = Math.max(16, 1000 / bps) // batch bars when > 60/s
    const barsPerTick = Math.max(1, Math.round((bps * intervalMs) / 1000))
    const id = setInterval(() => stepFwd(barsPerTick), intervalMs)
    return () => clearInterval(id)
  }, [playing, speed, stepFwd])
}

export function PlaybackBar() {
  const { bars, result, cursor, playing, speed } = useBacktestStore()
  const { play, pause, stepFwd, stepBack, seek, setSpeed } = useBacktestStore()
  usePlayback()

  if (!bars || !result) return null
  const warmup = result.run.warmup
  const date = bars[cursor]?.t ?? ''

  const btn =
    'px-2 py-1 text-xs text-gray-400 border border-gray-700 rounded hover:text-white hover:border-gray-500'

  return (
    <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur rounded-xl border border-gray-800 px-3 py-2 flex flex-wrap items-center gap-2">
      <button className={btn} onClick={() => seek(warmup)} title="Back to start">
        ⏮
      </button>
      <button className={btn} onClick={() => stepBack()} title="Step back one day">
        −1
      </button>
      <button
        onClick={playing ? pause : play}
        title={playing ? 'Pause' : 'Play'}
        className="w-9 h-9 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm flex items-center justify-center shrink-0"
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <button className={btn} onClick={() => stepFwd()} title="Step forward one day">
        +1
      </button>
      <button className={btn} onClick={() => seek(bars.length - 1)} title="Jump to end">
        ⏭
      </button>

      <select
        value={speed}
        onChange={(e) => setSpeed(Number(e.target.value))}
        className="bg-gray-900 border border-gray-700 rounded px-1.5 py-1 text-xs text-gray-300"
      >
        {SPEEDS.map((s) => (
          <option key={s} value={s}>
            {s}×
          </option>
        ))}
      </select>

      <input
        type="range"
        min={warmup}
        max={bars.length - 1}
        value={cursor}
        onChange={(e) => seek(Number(e.target.value))}
        className="flex-1 min-w-32 accent-blue-500"
      />

      <span className="font-mono text-xs text-gray-400 tabular-nums">
        {date} · {(cursor + 1).toLocaleString()}/{bars.length.toLocaleString()}
      </span>
    </div>
  )
}
