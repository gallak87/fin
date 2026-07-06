import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Bar, BacktestResult, EngineSettings } from './engine/types'
import { runBacktest, DEFAULT_SETTINGS } from './engine/engine'
import { getStrategy, defaultParams, STRATEGIES } from './engine/strategies'
import { CUSTOM_ID, DEFAULT_CUSTOM_CODE, compileCustomStrategy } from './engine/custom'
import { autoLabel } from './engine/label'

export interface SavedStrat {
  id: string
  label: string
  strategyId: string
  params: Record<string, number>
  settings: EngineSettings
  customCode?: string
}

// eager: which tickers exist; lazy: the actual bar data, one chunk per ticker
const OHLC_MODULES = import.meta.glob(['../../data/ohlc/*.json', '!../../data/ohlc/index.json'])

interface OhlcFile {
  ticker: string
  name: string
  t: string[]
  o: number[]
  h: number[]
  l: number[]
  c: number[]
  v: number[]
}

function decodeBars(f: OhlcFile): Bar[] {
  return f.t.map((t, i) => ({ t, o: f.o[i], h: f.h[i], l: f.l[i], c: f.c[i], v: f.v[i] }))
}

const barsCache = new Map<string, Bar[]>()

/** Load any bundled ticker's bars (cached) — used by the lab's multi-ticker runs. */
export async function loadBars(ticker: string): Promise<Bar[] | null> {
  const hit = barsCache.get(ticker)
  if (hit) return hit
  const load = OHLC_MODULES[`../../data/ohlc/${ticker}.json`]
  if (!load) return null
  const mod = (await load()) as { default: OhlcFile }
  const bars = decodeBars(mod.default)
  barsCache.set(ticker, bars)
  return bars
}

interface BacktestStore {
  // persisted config
  ticker: string
  strategyId: string
  params: Record<string, Record<string, number>>
  capital: number
  speed: number // multiplier; 1× = 4 bars/sec
  settings: EngineSettings
  customCode: string
  savedStrats: SavedStrat[]

  // ephemeral
  bars: Bar[] | null
  result: BacktestResult | null
  cursor: number
  playing: boolean
  /** compile/runtime error from the custom strategy; null when it ran clean */
  customError: string | null
  /** first out-of-sample bar index (walk-forward shading); null = no shading */
  oosStart: number | null

  loadTicker: (ticker: string) => Promise<void>
  setStrategy: (id: string) => void
  setParam: (key: string, value: number) => void
  /** apply several params at once (heatmap cell click, walk-forward apply) */
  setParams: (patch: Record<string, number>) => void
  setOosStart: (i: number | null) => void
  setCapital: (capital: number) => void
  setSpeed: (speed: number) => void
  setSetting: <K extends keyof EngineSettings>(key: K, value: EngineSettings[K]) => void
  setCustomCode: (code: string) => void
  saveCurrentStrat: () => void
  applyStrat: (id: string) => void
  deleteStrat: (id: string) => void
  play: () => void
  pause: () => void
  stepFwd: (n?: number) => void
  stepBack: (n?: number) => void
  seek: (i: number) => void
  reset: () => void
}

const DEFAULTS = {
  ticker: 'SPY',
  strategyId: 'ma-cross',
  params: Object.fromEntries(STRATEGIES.map((s) => [s.id, defaultParams(s)])),
  capital: 10_000,
  speed: 8,
  settings: DEFAULT_SETTINGS,
  customCode: DEFAULT_CUSTOM_CODE,
}

/** merged current params for the active strategy (defaults filled in) */
function currentParams(s: BacktestStore): Record<string, number> {
  if (s.strategyId === CUSTOM_ID) return {}
  const strategy = getStrategy(s.strategyId)
  return { ...defaultParams(strategy), ...(s.params[s.strategyId] ?? {}) }
}

function rerun(s: BacktestStore): Partial<BacktestStore> {
  if (!s.bars) return { result: null, cursor: 0, playing: false }
  try {
    const strategy = s.strategyId === CUSTOM_ID ? compileCustomStrategy(s.customCode) : getStrategy(s.strategyId)
    const params = { ...defaultParams(strategy), ...(s.params[strategy.id] ?? {}) }
    const result = runBacktest(s.bars, strategy, params, s.capital, s.settings)
    return {
      result,
      cursor: Math.min(result.warmup, s.bars.length - 1),
      playing: false,
      customError: null,
      oosStart: null,
    }
  } catch (e) {
    // bad custom code: keep the last good result on screen, surface the error
    return { playing: false, customError: e instanceof Error ? e.message : String(e) }
  }
}

export const useBacktestStore = create<BacktestStore>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      savedStrats: [],
      bars: null,
      result: null,
      cursor: 0,
      playing: false,
      customError: null,
      oosStart: null,

      loadTicker: async (ticker) => {
        set({ ticker, bars: null, result: null, playing: false })
        const load = OHLC_MODULES[`../../data/ohlc/${ticker}.json`]
        if (!load) return
        const mod = (await load()) as { default: OhlcFile }
        // ignore stale loads if the user switched tickers mid-flight
        if (get().ticker !== ticker) return
        const bars = decodeBars(mod.default)
        set((s) => ({ bars, ...rerun({ ...s, bars }) }))
      },

      setStrategy: (strategyId) => set((s) => ({ strategyId, ...rerun({ ...s, strategyId }) })),

      setParam: (key, value) =>
        set((s) => {
          const strategy = getStrategy(s.strategyId)
          const merged = { ...defaultParams(strategy), ...(s.params[s.strategyId] ?? {}), [key]: value }
          // keep MA windows ordered
          if (key === 'fast' && merged.slow != null && merged.fast >= merged.slow) merged.fast = merged.slow - 1
          if (key === 'slow' && merged.fast != null && merged.slow <= merged.fast) merged.slow = merged.fast + 1
          const params = { ...s.params, [s.strategyId]: merged }
          return { params, ...rerun({ ...s, params }) }
        }),

      setParams: (patch) =>
        set((s) => {
          const strategy = getStrategy(s.strategyId)
          const merged = { ...defaultParams(strategy), ...(s.params[s.strategyId] ?? {}), ...patch }
          const params = { ...s.params, [s.strategyId]: merged }
          return { params, ...rerun({ ...s, params }) }
        }),

      setOosStart: (oosStart) => set({ oosStart }),

      setCapital: (capital) => set((s) => ({ capital, ...rerun({ ...s, capital }) })),
      setCustomCode: (customCode) => set((s) => ({ customCode, ...rerun({ ...s, customCode }) })),

      saveCurrentStrat: () =>
        set((s) => {
          const params = currentParams(s)
          let label = autoLabel(s.strategyId, params, s.settings)
          let n = 2
          while (s.savedStrats.some((x) => x.label === label)) {
            label = `${autoLabel(s.strategyId, params, s.settings)} (${n++})`
          }
          const strat: SavedStrat = {
            id: `${Date.now()}`,
            label,
            strategyId: s.strategyId,
            params,
            settings: { ...s.settings },
            ...(s.strategyId === CUSTOM_ID ? { customCode: s.customCode } : {}),
          }
          return { savedStrats: [...s.savedStrats, strat] }
        }),

      applyStrat: (id) =>
        set((s) => {
          const strat = s.savedStrats.find((x) => x.id === id)
          if (!strat) return {}
          const next = {
            strategyId: strat.strategyId,
            params: { ...s.params, [strat.strategyId]: { ...strat.params } },
            settings: { ...strat.settings },
            customCode: strat.customCode ?? s.customCode,
          }
          return { ...next, ...rerun({ ...s, ...next }) }
        }),

      deleteStrat: (id) => set((s) => ({ savedStrats: s.savedStrats.filter((x) => x.id !== id) })),
      setSpeed: (speed) => set({ speed }),

      setSetting: (key, value) =>
        set((s) => {
          const settings = { ...s.settings, [key]: value }
          return { settings, ...rerun({ ...s, settings }) }
        }),

      play: () => {
        const s = get()
        if (!s.result || !s.bars) return
        // restart from the top if the tape already ran out
        if (s.cursor >= s.bars.length - 1) set({ cursor: s.result.warmup })
        set({ playing: true })
      },
      pause: () => set({ playing: false }),

      stepFwd: (n = 1) =>
        set((s) => {
          if (!s.bars) return {}
          const max = s.bars.length - 1
          const cursor = Math.min(s.cursor + n, max)
          return { cursor, playing: cursor >= max ? false : s.playing }
        }),

      stepBack: (n = 1) =>
        set((s) => ({ cursor: Math.max(s.cursor - n, s.result?.warmup ?? 0) })),

      seek: (i) =>
        set((s) => {
          if (!s.bars) return {}
          const min = s.result?.warmup ?? 0
          return { cursor: Math.max(min, Math.min(i, s.bars.length - 1)) }
        }),

      reset: () => set((s) => ({ ...DEFAULTS, ticker: s.ticker, ...rerun({ ...s, ...DEFAULTS, ticker: s.ticker }) })),
    }),
    {
      name: 'backtester',
      version: 1,
      partialize: (s) => ({
        ticker: s.ticker,
        strategyId: s.strategyId,
        params: s.params,
        capital: s.capital,
        speed: s.speed,
        settings: s.settings,
        customCode: s.customCode,
        savedStrats: s.savedStrats,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<BacktestStore> | undefined
        // deep-merge settings so configs saved before a new knob existed get its default
        return {
          ...current,
          ...p,
          settings: { ...DEFAULT_SETTINGS, ...(p?.settings ?? {}) },
        }
      },
      onRehydrateStorage: () => (state) => {
        // land ready to play after a reload
        if (state) void state.loadTicker(state.ticker)
      },
    },
  ),
)
