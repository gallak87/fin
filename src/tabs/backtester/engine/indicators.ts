/** Indicator arrays are aligned to the input; null during warm-up. */

export function sma(v: number[], n: number): (number | null)[] {
  const out: (number | null)[] = new Array(v.length).fill(null)
  let sum = 0
  for (let i = 0; i < v.length; i++) {
    sum += v[i]
    if (i >= n) sum -= v[i - n]
    if (i >= n - 1) out[i] = sum / n
  }
  return out
}

export function ema(v: number[], n: number): (number | null)[] {
  const out: (number | null)[] = new Array(v.length).fill(null)
  if (v.length < n) return out
  const k = 2 / (n + 1)
  // seed with SMA of the first n values
  let prev = v.slice(0, n).reduce((a, b) => a + b, 0) / n
  out[n - 1] = prev
  for (let i = n; i < v.length; i++) {
    prev = v[i] * k + prev * (1 - k)
    out[i] = prev
  }
  return out
}

/** MACD line (fast EMA − slow EMA), its signal EMA, and the histogram. */
export function macd(
  v: number[],
  fast: number,
  slow: number,
  signalN: number,
): { macd: (number | null)[]; signal: (number | null)[]; hist: (number | null)[] } {
  const f = ema(v, fast)
  const s = ema(v, slow)
  const line: (number | null)[] = v.map((_, i) => (f[i] != null && s[i] != null ? f[i]! - s[i]! : null))
  // signal = EMA of the macd line, seeded once enough macd values exist
  const start = line.findIndex((x) => x != null)
  const signal: (number | null)[] = new Array(v.length).fill(null)
  if (start !== -1 && start + signalN <= v.length) {
    const k = 2 / (signalN + 1)
    let prev = 0
    for (let i = start; i < start + signalN; i++) prev += line[i]!
    prev /= signalN
    signal[start + signalN - 1] = prev
    for (let i = start + signalN; i < v.length; i++) {
      prev = line[i]! * k + prev * (1 - k)
      signal[i] = prev
    }
  }
  const hist = line.map((m, i) => (m != null && signal[i] != null ? m - signal[i]! : null))
  return { macd: line, signal, hist }
}

/** Bollinger bands: SMA mid ± k standard deviations. */
export function bollinger(
  v: number[],
  n: number,
  k: number,
): { mid: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] } {
  const mid = sma(v, n)
  const upper: (number | null)[] = new Array(v.length).fill(null)
  const lower: (number | null)[] = new Array(v.length).fill(null)
  let sum = 0
  let sumSq = 0
  for (let i = 0; i < v.length; i++) {
    sum += v[i]
    sumSq += v[i] * v[i]
    if (i >= n) {
      sum -= v[i - n]
      sumSq -= v[i - n] * v[i - n]
    }
    if (i >= n - 1 && mid[i] != null) {
      const variance = Math.max(sumSq / n - (sum / n) ** 2, 0)
      const sd = Math.sqrt(variance)
      upper[i] = mid[i]! + k * sd
      lower[i] = mid[i]! - k * sd
    }
  }
  return { mid, upper, lower }
}

/** Donchian channel: rolling highest high / lowest low over the last n bars (inclusive). */
export function donchian(
  highs: number[],
  lows: number[],
  n: number,
): { upper: (number | null)[]; lower: (number | null)[] } {
  const upper: (number | null)[] = new Array(highs.length).fill(null)
  const lower: (number | null)[] = new Array(highs.length).fill(null)
  for (let i = n - 1; i < highs.length; i++) {
    let hi = -Infinity
    let lo = Infinity
    for (let j = i - n + 1; j <= i; j++) {
      if (highs[j] > hi) hi = highs[j]
      if (lows[j] < lo) lo = lows[j]
    }
    upper[i] = hi
    lower[i] = lo
  }
  return { upper, lower }
}

/** Rate of change over n bars, in percent. */
export function roc(v: number[], n: number): (number | null)[] {
  return v.map((x, i) => (i >= n ? (x / v[i - n] - 1) * 100 : null))
}

/** Drawdown from the running peak, in percent (≤ 0). */
export function drawdownFromPeak(v: number[]): (number | null)[] {
  const out: (number | null)[] = new Array(v.length).fill(null)
  let peak = -Infinity
  for (let i = 0; i < v.length; i++) {
    peak = Math.max(peak, v[i])
    out[i] = (v[i] / peak - 1) * 100
  }
  return out
}

/** Wilder-smoothed average true range. */
export function atr(bars: { h: number; l: number; c: number }[], n: number): (number | null)[] {
  const out: (number | null)[] = new Array(bars.length).fill(null)
  if (bars.length <= n) return out
  const tr = (i: number) =>
    i === 0
      ? bars[0].h - bars[0].l
      : Math.max(
          bars[i].h - bars[i].l,
          Math.abs(bars[i].h - bars[i - 1].c),
          Math.abs(bars[i].l - bars[i - 1].c),
        )
  let prev = 0
  for (let i = 0; i < n; i++) prev += tr(i)
  prev /= n
  out[n - 1] = prev
  for (let i = n; i < bars.length; i++) {
    prev = (prev * (n - 1) + tr(i)) / n
    out[i] = prev
  }
  return out
}

/** Wilder-smoothed RSI. */
export function rsi(v: number[], n: number): (number | null)[] {
  const out: (number | null)[] = new Array(v.length).fill(null)
  if (v.length <= n) return out
  let gain = 0
  let loss = 0
  for (let i = 1; i <= n; i++) {
    const d = v[i] - v[i - 1]
    if (d > 0) gain += d
    else loss -= d
  }
  let avgGain = gain / n
  let avgLoss = loss / n
  const toRsi = () => (avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss))
  out[n] = toRsi()
  for (let i = n + 1; i < v.length; i++) {
    const d = v[i] - v[i - 1]
    avgGain = (avgGain * (n - 1) + Math.max(d, 0)) / n
    avgLoss = (avgLoss * (n - 1) + Math.max(-d, 0)) / n
    out[i] = toRsi()
  }
  return out
}
