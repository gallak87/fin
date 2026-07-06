import { useState } from 'react'
import { STRATEGIES } from '../engine/strategies'
import { CUSTOM_META } from '../engine/custom'
import { useBacktestStore } from '../store'

const ALL = [...STRATEGIES, CUSTOM_META]

/**
 * Collapsed by default — just the active strategy card — so the param
 * sliders below stay near the top of the sidebar, in view of the charts.
 */
export function StrategyPicker() {
  const strategyId = useBacktestStore((s) => s.strategyId)
  const setStrategy = useBacktestStore((s) => s.setStrategy)
  const [open, setOpen] = useState(false)

  const active = ALL.find((s) => s.id === strategyId) ?? ALL[0]

  if (!open) {
    return (
      <div className="space-y-1.5">
        <button
          onClick={() => setOpen(true)}
          title="Change strategy"
          className="w-full text-left rounded-lg border border-blue-500 bg-blue-500/10 px-3 py-2"
        >
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-medium text-gray-100">{active.name}</span>
            <span className="text-[10px] text-gray-500">change ▾</span>
          </div>
          <div className="text-xs text-gray-500 leading-snug">{active.blurb}</div>
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {ALL.map((s) => {
        const isActive = s.id === strategyId
        return (
          <button
            key={s.id}
            onClick={() => {
              setStrategy(s.id)
              setOpen(false)
            }}
            title={s.blurb}
            className={`w-full text-left rounded-lg border px-3 ${
              isActive ? 'border-blue-500 bg-blue-500/10 py-2' : 'border-gray-800 hover:border-gray-600 py-1.5'
            }`}
          >
            <div className="text-sm font-medium text-gray-100">{s.name}</div>
            {isActive && <div className="text-xs text-gray-500 leading-snug">{s.blurb}</div>}
          </button>
        )
      })}
      <button
        onClick={() => setOpen(false)}
        className="w-full text-xs rounded-lg border border-gray-800 py-1 text-gray-500 hover:border-gray-600 hover:text-gray-300"
      >
        collapse ▴
      </button>
    </div>
  )
}
