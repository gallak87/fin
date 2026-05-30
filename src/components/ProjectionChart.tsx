import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
    <div className="bg-gray-800 rounded-xl p-3 border border-gray-700 space-y-2">
      <div className="text-xs text-gray-500 uppercase tracking-wide">10-Year Net Worth Projection</div>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="year"
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            tickFormatter={(v) => `Yr ${v}`}
          />
          <YAxis
            tick={{ fill: '#9ca3af', fontSize: 11 }}
            tickFormatter={fmtK}
            width={56}
          />
          <Tooltip
            contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8 }}
            labelStyle={{ color: '#9ca3af' }}
            labelFormatter={(v) => `Year ${v}`}
            formatter={(value, name) => {
              const nameStr = String(name ?? '')
              const [type, idx] = nameStr.split('_')
              const p = projections[Number(idx)]
              return [fmtK(Number(value)), `${p?.name ?? ''} (${type === 'buy' ? 'buy' : 'rent'})`]
            }}
          />
          <Legend
            formatter={(value: string) => {
              const [type, idx] = value.split('_')
              const p = projections[Number(idx)]
              return `${p?.name ?? ''} (${type === 'buy' ? 'buy' : 'rent'})`
            }}
            wrapperStyle={{ fontSize: 11, color: '#9ca3af' }}
          />
          {projections.map((_proj, i) => [
            <Line
              key={`buy_${i}`}
              type="monotone"
              dataKey={`buy_${i}`}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={false}
            />,
            <Line
              key={`rent_${i}`}
              type="monotone"
              dataKey={`rent_${i}`}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
            />,
          ])}
        </LineChart>
      </ResponsiveContainer>
      <div className="text-xs text-gray-600">Solid = buy path · Dashed = rent + invest path</div>
    </div>
  )
}
