import { useEffect, useState } from 'react'
import { useBacktestStore, loadBars } from '../store'
import { CUSTOM_ID } from '../engine/custom'
import { getStrategy, defaultParams } from '../engine/strategies'
import { runBacktest } from '../engine/engine'
import { PRESETS, type Preset } from '../engine/presets'
import { fmtK, fmtPct } from '../../../lib/format'

interface PresetStats {
  totalReturn: number
  end: number
  maxDrawdown: number
}

// computed once per preset+capital; bundled data is static
const statsCache = new Map<string, PresetStats>()

function usePresetStats(preset: Preset, capital: number): PresetStats | null {
  const key = `${preset.id}:${capital}`
  const [, bump] = useState(0)
  useEffect(() => {
    if (statsCache.has(key)) return
    let alive = true
    void (async () => {
      const bars = await loadBars(preset.ticker)
      if (!bars) return
      const strategy = getStrategy(preset.strategyId)
      const r = runBacktest(bars, strategy, { ...defaultParams(strategy), ...preset.params }, capital, preset.settings)
      statsCache.set(key, {
        totalReturn: r.metrics.totalReturn,
        end: r.equity[r.equity.length - 1],
        maxDrawdown: r.metrics.maxDrawdown,
      })
      if (alive) bump((n) => n + 1) // re-render → cache hit below
    })()
    return () => {
      alive = false
    }
  }, [key, preset, capital])
  return statsCache.get(key) ?? null
}

function PresetCard({ preset }: { preset: Preset }) {
  const ticker = useBacktestStore((s) => s.ticker)
  const strategyId = useBacktestStore((s) => s.strategyId)
  const params = useBacktestStore((s) => s.params)
  const settings = useBacktestStore((s) => s.settings)
  const capital = useBacktestStore((s) => s.capital)
  const applyPreset = useBacktestStore((s) => s.applyPreset)
  const stats = usePresetStats(preset, capital)

  const current =
    strategyId === CUSTOM_ID ? {} : { ...defaultParams(getStrategy(strategyId)), ...(params[strategyId] ?? {}) }
  const active =
    ticker === preset.ticker &&
    strategyId === preset.strategyId &&
    JSON.stringify(current) === JSON.stringify(preset.params) &&
    JSON.stringify(settings) === JSON.stringify(preset.settings)

  return (
    <button
      onClick={() => applyPreset(preset)}
      title={preset.blurb}
      className={`w-full text-left rounded-lg border px-3 py-1.5 ${
        active ? 'border-blue-500 bg-blue-500/10' : 'border-gray-800 hover:border-gray-600'
      }`}
    >
      <div className="text-sm">
        <span className="font-semibold text-blue-300">{preset.ticker}</span>{' '}
        <span className="text-gray-200">{preset.name}</span>
        <span className="text-gray-500"> · stop 7%</span>
      </div>
      {stats && (
        <div className="font-mono text-[11px] tabular-nums flex gap-2.5">
          <span className={stats.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}>
            {stats.totalReturn >= 10
              ? `+${Math.round(stats.totalReturn * 100).toLocaleString()}%`
              : fmtPct(stats.totalReturn, 0)}
          </span>
          <span className="text-gray-400">{fmtK(stats.end)}</span>
          <span className="text-red-400/70">DD {fmtPct(stats.maxDrawdown, 0)}</span>
        </div>
      )}
    </button>
  )
}

/** Field-tested starting points — clicking sets ticker + strategy + settings. */
export function PresetList() {
  return (
    <div className="space-y-1.5">
      {PRESETS.map((p) => (
        <PresetCard key={p.id} preset={p} />
      ))}
    </div>
  )
}
