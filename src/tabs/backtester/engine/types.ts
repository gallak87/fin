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
  /** oscillator pane under the price chart (RSI, MACD, ROC, …) */
  strip?: {
    label: string
    series: { label: string; color: string; values: (number | null)[] }[]
    /** horizontal dashed guide lines (thresholds, zero line) */
    guides: number[]
    /** fixed scale, e.g. 0–100 for RSI; autoscale when omitted */
    range?: { min: number; max: number }
  }
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

export type ExitReason = 'signal' | 'stop' | 'trail' | 'take-profit' | 'time'

export interface Trade {
  entryIdx: number
  entryDate: string
  entryPrice: number
  exitIdx?: number
  exitDate?: string
  exitPrice?: number
  exitReason?: ExitReason
  shares: number
  pnl?: number
  pnlPct?: number
  /** max adverse excursion while held: worst low vs entry (≤ 0) */
  maePct?: number
  /** max favorable excursion while held: best high vs entry (≥ 0) */
  mfePct?: number
  /** bars held (set on close) */
  barsHeld?: number
  /** initial risk: entry → first protective stop, as a fraction of entry (> 0) */
  riskPct?: number
  /** protective exit the strategy never asked for, and price came back without you */
  bailedEarly?: boolean
}

export type SizingMode = 'all' | 'fixed' | 'vol' | 'drawdown'

/** 'pct' = fixed % under the peak; 'structure' = recent low minus a volatility buffer. */
export type TrailMode = 'pct' | 'structure'

/** Engine-level knobs that apply to any strategy. 0 disables an exit/filter. */
export interface EngineSettings {
  slippageBps: number
  feePerTrade: number
  sizingMode: SizingMode
  fixedPct: number // % of equity per entry, sizingMode 'fixed'
  volTargetPct: number // annualized vol target %, sizingMode 'vol'
  ddBudgetPct: number // equity drawdown that takes size to zero, sizingMode 'drawdown'
  stopPct: number // stop-loss % below entry
  trailMode: TrailMode
  trailPct: number // trailing stop % below peak high, trailMode 'pct'
  trailLookback: number // bars of lows the stop hangs from, trailMode 'structure'
  trailAtrDays: number // ATR window for the volatility buffer
  trailAtrMult: number // buffer width, in ATRs
  tpPct: number // take-profit % above entry
  maxBars: number // time exit after N bars
  regimeMaDays: number // only long while close > N-day MA
}

export interface Metrics {
  totalReturn: number
  cagr: number
  maxDrawdown: number
  sharpe: number
  winRate: number | null
  numTrades: number
  /** fraction of bars spent in the market; null when position data unavailable */
  exposure: number | null
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
  /** effective warmup: strategy warmup extended by the regime MA if active */
  warmup: number
  /** strategy overlays plus the regime MA line when the filter is on */
  overlays: { label: string; color: string; values: (number | null)[] }[]
  /** regime MA values when the filter is on; null otherwise */
  gate: (number | null)[] | null
}
