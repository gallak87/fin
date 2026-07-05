import type { Bar, BacktestResult, Metrics, Signal, Strategy, Trade } from './types'

/**
 * Signals are read at bar close and executed at the NEXT bar's open (no
 * look-ahead). All-in/all-out, fractional shares, no fees/slippage.
 */
export function runBacktest(
  bars: Bar[],
  strategy: Strategy,
  params: Record<string, number>,
  capital: number,
): BacktestResult {
  const run = strategy.init(bars, params)
  const n = bars.length
  const periodsPerYear = tradingDaysPerYear(bars)

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

  for (let i = 0; i < n; i++) {
    // contributions arrive at the open, before any trading
    cash += contribution[i]

    // execute yesterday's signal at today's open
    const want: Signal = i > 0 && i - 1 >= run.warmup ? run.signalAt(i - 1) : 'flat'
    if (want === 'long' && cash > 0) {
      const bought = cash / bars[i].o
      if (shares === 0) {
        open = { entryIdx: i, entryDate: bars[i].t, entryPrice: bars[i].o, shares: bought }
        trades.push(open)
      } else if (open) {
        open.shares += bought // DCA top-up into an open position
      }
      shares += bought
      cash = 0
    } else if (want === 'flat' && shares > 0) {
      cash += shares * bars[i].o
      if (open) {
        open.exitIdx = i
        open.exitDate = bars[i].t
        open.exitPrice = bars[i].o
        open.pnl = (bars[i].o - open.entryPrice) * open.shares
        open.pnlPct = bars[i].o / open.entryPrice - 1
        open = null
      }
      shares = 0
    }

    position[i] = shares > 0 ? 'long' : 'flat'
    equity[i] = cash + shares * bars[i].c
  }

  // benchmark: lump buy-and-hold entered at the strategy's first tradeable open
  const benchStart = Math.min(run.warmup + 1, n - 1)
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
    metrics: computeMetrics(equity, bars, trades, periodsPerYear, undefined, contributed),
    benchMetrics: computeMetrics(benchmark, bars, [], periodsPerYear),
    run,
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
): Metrics {
  const equity = contributed
    ? rawEquity.map((e, i) => (contributed[i] > 0 ? e / contributed[i] : 0))
    : rawEquity
  const last = end ?? equity.length - 1
  const start = equity.findIndex((e) => e > 0)
  if (last <= start || start === -1) {
    return { totalReturn: 0, cagr: 0, maxDrawdown: 0, sharpe: 0, winRate: null, numTrades: 0 }
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

  return {
    totalReturn,
    cagr,
    maxDrawdown,
    sharpe,
    winRate: closed.length > 0 ? wins / closed.length : null,
    numTrades,
  }
}
