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
