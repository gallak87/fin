/** Exact dollars with a real minus sign — these are amounts you'd wire, not estimates. */
export const dollars = (n: number) =>
  `${n < 0 ? '−' : ''}$${Math.round(Math.abs(n)).toLocaleString('en-US')}`

export const shortDollars = (n: number) =>
  Math.abs(n) >= 1_000_000
    ? `${n < 0 ? '−' : ''}$${(Math.abs(n) / 1_000_000).toFixed(2)}M`
    : `${n < 0 ? '−' : ''}$${Math.round(Math.abs(n) / 1000)}k`

export const pct = (n: number, dp = 0) => `${(n * 100).toFixed(dp)}%`
