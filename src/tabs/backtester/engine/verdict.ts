import type { Metrics } from './types'

export interface Verdict {
  tone: 'good' | 'neutral' | 'bad'
  text: string
}

const pts = (x: number) => Math.round(Math.abs(x) * 100)

/**
 * Translate full-tape strategy-vs-benchmark metrics into the one-sentence
 * story a practitioner would tell: win-win, drawdown insurance (and its
 * price), noise-trading, or plain value subtraction.
 */
export function verdict(m: Metrics, b: Metrics): Verdict {
  // essentially the benchmark itself
  if (m.numTrades <= 1 && (m.exposure ?? 1) > 0.9) {
    return { tone: 'neutral', text: 'This is (almost) buy & hold itself — the benchmark, not a timing strategy.' }
  }

  const retRatio = (1 + m.totalReturn) / (1 + b.totalReturn)
  // maxDrawdown is ≤ 0; m − b > 0 means the strategy's worst valley was shallower
  const ddEdge = m.maxDrawdown - b.maxDrawdown
  const shallower = ddEdge >= 0.05
  const deeper = ddEdge <= -0.05

  // churn check: lots of trades, mostly losers, little to show for it
  if (m.numTrades >= 30 && (m.winRate ?? 1) < 0.35 && retRatio < 0.85) {
    return {
      tone: 'bad',
      text: `${m.numTrades} trades, ${Math.round((m.winRate ?? 0) * 100)}% winners, ${retRatio.toFixed(2)}× buy & hold — this is trading noise. The windows are likely too fast for how this asset trends.`,
    }
  }

  if (retRatio >= 1.05 && shallower) {
    return {
      tone: 'good',
      text: `More return AND a ${pts(ddEdge)}pt shallower worst drawdown than holding — the rare win-win. Run the lab before you believe it.`,
    }
  }
  if (retRatio >= 1.05 && deeper) {
    return {
      tone: 'neutral',
      text: `Beat buy & hold on return, but with a ${pts(ddEdge)}pt deeper worst drawdown — the extra return was bought with extra pain, not skill.`,
    }
  }
  if (retRatio >= 1.05) {
    return {
      tone: 'good',
      text: `Beat buy & hold with a similar worst drawdown — timing added value here. Check the lab to see if it's luck.`,
    }
  }

  if (retRatio >= 0.95) {
    return {
      tone: 'neutral',
      text: shallower
        ? `Matches buy & hold's destination with a ${pts(ddEdge)}pt shallower worst drawdown — same place, smoother road.`
        : `Basically matches buy & hold — the timing is neither adding nor subtracting much on this asset.`,
    }
  }

  // underperforms on return
  if (shallower && b.totalReturn > 0) {
    const paid = Math.round(((b.totalReturn - m.totalReturn) / b.totalReturn) * 100)
    return {
      tone: 'neutral',
      text: `Drawdown insurance: you gave up ~${paid}% of buy & hold's gains for a ${pts(ddEdge)}pt shallower worst drawdown. Worth it only if you'd otherwise sell the bottom.`,
    }
  }
  return {
    tone: 'bad',
    text: `Less return than holding and no smoother ride — this rule subtracts value on this asset. Wrong trend timescale?`,
  }
}
