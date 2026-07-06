import { STRATEGIES } from '../engine/strategies'
import { CUSTOM_META } from '../engine/custom'
import { useBacktestStore } from '../store'

/** Plain-English strategy cards — the whole card is clickable. */
export function StrategyPicker() {
  const strategyId = useBacktestStore((s) => s.strategyId)
  const setStrategy = useBacktestStore((s) => s.setStrategy)

  return (
    <div className="space-y-1.5">
      {[...STRATEGIES, CUSTOM_META].map((s) => (
        <button
          key={s.id}
          onClick={() => setStrategy(s.id)}
          className={`w-full text-left rounded-lg border px-3 py-2 ${
            s.id === strategyId
              ? 'border-blue-500 bg-blue-500/10'
              : 'border-gray-800 hover:border-gray-600'
          }`}
        >
          <div className="text-sm font-medium text-gray-100">{s.name}</div>
          <div className="text-xs text-gray-500 leading-snug">{s.blurb}</div>
        </button>
      ))}
    </div>
  )
}
