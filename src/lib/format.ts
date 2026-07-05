/** Shared number formatters. Existing rent-vs-buy components keep local copies for now. */

export function fmtMoney(n: number) {
  const abs = Math.abs(n)
  const s =
    abs >= 1_000_000
      ? `$${(abs / 1_000_000).toFixed(2)}M`
      : abs >= 1_000
        ? `$${Math.round(abs / 1000)}k`
        : `$${Math.round(abs)}`
  return n < 0 ? `−${s}` : s
}

export function fmtK(v: number) {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
  return `$${v.toFixed(0)}`
}

export function fmtPct(n: number, dp = 1) {
  const s = `${(Math.abs(n) * 100).toFixed(dp)}%`
  return n < 0 ? `−${s}` : `+${s}`
}
