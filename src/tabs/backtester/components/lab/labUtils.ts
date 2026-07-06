import { useMemo, useState } from 'react'
import type { Metrics, ParamDef } from '../../engine/types'
import { resolveStrategy, type LabData } from '../../engine/lab'
import { useBacktestStore } from '../../store'
import { fmtPct } from '../../../../lib/format'

export type MetricKey = 'cagr' | 'sharpe' | 'maxDrawdown'

export const METRICS: { key: MetricKey; label: string; fmt: (m: Metrics) => string }[] = [
  { key: 'sharpe', label: 'Sharpe', fmt: (m) => m.sharpe.toFixed(2) },
  { key: 'cagr', label: 'CAGR', fmt: (m) => fmtPct(m.cagr) },
  { key: 'maxDrawdown', label: 'Max DD', fmt: (m) => fmtPct(m.maxDrawdown) },
]

export const fmtMetric = (key: MetricKey, v: number) =>
  key === 'sharpe' ? v.toFixed(2) : fmtPct(v)

/** Current strategy compiled/resolved, or null when custom code is broken. */
export function useActiveStrategy() {
  const strategyId = useBacktestStore((s) => s.strategyId)
  const customCode = useBacktestStore((s) => s.customCode)
  return useMemo(() => {
    try {
      return resolveStrategy(strategyId, customCode)
    } catch {
      return null
    }
  }, [strategyId, customCode])
}

/**
 * Result state that self-invalidates when any dependency changes — panels keep
 * their computed runs only while the inputs that produced them are unchanged.
 */
export function useComputed<T>(deps: unknown[]): [T | null, (v: T) => void, boolean] {
  const [entry, setEntry] = useState<{ deps: unknown[]; value: T } | null>(null)
  const fresh =
    entry != null && entry.deps.length === deps.length && entry.deps.every((d, i) => Object.is(d, deps[i]))
  // stale = we HAD results but an input changed since they were computed
  return [fresh ? entry.value : null, (value: T) => setEntry({ deps, value }), entry != null && !fresh]
}

/**
 * One slice of the shared lab-artifact store: value is present only while it
 * belongs to the live result (gauntlet prepopulates these; panel runs
 * overwrite at higher resolution). Third element = stale (inputs changed).
 */
export function useLabData<K extends keyof LabData>(
  key: K,
): [LabData[K] | null, (v: NonNullable<LabData[K]>) => void, boolean] {
  const result = useBacktestStore((s) => s.result)
  const entry = useBacktestStore((s) => s.labData)
  const setLabData = useBacktestStore((s) => s.setLabData)
  const fresh = entry != null && entry.forResult === result ? (entry.data[key] ?? null) : null
  const stale = entry != null && entry.forResult !== result && entry.data[key] != null
  const set = (v: NonNullable<LabData[K]>) => {
    if (result) setLabData(result, { [key]: v })
  }
  return [fresh, set, stale]
}

/** Sequential blue ramp on the dark surface: brighter = higher (better). */
export function heatColor(t: number): string {
  // 3-stop lerp: slate-950 → blue-600 → blue-200
  const stops: [number, number, number][] = [
    [15, 23, 42],
    [37, 99, 235],
    [191, 219, 254],
  ]
  const x = Math.max(0, Math.min(1, t)) * 2
  const k = x < 1 ? 0 : 1
  const f = x - k
  const [r1, g1, b1] = stops[k]
  const [r2, g2, b2] = stops[k + 1]
  return `rgb(${Math.round(r1 + (r2 - r1) * f)},${Math.round(g1 + (g2 - g1) * f)},${Math.round(b1 + (b2 - b1) * f)})`
}

/** Two-axis param selection; falls back to the first two numeric params. */
export function useParamAxes(params: ParamDef[]) {
  const numeric = useMemo(() => params.filter((p) => !p.toggle), [params])
  const [xKey, setXKey] = useState<string | null>(null)
  const [yKey, setYKey] = useState<string | null>(null)
  const x = numeric.find((p) => p.key === xKey) ?? numeric[0] ?? null
  let y = numeric.find((p) => p.key === yKey && p.key !== x?.key) ?? null
  if (!y) y = numeric.find((p) => p.key !== x?.key) ?? null
  return { numeric, x, y, setXKey, setYKey }
}

