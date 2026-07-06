import { useState } from 'react'
import { runGauntlet, type GauntletReport, type GauntletStatus } from '../engine/gauntlet'
import { resolveStrategy } from '../engine/lab'
import { defaultParams } from '../engine/strategies'
import { useBacktestStore } from '../store'
import { useComputed } from './lab/labUtils'
import { RobustnessLab } from './lab/RobustnessLab'

const ICON: Record<GauntletStatus, { glyph: string; cls: string }> = {
  pass: { glyph: '✓', cls: 'text-green-400' },
  warn: { glyph: '△', cls: 'text-amber-400' },
  fail: { glyph: '✗', cls: 'text-red-400' },
  skip: { glyph: '–', cls: 'text-gray-600' },
}

const OVERALL: Record<GauntletStatus, { label: string; cls: string }> = {
  pass: { label: 'survives the gauntlet', cls: 'bg-green-500/15 text-green-400' },
  warn: { label: 'survives, with caveats', cls: 'bg-amber-500/15 text-amber-400' },
  fail: { label: 'does not survive', cls: 'bg-red-500/15 text-red-400' },
  skip: { label: 'not enough to test', cls: 'bg-gray-700/40 text-gray-400' },
}

/**
 * One green button that runs the whole luck-test battery in order and shows
 * a compact scorecard in place — the lab below stays for deep dives.
 */
export function GauntletCard() {
  const bars = useBacktestStore((s) => s.bars)
  const result = useBacktestStore((s) => s.result)
  const strategyId = useBacktestStore((s) => s.strategyId)
  const params = useBacktestStore((s) => s.params)
  const capital = useBacktestStore((s) => s.capital)
  const settings = useBacktestStore((s) => s.settings)
  const customCode = useBacktestStore((s) => s.customCode)
  const [report, setReport, reportStale] = useComputed<GauntletReport>([result])
  const [progress, setProgress] = useState<{ label: string; frac: number } | null>(null)
  const labOpen = useBacktestStore((s) => s.labOpen)
  const setLabOpen = useBacktestStore((s) => s.setLabOpen)

  if (!bars || !result) return null

  const run = async () => {
    let strategy
    try {
      strategy = resolveStrategy(strategyId, customCode)
    } catch {
      return
    }
    setProgress({ label: 'starting', frac: 0 })
    const p = { ...defaultParams(strategy), ...(params[strategyId] ?? {}) }
    const rep = await runGauntlet({
      bars,
      strategy,
      params: p,
      capital,
      settings,
      result,
      onProgress: (label, frac) => setProgress({ label, frac }),
    })
    setReport(rep)
    setProgress(null)
  }

  return (
    <div id="gauntlet" className="bg-gray-900 rounded-xl border border-gray-800 px-3 py-2 space-y-2 scroll-mt-16">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[10px] uppercase tracking-wide text-gray-500">Was that luck?</span>
        {!progress ? (
          <button
            onClick={() => void run()}
            className="text-xs rounded-lg px-3 py-1.5 font-semibold bg-green-600 hover:bg-green-500 text-white"
          >
            ▶ Run all luck tests
          </button>
        ) : (
          <span className="flex items-center gap-2 text-xs text-gray-300">
            <span className="w-32 h-1.5 bg-gray-800 rounded overflow-hidden">
              <span className="block h-full bg-green-500 transition-all" style={{ width: `${progress.frac * 100}%` }} />
            </span>
            {progress.label}…
          </span>
        )}
        {report && !progress && (
          <span className={`text-xs rounded-full px-2.5 py-0.5 font-medium ${OVERALL[report.overall].cls}`}>
            {OVERALL[report.overall].label}
          </span>
        )}
        {reportStale && !progress && (
          <span className="text-[10px] text-amber-400/80">inputs changed — re-run</span>
        )}
        <button
          onClick={() => setLabOpen(!labOpen)}
          className={`ml-auto text-[10px] ${labOpen ? 'text-blue-300' : 'text-gray-500 hover:text-gray-300'}`}
        >
          {labOpen ? '▾ full lab' : '▸ full lab'}
        </button>
      </div>
      {report && !progress && (
        <div className="space-y-1">
          {report.checks.map((c) => (
            <div key={c.name} className="flex items-baseline gap-2 text-xs">
              <span className={`w-3 text-center font-bold ${ICON[c.status].cls}`}>{ICON[c.status].glyph}</span>
              <span className="w-24 shrink-0 text-gray-300">{c.name}</span>
              <span className="text-gray-500 leading-snug">{c.detail}</span>
            </div>
          ))}
        </div>
      )}
      {labOpen && <RobustnessLab />}
    </div>
  )
}
