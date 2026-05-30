import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
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
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 text-xs text-gray-500 text-center py-12">
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

  // figure out if any scenario is ever below zero, for y-axis label placement
  const allDeltas = projections.flatMap((proj) =>
    proj.points.map((p) => p.buyNetWorth - p.rentNetWorth),
  )
  const hasNegative = allDeltas.some((d) => d < 0)

  return (
    <div className="bg-gray-800 rounded-xl p-2 border border-gray-700 space-y-2">
      <div className="h-[220px] sm:h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 16, right: 16, left: 8, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="year"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickFormatter={(v) => `Yr ${v}`}
              axisLine={{ stroke: '#374151' }}
              tickLine={false}
            >
              <Label value="years from now" offset={-8} position="insideBottom" style={{ fill: '#4b5563', fontSize: 10 }} />
            </XAxis>
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickFormatter={fmtK}
              width={60}
              axisLine={false}
              tickLine={false}
            >
              <Label
                value="buying advantage ($)"
                angle={-90}
                position="insideLeft"
                offset={12}
                style={{ fill: '#4b5563', fontSize: 10, textAnchor: 'middle' }}
              />
            </YAxis>
            <ReferenceLine
              y={0}
              stroke="#6b7280"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              label={{
                value: hasNegative ? '← renting wins | buying wins →' : 'break-even',
                position: 'insideTopLeft',
                fill: '#6b7280',
                fontSize: 10,
                dy: -4,
              }}
            />
            <Tooltip
              contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#6b7280', marginBottom: 6 }}
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
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-gray-700/50">
        {projections.map((proj, i) => (
          <div key={proj.scenarioId} className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-0.5 rounded" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-xs text-gray-400">{proj.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
