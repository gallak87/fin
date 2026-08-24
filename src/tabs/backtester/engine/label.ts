import type { EngineSettings } from './types'
import { DEFAULT_SETTINGS } from './engine'

/** Terse auto-label for a saved strategy snapshot, e.g. "MA 12/30 · SL7 R200". */
export function autoLabel(
  strategyId: string,
  params: Record<string, number>,
  settings: EngineSettings,
): string {
  let base: string
  switch (strategyId) {
    case 'ma-cross':
      base = `${params.useEma ? 'EMA' : 'MA'} ${params.fast}/${params.slow}`
      break
    case 'buy-hold':
      base = 'B&H'
      break
    case 'dca':
      base = 'DCA'
      break
    case 'rsi':
      base = `RSI${params.period} ${params.buyBelow}/${params.sellAbove}`
      break
    case 'macd':
      base = `MACD ${params.fast}/${params.slow}/${params.signal}`
      break
    case 'donchian':
      base = `Donch ${params.entry}/${params.exit}`
      break
    case 'bollinger':
      base = `Boll ${params.period}·${params.width / 10}σ`
      break
    case 'momentum':
      base = `ROC ${params.lookback}`
      break
    case 'dip':
      base = `Dip ${params.buyDown}%`
      break
    case 'stoch':
      base = `Stoch${params.lookback} ${params.buyBelow}/${params.sellAbove}`
      break
    case 'custom':
      base = 'JS'
      break
    default:
      base = strategyId
  }

  const s = settings
  const d = DEFAULT_SETTINGS
  const tags: string[] = []
  if (s.stopPct > 0) tags.push(`SL${s.stopPct}`)
  if (s.trailMode === 'structure') {
    if (s.trailLookback > 0) tags.push(`TS${s.trailLookback}L${s.trailAtrMult}A`)
  } else if (s.trailPct > 0) tags.push(`TS${s.trailPct}`)
  if (s.tpPct > 0) tags.push(`TP${s.tpPct}`)
  if (s.maxBars > 0) tags.push(`T${s.maxBars}`)
  if (s.regimeMaDays > 0) tags.push(`R${s.regimeMaDays}`)
  if (s.sizingMode === 'fixed') tags.push(`F${s.fixedPct}`)
  if (s.sizingMode === 'vol') tags.push(`V${s.volTargetPct}`)
  if (s.sizingMode === 'drawdown') tags.push(`D${s.ddBudgetPct}`)
  if (s.slippageBps !== d.slippageBps || s.feePerTrade !== d.feePerTrade)
    tags.push(`${s.slippageBps}bp${s.feePerTrade > 0 ? `+$${s.feePerTrade}` : ''}`)

  return tags.length ? `${base} · ${tags.join(' ')}` : base
}
