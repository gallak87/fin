import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
  Label,
} from 'recharts'
import type { ComparisonSeries } from '../types'

function fmtK(v: number) {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
  return `$${v.toFixed(0)}`
}

function breakEvenLabel(month: number | null): string {
  if (month === null) return 'never'
  const yrs = month / 12
  return yrs < 1 ? `${month}mo` : `${yrs.toFixed(1)}yr`
}

interface Props {
  series: ComparisonSeries[]
  holdingPeriodYears: number
}

export function ComparisonChart({ series, holdingPeriodYears }: Props) {
  if (series.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-sm text-gray-500 text-center py-12">
        Pick something to compare
      </div>
    )
  }

  const years = series[0].points.map((p) => p.year)
  const data = years.map((year) => {
    const row: Record<string, number | string> = { year }
    series.forEach((s, i) => {
      const pt = s.points.find((p) => p.year === year)
      if (pt) row[`d${i}`] = pt.delta
    })
    return row
  })

  const all = series.flatMap((s) => s.points.map((p) => p.delta))
  const minDelta = Math.min(0, ...all)
  const maxDelta = Math.max(0, ...all)

  return (
    <div className="bg-gray-900 rounded-xl p-2 border border-gray-800 space-y-2">
      <div className="h-[260px] sm:h-[380px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />

            <ReferenceArea y1={0} y2={maxDelta * 1.1} fill="#10b981" fillOpacity={0.06} ifOverflow="hidden" />
            {minDelta < 0 && (
              <ReferenceArea y1={minDelta * 1.1} y2={0} fill="#ef4444" fillOpacity={0.08} ifOverflow="hidden" />
            )}

            {/* holding-period marker */}
            <ReferenceLine
              x={holdingPeriodYears}
              stroke="#6b7280"
              strokeDasharray="2 4"
              label={{ value: `your horizon (${holdingPeriodYears}yr)`, position: 'top', fill: '#9ca3af', fontSize: 10 }}
            />

            <XAxis
              dataKey="year"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(v) => `Yr ${v}`}
              axisLine={{ stroke: '#374151' }}
              tickLine={false}
            >
              <Label value="years owned" offset={-10} position="insideBottom" style={{ fill: '#6b7280', fontSize: 11 }} />
            </XAxis>
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={fmtK}
              width={64}
              axisLine={false}
              tickLine={false}
            >
              <Label
                value="buying advantage"
                angle={-90}
                position="insideLeft"
                offset={14}
                style={{ fill: '#6b7280', fontSize: 11, textAnchor: 'middle' }}
              />
            </YAxis>

            <ReferenceLine
              y={0}
              stroke="#6b7280"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              label={{
                value: 'renting wins ↓  |  buying wins ↑',
                position: 'insideTopLeft',
                fill: '#9ca3af',
                fontSize: 11,
                dy: -4,
              }}
            />

            <Tooltip
              contentStyle={{ background: '#0f172a', border: '1px solid #374151', borderRadius: 8, fontSize: 13 }}
              labelStyle={{ color: '#9ca3af', marginBottom: 6 }}
              labelFormatter={(v) => `Year ${v}`}
              formatter={(value, name) => {
                const idx = Number(String(name ?? '').slice(1))
                const s = series[idx]
                const v = Number(value)
                const msg = v >= 0 ? `buying ${fmtK(v)} ahead` : `renting ${fmtK(Math.abs(v))} ahead`
                return [msg, s?.name ?? '']
              }}
            />

            {series.map((s, i) => (
              <Line
                key={`d${i}`}
                type="monotone"
                dataKey={`d${i}`}
                stroke={s.color}
                strokeWidth={s.emphasis ? 2.75 : 1.75}
                strokeDasharray={s.dashed ? '5 4' : undefined}
                strokeOpacity={s.emphasis ? 1 : 0.85}
                dot={false}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-gray-800">
        {series.map((s) => (
          <div key={s.id} className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-0.5 rounded" style={{ backgroundColor: s.color }} />
            <span className="text-xs lg:text-sm text-gray-300">{s.name}</span>
            <span className="text-[11px] text-gray-500">be {breakEvenLabel(s.breakEvenMonth)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
