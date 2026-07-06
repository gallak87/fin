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

function SavedCard({ id }: { id: string }) {
  const strat = useBacktestStore((s) => s.savedStrats.find((x) => x.id === id))
  const strategyId = useBacktestStore((s) => s.strategyId)
  const params = useBacktestStore((s) => s.params)
  const settings = useBacktestStore((s) => s.settings)
  const customCode = useBacktestStore((s) => s.customCode)
  const applyStrat = useBacktestStore((s) => s.applyStrat)
  const deleteStrat = useBacktestStore((s) => s.deleteStrat)
  if (!strat) return null

  const current =
    strategyId === CUSTOM_ID ? {} : { ...defaultParams(getStrategy(strategyId)), ...(params[strategyId] ?? {}) }
  const active =
    strat.strategyId === strategyId &&
    JSON.stringify(strat.params) === JSON.stringify(current) &&
    JSON.stringify(strat.settings) === JSON.stringify(settings) &&
    (strat.customCode == null || strat.customCode === customCode)

  return (
    <div
      onClick={() => applyStrat(strat.id)}
      title="Apply this saved setup (keeps the current ticker)"
      className={`group w-full flex items-center gap-1 rounded-lg border px-3 py-1.5 cursor-pointer ${
        active ? 'border-blue-500 bg-blue-500/10' : 'border-gray-800 hover:border-gray-600'
      }`}
    >
      <span className="flex-1 font-mono text-xs text-gray-200 truncate">{strat.label}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          deleteStrat(strat.id)
        }}
        title="Delete"
        className="w-4 h-4 rounded-full flex items-center justify-center text-gray-600 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10"
      >
        ×
      </button>
    </div>
  )
}

/**
 * The playbook: bundled presets (switch ticker too) followed by the user's
 * saved setups (keep the ticker), with save at the bottom.
 */
export function PresetList() {
  const savedStrats = useBacktestStore((s) => s.savedStrats)
  const saveCurrentStrat = useBacktestStore((s) => s.saveCurrentStrat)
  return (
    <div className="space-y-1.5">
      {PRESETS.map((p) => (
        <PresetCard key={p.id} preset={p} />
      ))}
      {savedStrats.length > 0 && <div className="border-t border-gray-800 !my-2.5" />}
      {savedStrats.map((s) => (
        <SavedCard key={s.id} id={s.id} />
      ))}
      <button
        onClick={saveCurrentStrat}
        title="Save the current strategy + settings as a setup"
        className="w-full text-xs rounded-lg border border-dashed border-gray-700 py-1.5 text-gray-400 hover:border-blue-500 hover:text-blue-300"
      >
        + save current setup
      </button>
    </div>
  )
}
