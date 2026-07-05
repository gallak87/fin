import manifest from '../../../data/ohlc/index.json'
import { getStrategy, defaultParams } from '../engine/strategies'
import { useBacktestStore } from '../store'
import { StrategyPicker } from './StrategyPicker'
import { fmtMoney } from '../../../lib/format'

interface ManifestEntry {
  ticker: string
  name: string
  firstDate: string
  lastDate: string
  bars: number
}

const TICKERS = manifest as ManifestEntry[]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs uppercase tracking-wide text-gray-500">{title}</div>
      {children}
    </div>
  )
}

export function BacktestControls() {
  const { ticker, strategyId, params, capital } = useBacktestStore()
  const { loadTicker, setParam, setCapital, reset } = useBacktestStore()

  const strategy = getStrategy(strategyId)
  const values = { ...defaultParams(strategy), ...(params[strategyId] ?? {}) }

  return (
    <div className="space-y-5">
      <Section title="Ticker">
        {TICKERS.length === 0 ? (
          <div className="text-xs text-gray-500 border border-dashed border-gray-700 rounded-lg p-3">
            No price data yet — run <code className="text-gray-300">npm run data:ohlc</code> and
            reload.
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {TICKERS.map((t) => (
              <button
                key={t.ticker}
                onClick={() => void loadTicker(t.ticker)}
                title={`${t.firstDate} → ${t.lastDate}`}
                className={`rounded-lg border px-2 py-1.5 text-center ${
                  t.ticker === ticker
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-800 hover:border-gray-600'
                }`}
              >
                <div className="text-sm font-semibold text-gray-100">{t.ticker}</div>
                <div className="text-[10px] text-gray-500 truncate">{t.name}</div>
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section title="Strategy">
        <StrategyPicker />
      </Section>

      {strategy.params.length > 0 && (
        <Section title="Settings">
          {strategy.params.map((p) =>
            p.toggle ? (
              <label key={p.key} className="flex items-center justify-between text-sm text-gray-300">
                <span>{p.label}</span>
                <input
                  type="checkbox"
                  checked={values[p.key] === 1}
                  onChange={(e) => setParam(p.key, e.target.checked ? 1 : 0)}
                  className="accent-blue-500 w-4 h-4"
                />
              </label>
            ) : (
              <div key={p.key}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{p.label}</span>
                  <span className="font-mono text-gray-100 tabular-nums">{values[p.key]}</span>
                </div>
                <input
                  type="range"
                  min={p.min}
                  max={p.max}
                  step={p.step}
                  value={values[p.key]}
                  onChange={(e) => setParam(p.key, Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>
            ),
          )}
        </Section>
      )}

      <Section title={strategy.contribution === 'monthly' ? 'Total invested over period' : 'Starting capital'}>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-300">Amount</span>
          <span className="font-mono text-gray-100 tabular-nums">{fmtMoney(capital)}</span>
        </div>
        <input
          type="range"
          min={1_000}
          max={100_000}
          step={1_000}
          value={capital}
          onChange={(e) => setCapital(Number(e.target.value))}
          className="w-full accent-blue-500"
        />
      </Section>

      <button
        onClick={reset}
        className="w-full text-xs text-gray-400 border border-gray-700 rounded-lg py-1.5 hover:text-white hover:border-gray-500"
      >
        Reset to defaults
      </button>
    </div>
  )
}
