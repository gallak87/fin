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
import type { ScenarioProjection } from '../types'

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
]

function fmtK(v: number) {
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
  return `$${v.toFixed(0)}`
}

interface Props {
  projections: ScenarioProjection[]
}

export function ProjectionChart({ projections }: Props) {
  if (projections.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800 text-sm text-gray-500 text-center py-12">
        Check scenario pills above to plot them here
      </div>
    )
  }

  const years = projections[0].points.map((p) => p.year)
  const data = years.map((year) => {
    const row: Record<string, number | string> = { year }
    projections.forEach((proj, i) => {
      const pt = proj.points.find((p) => p.year === year)
      if (pt) row[`delta_${i}`] = Math.round(pt.buyNetWorth - pt.rentNetWorth)
    })
    return row
  })

  const allDeltas = projections.flatMap((proj) =>
    proj.points.map((p) => p.buyNetWorth - p.rentNetWorth),
  )
  const minDelta = Math.min(...allDeltas)
  const maxDelta = Math.max(...allDeltas)
  const hasNegative = minDelta < 0

  return (
    <div className="bg-gray-900 rounded-xl p-2 border border-gray-800 space-y-2">
      <div className="h-[240px] sm:h-[360px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />

            {/* Color zones */}
            <ReferenceArea
              y1={0}
              y2={maxDelta * 1.1}
              fill="#10b981"
              fillOpacity={0.06}
              ifOverflow="hidden"
            />
            {hasNegative && (
              <ReferenceArea
                y1={minDelta * 1.1}
                y2={0}
                fill="#ef4444"
                fillOpacity={0.08}
                ifOverflow="hidden"
              />
            )}

            <XAxis
              dataKey="year"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickFormatter={(v) => `Yr ${v}`}
              axisLine={{ stroke: '#374151' }}
              tickLine={false}
            >
              <Label value="years from now" offset={-10} position="insideBottom" style={{ fill: '#6b7280', fontSize: 11 }} />
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
                value: hasNegative ? 'renting wins ↓  |  buying wins ↑' : 'break-even — buying wins above this line',
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
                const idx = Number(String(name ?? '').split('_')[1])
                const proj = projections[idx]
                const v = Number(value)
                const msg = v >= 0
                  ? `buying puts you ${fmtK(v)} ahead`
                  : `renting puts you ${fmtK(Math.abs(v))} ahead`
                return [msg, proj?.name ?? '']
              }}
            />

            {projections.map((_proj, i) => (
              <Line
                key={`delta_${i}`}
                type="monotone"
                dataKey={`delta_${i}`}
                stroke={COLORS[i % COLORS.length]}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-gray-800">
        {projections.map((proj, i) => (
          <div key={proj.scenarioId} className="flex items-center gap-1.5">
            <span className="inline-block w-5 h-0.5 rounded" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-xs lg:text-sm text-gray-300">{proj.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
