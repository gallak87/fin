import { useEffect, useState } from 'react'
import { useBacktestStore, loadBars } from '../store'
import { CUSTOM_ID } from '../engine/custom'
import { getStrategy, defaultParams } from '../engine/strategies'
import { runBacktest } from '../engine/engine'
import { PRESETS, type Preset } from '../engine/presets'
import { fmtK, fmtPct } from '../../../lib/format'
import { verdict } from '../engine/verdict'

interface PresetStats {
  totalReturn: number
  end: number
  maxDrawdown: number
}

// computed once per preset+capital; bundled data is static
const presetStatsCache = new Map<string, PresetStats>()

function usePresetStats(preset: Preset, capital: number): PresetStats | null {
  const key = `${preset.id}:${capital}`
  const [, bump] = useState(0)
  useEffect(() => {
    if (presetStatsCache.has(key)) return
    let alive = true
    void (async () => {
      const bars = await loadBars(preset.ticker)
      if (!bars) return
      const strategy = getStrategy(preset.strategyId)
      const r = runBacktest(bars, strategy, { ...defaultParams(strategy), ...preset.params }, capital, preset.settings)
      presetStatsCache.set(key, {
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
  return presetStatsCache.get(key) ?? null
}

function PresetPill({ preset }: { preset: Preset }) {
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
      className={`inline-flex items-baseline gap-1.5 rounded-full border px-2.5 py-1 text-xs font-mono tabular-nums ${
        active ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700/80 bg-gray-800/30 hover:border-gray-500'
      }`}
    >
      <span className="font-semibold text-blue-300">{preset.ticker}</span>
      <span className="text-gray-300">{preset.name}</span>
      {stats && (
        <>
          <span className={stats.totalReturn >= 0 ? 'text-green-400' : 'text-red-400'}>
            {stats.totalReturn >= 10
              ? `+${Math.round(stats.totalReturn * 100).toLocaleString()}%`
              : fmtPct(stats.totalReturn, 0)}
          </span>
          <span className="text-gray-400">{fmtK(stats.end)}</span>
          <span className="text-red-400/70">DD {fmtPct(stats.maxDrawdown, 0)}</span>
        </>
      )}
    </button>
  )
}

const pctFmt = (pct: number) =>
  `${pct >= 0 ? '+' : ''}${pct >= 10 ? `${Math.round(pct * 100).toLocaleString()}%` : `${(pct * 100).toFixed(1)}%`}`

/**
 * Where the tape ends, shown up front — the full series is precomputed, so
 * there's no need to fast-forward for the final outcome.
 */
export function FinalOutcome() {
  const result = useBacktestStore((s) => s.result)
  const capital = useBacktestStore((s) => s.capital)
  if (!result) return null
  const end = result.equity[result.equity.length - 1]
  const bench = result.benchmark[result.benchmark.length - 1]
  const basis = result.contributed ? result.contributed[result.contributed.length - 1] : capital
  const pct = basis > 0 ? end / basis - 1 : 0
  const benchPct = basis > 0 ? bench / basis - 1 : 0
  const mult = bench > 0 ? end / bench : 0
  const win = end >= bench
  const v = verdict(result.metrics, result.benchMetrics)
  const vColor =
    v.tone === 'good' ? 'text-green-400/90' : v.tone === 'bad' ? 'text-red-400/90' : 'text-gray-300'
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 px-3 py-2 space-y-1 text-xs">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-[10px] uppercase tracking-wide text-gray-500">End of tape</span>
        <span className="font-mono tabular-nums">
          <span className="text-gray-400">{fmtK(basis)} → </span>
          <span className={win ? 'text-green-400' : 'text-red-400'}>
            {fmtK(end)} ({pctFmt(pct)})
          </span>
        </span>
        <span className="font-mono tabular-nums text-gray-400">
          buy &amp; hold → {fmtK(bench)} ({pctFmt(benchPct)})
        </span>
        <span className={`font-mono tabular-nums ${win ? 'text-green-400' : 'text-red-400'}`}>
          {mult >= 1 ? `${mult.toFixed(1)}× B&H` : `${mult.toFixed(2)}× B&H`}
        </span>
      </div>
      <div className={`leading-snug ${vColor}`}>{v.text}</div>
    </div>
  )
}

/** Saved-strategy pills: + Save snapshots the current config, click a pill to apply it. */
export function StratPills() {
  const savedStrats = useBacktestStore((s) => s.savedStrats)
  const strategyId = useBacktestStore((s) => s.strategyId)
  const params = useBacktestStore((s) => s.params)
  const settings = useBacktestStore((s) => s.settings)
  const customCode = useBacktestStore((s) => s.customCode)
  const saveCurrentStrat = useBacktestStore((s) => s.saveCurrentStrat)
  const applyStrat = useBacktestStore((s) => s.applyStrat)
  const deleteStrat = useBacktestStore((s) => s.deleteStrat)

  const current =
    strategyId === CUSTOM_ID
      ? {}
      : { ...defaultParams(getStrategy(strategyId)), ...(params[strategyId] ?? {}) }

  const isActive = (id: string) => {
    const s = savedStrats.find((x) => x.id === id)
    if (!s || s.strategyId !== strategyId) return false
    if (JSON.stringify(s.params) !== JSON.stringify(current)) return false
    if (JSON.stringify(s.settings) !== JSON.stringify(settings)) return false
    if (s.customCode != null && s.customCode !== customCode) return false
    return true
  }
  const alreadySaved = savedStrats.some((s) => isActive(s.id))

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESETS.map((p) => (
        <PresetPill key={p.id} preset={p} />
      ))}
      <span className="w-px h-4 bg-gray-800 mx-0.5" />
      <button
        onClick={saveCurrentStrat}
        disabled={alreadySaved}
        title={alreadySaved ? 'Current setup is already saved' : 'Save current strategy + settings'}
        className={`text-xs rounded-full border border-dashed px-2.5 py-1 ${
          alreadySaved
            ? 'border-gray-800 text-gray-600'
            : 'border-gray-600 text-gray-300 hover:border-blue-500 hover:text-blue-300'
        }`}
      >
        + save
      </button>
      {savedStrats.map((s) => {
        const active = isActive(s.id)
        return (
          <span
            key={s.id}
            className={`group inline-flex items-center gap-1 rounded-full border pl-2.5 pr-1.5 py-1 text-xs cursor-pointer ${
              active
                ? 'border-blue-500 bg-blue-500/10 text-gray-100'
                : 'border-gray-700 text-gray-300 hover:border-gray-500'
            }`}
            onClick={() => applyStrat(s.id)}
            title="Apply this saved setup"
          >
            <span className="font-mono">{s.label}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteStrat(s.id)
              }}
              title="Delete"
              className="w-4 h-4 rounded-full flex items-center justify-center text-gray-600 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-red-500/10"
            >
              ×
            </button>
          </span>
        )
      })}
    </div>
  )
}
