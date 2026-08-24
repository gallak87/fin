import type { Bar, BacktestResult, EngineSettings, ExitReason, Metrics, Signal, Strategy, Trade } from './types'
import { sma, atr, donchian } from './indicators'

export const DEFAULT_SETTINGS: EngineSettings = {
  slippageBps: 5,
  feePerTrade: 0,
  sizingMode: 'all',
  fixedPct: 50,
  volTargetPct: 15,
  ddBudgetPct: 20,
  stopPct: 0,
  trailMode: 'pct',
  trailPct: 0,
  trailLookback: 20,
  trailAtrDays: 14,
  trailAtrMult: 2,
  tpPct: 0,
  maxBars: 0,
  regimeMaDays: 0,
}

/**
 * Signals are read at bar close and executed at the NEXT bar's open (no
 * look-ahead). Fractional shares. Protective exits (stop/trail/take-profit)
 * fill intrabar: triggered when the bar's range touches the level, filled at
 * the level — unless the bar gapped past it at the open, in which case you
 * get the open. After a protective exit the strategy must go flat and signal
 * long again (a fresh edge) before re-entering.
 *
 * The trailing stop comes in two shapes: a fixed % under the running peak, or
 * a structure stop hung under the recent lows with a volatility buffer. Both
 * ratchet — a stop only ever moves in the trade's favour — and both read only
 * CLOSED bars, so today's range can't move today's stop.
 */
export function runBacktest(
  bars: Bar[],
  strategy: Strategy,
  params: Record<string, number>,
  capital: number,
  settings: EngineSettings = DEFAULT_SETTINGS,
): BacktestResult {
  const run = strategy.init(bars, params)
  const n = bars.length
  const periodsPerYear = tradingDaysPerYear(bars)
  const slip = settings.slippageBps / 10_000
  const fee = settings.feePerTrade

  // regime filter: only allow long while close > N-day MA
  const gate = settings.regimeMaDays > 0 ? sma(bars.map((b) => b.c), settings.regimeMaDays) : null
  const gateWarm = gate ? gate.findIndex((x) => x != null) : 0
  const warmup = Math.min(n, Math.max(run.warmup, gate ? (gateWarm === -1 ? n : gateWarm) : 0))
  const wantsLong = (i: number): boolean =>
    run.signalAt(i) === 'long' && (!gate || (gate[i] != null && bars[i].c > gate[i]!))

  // structure trail: recent lows minus a volatility buffer, both read off closed bars
  const useStructTrail = settings.trailMode === 'structure' && settings.trailLookback > 0
  const structLow = useStructTrail
    ? donchian(bars.map((b) => b.h), bars.map((b) => b.l), settings.trailLookback).lower
    : null
  const trailAtr = useStructTrail ? atr(bars, settings.trailAtrDays) : null
  /** structure stop level implied by the bars up to and including `j`; null while warming up */
  const structLevel = (j: number): number | null => {
    if (!structLow || !trailAtr || j < 0) return null
    const lo = structLow[j]
    const a = trailAtr[j]
    return lo != null && a != null ? lo - settings.trailAtrMult * a : null
  }

  // ATR-based vol targeting: fraction = target vol / recent instrument vol
  const atr14 = settings.sizingMode === 'vol' ? atr(bars, 14) : null
  // running high-water mark of equity, for drawdown-scaled sizing
  let peakEquity = 0
  const entryFraction = (i: number): number => {
    if (settings.sizingMode === 'fixed') return settings.fixedPct / 100
    if (settings.sizingMode === 'drawdown') {
      // size shrinks with the equity drawdown, hitting zero at the full budget
      const budget = settings.ddBudgetPct / 100
      const eq = i > 0 ? equity[i - 1] : capital
      if (budget <= 0 || peakEquity <= 0 || eq <= 0) return 1
      const dd = Math.max(0, 1 - eq / peakEquity)
      const f = 1 - dd / budget
      // a drawdown within rounding of the budget has spent it — stand down
      return f <= 1e-9 ? 0 : Math.min(1, f)
    }
    if (settings.sizingMode === 'vol') {
      const j = Math.max(i - 1, 0) // yesterday's ATR — no peeking at today's range
      const a = atr14![j]
      const c = bars[j].c
      if (a == null || c <= 0) return 1
      const annVol = (a / c) * Math.sqrt(periodsPerYear)
      return annVol > 0 ? Math.min(1, settings.volTargetPct / 100 / annVol) : 1
    }
    return 1
  }

  // monthly contribution schedule (DCA): equal chunks on the first trading
  // day of each month, totalling `capital` over the full period
  const contribution = new Array<number>(n).fill(0)
  if (strategy.contribution === 'monthly') {
    const firstOfMonth: number[] = []
    let prevMonth = ''
    for (let i = 0; i < n; i++) {
      const month = bars[i].t.slice(0, 7)
      if (month !== prevMonth) firstOfMonth.push(i)
      prevMonth = month
    }
    const chunk = capital / firstOfMonth.length
    for (const i of firstOfMonth) contribution[i] = chunk
  }

  const equity = new Array<number>(n).fill(0)
  const position: Signal[] = new Array(n).fill('flat')
  const trades: Trade[] = []

  let cash = strategy.contribution === 'lump' ? capital : 0
  let shares = 0
  let open: Trade | null = null
  // false after a protective exit — the signal must go flat, then long again
  let armed = true
  // highest high since entry through the PREVIOUS bar (today's high may come
  // after today's low, so it can't move today's trailing stop)
  let peakHigh = 0
  // structure trail: the ratchet — only ever raised, never lowered, and only
  // from closed bars. -Infinity while the trade has no structure stop yet.
  let trailStop = -Infinity

  const sellAll = (i: number, price: number, reason: ExitReason) => {
    cash += shares * price - fee
    if (open) {
      open.exitIdx = i
      open.exitDate = bars[i].t
      open.exitPrice = price
      open.exitReason = reason
      open.pnl = (price - open.entryPrice) * open.shares
      open.pnlPct = price / open.entryPrice - 1
      open.maePct = Math.min(open.maePct ?? 0, open.pnlPct)
      open.mfePct = Math.max(open.mfePct ?? 0, open.pnlPct)
      open.barsHeld = i - open.entryIdx
      open = null
    }
    shares = 0
  }

  for (let i = 0; i < n; i++) {
    // contributions arrive at the open, before any trading
    cash += contribution[i]
    const o = bars[i].o

    // yesterday's signal, gated by the regime filter
    const rawWant = i > 0 && i - 1 >= warmup && wantsLong(i - 1)
    if (!rawWant) armed = true // signal went flat → re-arm after protective exits

    // time exit fires at the open once the position has been held maxBars
    if (shares > 0 && open && settings.maxBars > 0 && i - open.entryIdx >= settings.maxBars) {
      sellAll(i, o * (1 - slip), 'time')
      armed = false
    }

    // execute yesterday's signal at today's open
    const want = rawWant && (armed || shares > 0)
    if (want && shares === 0 && cash > fee) {
      const spend = Math.min(cash, cash * entryFraction(i))
      const fill = o * (1 + slip)
      const bought = (spend - fee) / fill
      if (bought > 0) {
        open = { entryIdx: i, entryDate: bars[i].t, entryPrice: fill, shares: bought, maePct: 0, mfePct: 0 }
        trades.push(open)
        shares = bought
        cash -= spend
        peakHigh = fill
        // yesterday's bars already imply a structure stop — live from bar one
        trailStop = useStructTrail ? (structLevel(i - 1) ?? -Infinity) : -Infinity
        // initial risk = entry to whichever protective stop sits highest
        const initStop = Math.max(
          settings.stopPct > 0 ? fill * (1 - settings.stopPct / 100) : -Infinity,
          useStructTrail ? trailStop : settings.trailPct > 0 ? fill * (1 - settings.trailPct / 100) : -Infinity,
        )
        if (initStop > -Infinity && initStop < fill) open.riskPct = 1 - initStop / fill
      }
    } else if (want && shares > 0 && cash > fee && strategy.contribution === 'monthly' && open) {
      // DCA top-up into an open position — always all-in
      const fill = o * (1 + slip)
      open.shares += (cash - fee) / fill
      shares = open.shares
      cash = 0
    } else if (!want && shares > 0) {
      sellAll(i, o * (1 - slip), 'signal')
    }

    // intrabar protective exits, checked against today's full range
    if (shares > 0 && open) {
      const b = bars[i]
      const stopLvl = settings.stopPct > 0 ? open.entryPrice * (1 - settings.stopPct / 100) : null
      const trailLvl = useStructTrail
        ? trailStop > -Infinity
          ? trailStop
          : null
        : settings.trailPct > 0
          ? peakHigh * (1 - settings.trailPct / 100)
          : null
      const eff = Math.max(stopLvl ?? -Infinity, trailLvl ?? -Infinity)
      const stopReason: ExitReason = trailLvl != null && (stopLvl == null || trailLvl > stopLvl) ? 'trail' : 'stop'
      const tpLvl = settings.tpPct > 0 ? open.entryPrice * (1 + settings.tpPct / 100) : null
      if (eff > -Infinity && b.o <= eff) {
        sellAll(i, b.o * (1 - slip), stopReason) // gapped open below the stop → you get the open
        armed = false
      } else if (eff > -Infinity && b.l <= eff) {
        sellAll(i, eff * (1 - slip), stopReason) // touched intrabar → filled at the stop
        armed = false
      } else if (tpLvl != null && b.o >= tpLvl) {
        sellAll(i, b.o * (1 - slip), 'take-profit')
        armed = false
      } else if (tpLvl != null && b.h >= tpLvl) {
        sellAll(i, tpLvl * (1 - slip), 'take-profit')
        armed = false
      }
    }

    // still holding: extend excursions and tomorrow's trailing peak
    if (shares > 0 && open) {
      peakHigh = Math.max(peakHigh, bars[i].h)
      // today is closed now, so it can move tomorrow's stop — upward only
      if (useStructTrail) trailStop = Math.max(trailStop, structLevel(i) ?? -Infinity)
      open.maePct = Math.min(open.maePct ?? 0, bars[i].l / open.entryPrice - 1)
      open.mfePct = Math.max(open.mfePct ?? 0, bars[i].h / open.entryPrice - 1)
    }

    position[i] = shares > 0 ? 'long' : 'flat'
    equity[i] = cash + shares * bars[i].c
    peakEquity = Math.max(peakEquity, equity[i])
  }

  markBailedEarly(trades, bars, wantsLong, warmup)

  // benchmark: lump buy-and-hold entered at the strategy's first tradeable open
  const benchStart = Math.min(warmup + 1, n - 1)
  const benchShares = capital / bars[benchStart].o
  const benchmark = bars.map((b, i) => (i < benchStart ? capital : benchShares * b.c))

  // cumulative contributions — metrics for DCA are computed on equity/contributed
  // so the monthly cash injections don't read as returns
  let contributed: number[] | null = null
  if (strategy.contribution === 'monthly') {
    contributed = new Array<number>(n)
    let cum = 0
    for (let i = 0; i < n; i++) {
      cum += contribution[i]
      contributed[i] = cum
    }
  }

  return {
    bars,
    equity,
    benchmark,
    contributed,
    position,
    trades,
    metrics: computeMetrics(equity, bars, trades, periodsPerYear, undefined, contributed, position),
    benchMetrics: computeMetrics(benchmark, bars, [], periodsPerYear),
    run,
    warmup,
    overlays: [
      ...run.overlays,
      ...(gate ? [{ label: `Regime MA ${settings.regimeMaDays}`, color: '#f472b6', values: gate }] : []),
    ],
    gate,
  }
}

/** How far past an exit we look to see whether the trade was still alive. */
const BAIL_LOOKAHEAD = 20

/**
 * Flag the exits that cost you: a protective stop fired while the strategy
 * still wanted to be long, and within `BAIL_LOOKAHEAD` bars price closed a
 * full unit of the trade's own risk back above where you got out. Any close
 * above the exit is far too low a bar — on a trending asset that's almost
 * every stop. Pure post-hoc analysis; it never touches a fill.
 */
function markBailedEarly(
  trades: Trade[],
  bars: Bar[],
  wantsLong: (i: number) => boolean,
  warmup: number,
): void {
  for (const t of trades) {
    if (t.exitIdx == null || t.exitPrice == null) continue
    if (t.exitReason !== 'stop' && t.exitReason !== 'trail' && t.exitReason !== 'time') continue
    // no risk basis (stopped out during warm-up) → no opinion on the exit
    if (!t.riskPct || t.riskPct <= 0) continue
    const signalIdx = t.exitIdx - 1
    if (signalIdx < warmup || !wantsLong(signalIdx)) continue
    const recovered = t.exitPrice * (1 + t.riskPct)
    const last = Math.min(t.exitIdx + BAIL_LOOKAHEAD, bars.length - 1)
    t.bailedEarly = false
    for (let j = t.exitIdx + 1; j <= last; j++) {
      if (bars[j].c >= recovered) {
        t.bailedEarly = true
        break
      }
    }
  }
}

/** ~252 for equities, ~365 for always-open markets like BTC. */
export function tradingDaysPerYear(bars: Bar[]): number {
  if (bars.length < 2) return 252
  const days = (Date.parse(bars.at(-1)!.t) - Date.parse(bars[0].t)) / 86_400_000
  const perYear = (bars.length / days) * 365.25
  return perYear > 300 ? 365 : 252
}

/**
 * Metrics over equity[0..end]; used live at the playback cursor too.
 * When `contributed` is given (DCA), metrics are computed on the growth index
 * equity/contributed so cash injections don't count as returns.
 */
export function computeMetrics(
  rawEquity: number[],
  bars: Bar[],
  trades: Trade[],
  periodsPerYear: number,
  end?: number,
  contributed?: number[] | null,
  position?: Signal[],
): Metrics {
  const equity = contributed
    ? rawEquity.map((e, i) => (contributed[i] > 0 ? e / contributed[i] : 0))
    : rawEquity
  const last = end ?? equity.length - 1
  const start = equity.findIndex((e) => e > 0)
  if (last <= start || start === -1) {
    return { totalReturn: 0, cagr: 0, maxDrawdown: 0, sharpe: 0, winRate: null, numTrades: 0, exposure: null }
  }

  const totalReturn = equity[last] / equity[start] - 1
  const years = (Date.parse(bars[last].t) - Date.parse(bars[start].t)) / 86_400_000 / 365.25
  const cagr = years > 0 ? Math.pow(equity[last] / equity[start], 1 / years) - 1 : 0

  let peak = -Infinity
  let maxDrawdown = 0
  let sum = 0
  let sumSq = 0
  let count = 0
  for (let i = start; i <= last; i++) {
    peak = Math.max(peak, equity[i])
    maxDrawdown = Math.min(maxDrawdown, equity[i] / peak - 1)
    if (i > start && equity[i - 1] > 0) {
      const r = equity[i] / equity[i - 1] - 1
      sum += r
      sumSq += r * r
      count++
    }
  }
  const mean = count > 0 ? sum / count : 0
  const variance = count > 1 ? (sumSq - count * mean * mean) / (count - 1) : 0
  const std = Math.sqrt(Math.max(variance, 0))
  const sharpe = std > 0 ? (mean / std) * Math.sqrt(periodsPerYear) : 0

  const closed = trades.filter((t) => t.exitIdx != null && t.exitIdx <= last)
  const wins = closed.filter((t) => (t.pnl ?? 0) > 0).length
  const numTrades = trades.filter((t) => t.entryIdx <= last).length

  let exposure: number | null = null
  if (position) {
    let inMarket = 0
    for (let i = start; i <= last; i++) if (position[i] === 'long') inMarket++
    exposure = inMarket / (last - start + 1)
  }

  return {
    totalReturn,
    cagr,
    maxDrawdown,
    sharpe,
    winRate: closed.length > 0 ? wins / closed.length : null,
    numTrades,
    exposure,
  }
}
