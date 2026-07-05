export interface Bar {
  t: string // YYYY-MM-DD
  o: number
  h: number
  l: number
  c: number
  v: number
}

export type Signal = 'long' | 'flat'

export interface ParamDef {
  key: string
  label: string
  min: number
  max: number
  step: number
  default: number
  /** render as an on/off toggle instead of a slider (0|1) */
  toggle?: boolean
}

/** Result of binding a strategy to a specific bar series + params. */
export interface StrategyRun {
  /** desired position as of bar i's close */
  signalAt(i: number): Signal
  /** indicator lines drawn on the price chart (e.g. MAs); [] if none */
  overlays: { label: string; color: string; values: (number | null)[] }[]
  /** present only for RSI-style strategies → renders the RSI strip */
  rsi?: { values: (number | null)[]; buyBelow: number; sellAbove: number }
  /** plain-English state of the strategy at bar i, for the signal strip */
  explainAt(i: number): string
  /** first index with valid signals */
  warmup: number
}

export interface Strategy {
  id: string
  name: string
  /** one plain-English sentence for the picker card */
  blurb: string
  params: ParamDef[]
  /** 'monthly' = DCA-style equal contributions; 'lump' = all capital at start */
  contribution: 'lump' | 'monthly'
  init(bars: Bar[], params: Record<string, number>): StrategyRun
}

export interface Trade {
  entryIdx: number
  entryDate: string
  entryPrice: number
  exitIdx?: number
  exitDate?: string
  exitPrice?: number
  shares: number
  pnl?: number
  pnlPct?: number
}

export interface Metrics {
  totalReturn: number
  cagr: number
  maxDrawdown: number
  sharpe: number
  winRate: number | null
  numTrades: number
}

export interface BacktestResult {
  bars: Bar[]
  equity: number[]
  benchmark: number[]
  /** cumulative cash put in per bar; null for lump strategies */
  contributed: number[] | null
  position: Signal[]
  trades: Trade[]
  metrics: Metrics
  benchMetrics: Metrics
  run: StrategyRun
}
