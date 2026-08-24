import { useState } from 'react'
import type { EngineSettings, SizingMode, TrailMode } from '../engine/types'
import { useBacktestStore } from '../store'

interface SliderDef {
  key: keyof EngineSettings
  label: string
  min: number
  max: number
  step: number
  /** shown when the value is 0 (disabled) */
  off?: string
  unit?: string
}

const STOP: SliderDef = { key: 'stopPct', label: 'Stop-loss below entry', min: 0, max: 50, step: 1, off: 'Off', unit: '%' }

const EXITS_AFTER_TRAIL: SliderDef[] = [
  { key: 'tpPct', label: 'Take-profit above entry', min: 0, max: 200, step: 5, off: 'Off', unit: '%' },
  { key: 'maxBars', label: 'Time exit after', min: 0, max: 250, step: 5, off: 'Off', unit: ' bars' },
]

const TRAIL_PCT: SliderDef = { key: 'trailPct', label: 'Below the peak', min: 0, max: 50, step: 1, off: 'Off', unit: '%' }

const TRAIL_STRUCT: SliderDef[] = [
  { key: 'trailLookback', label: 'Lookback', min: 0, max: 120, step: 5, off: 'Off', unit: ' bars' },
  { key: 'trailAtrDays', label: 'Volatility window', min: 5, max: 30, step: 1, unit: ' bars' },
  { key: 'trailAtrMult', label: 'Buffer', min: 0.5, max: 4, step: 0.5, unit: '×' },
]

const TRAIL_MODES: { id: TrailMode; label: string }[] = [
  { id: 'pct', label: '%' },
  { id: 'structure', label: 'Recent low' },
]

const FRICTION: SliderDef[] = [
  { key: 'slippageBps', label: 'Slippage per fill', min: 0, max: 50, step: 1, off: '0', unit: ' bps' },
  { key: 'feePerTrade', label: 'Fee per fill', min: 0, max: 10, step: 0.5, off: '$0', unit: '' },
]

const SIZING_MODES: { id: SizingMode; label: string }[] = [
  { id: 'all', label: 'All-in' },
  { id: 'fixed', label: 'Fixed %' },
  { id: 'vol', label: 'Vol target' },
  { id: 'drawdown', label: 'Drawdown' },
]

function Slider({ def }: { def: SliderDef }) {
  const value = useBacktestStore((s) => s.settings[def.key]) as number
  const setSetting = useBacktestStore((s) => s.setSetting)
  const display =
    value === 0 && def.off != null
      ? def.off
      : def.key === 'feePerTrade'
        ? `$${value.toFixed(2)}`
        : `${value}${def.unit ?? ''}`
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-300">{def.label}</span>
        <span className="font-mono text-gray-100 tabular-nums">{display}</span>
      </div>
      <input
        type="range"
        min={def.min}
        max={def.max}
        step={def.step}
        value={value}
        onChange={(e) => setSetting(def.key, Number(e.target.value) as never)}
        className="w-full accent-blue-500"
      />
    </div>
  )
}

/** One trail, two shapes — the toggle swaps which knobs are live. */
function TrailBlock() {
  const mode = useBacktestStore((s) => s.settings.trailMode)
  const setSetting = useBacktestStore((s) => s.setSetting)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-300">Trailing stop</span>
        <div className="flex gap-1">
          {TRAIL_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setSetting('trailMode', m.id)}
              className={`rounded-md border px-2 py-0.5 text-[11px] ${
                mode === m.id
                  ? 'border-blue-500 bg-blue-500/10 text-gray-100'
                  : 'border-gray-800 text-gray-400 hover:border-gray-600'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
      <div className="pl-3 border-l border-gray-800 space-y-1.5">
        {mode === 'pct' ? (
          <Slider def={TRAIL_PCT} />
        ) : (
          TRAIL_STRUCT.map((d) => <Slider key={d.key} def={d} />)
        )}
      </div>
    </div>
  )
}

/**
 * Collapsed by default with an active-state summary in the header, so a
 * forgotten stop or regime filter can't silently reshape every strategy.
 */
function Section({
  title,
  summary,
  isDefault,
  hint,
  children,
}: {
  title: string
  summary: string
  isDefault: boolean
  hint?: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="space-y-2">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500 hover:text-gray-300"
      >
        <span className="text-[9px]">{open ? '▾' : '▸'}</span>
        <span>{title}</span>
        <span
          className={`ml-auto normal-case font-mono tracking-normal ${isDefault ? 'text-gray-600' : 'text-amber-400/90'}`}
        >
          {summary}
        </span>
      </button>
      {open && (
        <>
          {hint && <div className="text-[11px] text-gray-600 leading-snug">{hint}</div>}
          {children}
        </>
      )}
    </div>
  )
}

/** Engine-level knobs that apply on top of any strategy: exits, sizing, regime, friction. */
export function EngineSettingsPanel() {
  const settings = useBacktestStore((s) => s.settings)
  const setSetting = useBacktestStore((s) => s.setSetting)

  const trailTag =
    settings.trailMode === 'structure'
      ? settings.trailLookback > 0 && `trail ${settings.trailLookback}d·${settings.trailAtrMult}×`
      : settings.trailPct > 0 && `trail ${settings.trailPct}%`
  const exitTags = [
    settings.stopPct > 0 && `stop ${settings.stopPct}%`,
    trailTag,
    settings.tpPct > 0 && `tp ${settings.tpPct}%`,
    settings.maxBars > 0 && `${settings.maxBars} bars`,
  ].filter(Boolean) as string[]
  const sizingSummary =
    settings.sizingMode === 'fixed'
      ? `fixed ${settings.fixedPct}%`
      : settings.sizingMode === 'vol'
        ? `vol ${settings.volTargetPct}%`
        : settings.sizingMode === 'drawdown'
          ? `dd ${settings.ddBudgetPct}%`
          : 'all-in'
  const frictionSummary = `${settings.slippageBps}bps${settings.feePerTrade > 0 ? ` · $${settings.feePerTrade}` : ''}`

  return (
    <>
      <Section
        title="Exits"
        summary={exitTags.length ? exitTags.join(' · ') : 'off'}
        isDefault={exitTags.length === 0}
        hint="Stops fill intrabar at the level — or at the open if the bar gaps past it. The trail only ever moves in your favour, and only off closed bars."
      >
        <Slider def={STOP} />
        <TrailBlock />
        {EXITS_AFTER_TRAIL.map((d) => (
          <Slider key={d.key} def={d} />
        ))}
      </Section>

      <Section
        title="Position sizing"
        summary={sizingSummary}
        isDefault={settings.sizingMode === 'all'}
        hint="Drawdown mode shrinks each entry as equity falls from its high-water mark, and stands down entirely at the full budget."
      >
        <div className="grid grid-cols-2 gap-1.5">
          {SIZING_MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setSetting('sizingMode', m.id)}
              className={`rounded-lg border px-1 py-1.5 text-xs ${
                settings.sizingMode === m.id
                  ? 'border-blue-500 bg-blue-500/10 text-gray-100'
                  : 'border-gray-800 text-gray-400 hover:border-gray-600'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        {settings.sizingMode === 'fixed' && (
          <Slider def={{ key: 'fixedPct', label: 'Equity per entry', min: 5, max: 100, step: 5, unit: '%' }} />
        )}
        {settings.sizingMode === 'vol' && (
          <Slider
            def={{ key: 'volTargetPct', label: 'Annualized vol target', min: 5, max: 40, step: 1, unit: '%' }}
          />
        )}
        {settings.sizingMode === 'drawdown' && (
          <Slider
            def={{ key: 'ddBudgetPct', label: 'Flat by drawdown of', min: 5, max: 50, step: 5, unit: '%' }}
          />
        )}
      </Section>

      <Section
        title="Regime filter"
        summary={settings.regimeMaDays > 0 ? `MA ${settings.regimeMaDays}` : 'off'}
        isDefault={settings.regimeMaDays === 0}
        hint="Only take long signals while price is above this moving average."
      >
        <Slider def={{ key: 'regimeMaDays', label: 'Only long above MA', min: 0, max: 300, step: 10, off: 'Off', unit: 'd' }} />
      </Section>

      <Section
        title="Friction"
        summary={frictionSummary}
        isDefault={settings.slippageBps === 5 && settings.feePerTrade === 0}
        hint="Free trading flatters high-churn strategies — leave a little on."
      >
        {FRICTION.map((d) => (
          <Slider key={d.key} def={d} />
        ))}
      </Section>
    </>
  )
}
