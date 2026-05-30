import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
      <div className="bg-gray-800 rounded-xl p-3 border border-gray-700 text-xs text-gray-500 text-center py-8">
        Save and select scenarios to see projections
      </div>
    )
  }

  // Merge all projections into chart data keyed by year
  const years = projections[0].points.map((p) => p.year)
  const data = years.map((year) => {
    const row: Record<string, number | string> = { year }
    projections.forEach((proj, i) => {
      const pt = proj.points.find((p) => p.year === year)
      if (pt) {
        row[`buy_${i}`] = Math.round(pt.buyNetWorth)
        row[`rent_${i}`] = Math.round(pt.rentNetWorth)
      }
    })
    return row
  })

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 uppercase tracking-wide">10-Year Net Worth Projection</div>
        <div className="text-xs text-gray-600">── buy &nbsp;&nbsp; ╌╌ rent + invest</div>
      </div>

      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="year"
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickFormatter={(v) => `Yr ${v}`}
            axisLine={{ stroke: '#374151' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 11 }}
            tickFormatter={fmtK}
            width={56}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: '#6b7280', marginBottom: 4 }}
            labelFormatter={(v) => `Year ${v}`}
            formatter={(value, name) => {
              const nameStr = String(name ?? '')
              const [type, idx] = nameStr.split('_')
              const p = projections[Number(idx)]
              return [fmtK(Number(value)), `${p?.name ?? ''} — ${type === 'buy' ? 'buy' : 'rent'}`]
            }}
          />
          {projections.map((_proj, i) => [
            <Line
              key={`buy_${i}`}
              type="monotone"
              dataKey={`buy_${i}`}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4 }}
            />,
            <Line
              key={`rent_${i}`}
              type="monotone"
              dataKey={`rent_${i}`}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 3 }}
              opacity={0.6}
            />,
          ])}
        </LineChart>
      </ResponsiveContainer>

      {/* Custom legend — one row per scenario */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 border-t border-gray-700/50">
        {projections.map((proj, i) => (
          <div key={proj.scenarioId} className="flex items-center gap-1.5">
            <span
              className="inline-block w-4 h-0.5 rounded"
              style={{ backgroundColor: COLORS[i % COLORS.length] }}
            />
            <span className="text-xs text-gray-400">{proj.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
