import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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
      if (pt) {
        row[`buy_${i}`] = Math.round(pt.buyNetWorth)
        row[`rent_${i}`] = Math.round(pt.rentNetWorth)
      }
    })
    return row
  })

  return (
    <div className="bg-gray-800 rounded-xl p-2 border border-gray-700 space-y-2">
      <div className="text-xs text-gray-600 text-right">solid = buy path · dashed = rent + invest path</div>

      <div className="h-[220px] sm:h-[340px]">
        <ResponsiveContainer width="100%" height="100%">
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
              labelStyle={{ color: '#6b7280', marginBottom: 6 }}
              labelFormatter={(v) => `Year ${v}`}
              formatter={(value, name) => {
                const parts = String(name ?? '').split('_')
                const type = parts[0]
                const idx = Number(parts[1])
                const proj = projections[idx]
                return [fmtK(Number(value)), `${proj?.name ?? ''} · ${type === 'buy' ? 'buy' : 'rent & invest'}`]
              }}
            />
            <Legend
              wrapperStyle={{ paddingTop: 8 }}
              formatter={(value) => {
                const parts = String(value).split('_')
                const type = parts[0]
                const idx = Number(parts[1])
                const proj = projections[idx]
                return (
                  <span style={{ color: '#9ca3af', fontSize: 11 }}>
                    {proj?.name ?? ''} · {type === 'buy' ? 'buy' : 'rent & invest'}
                  </span>
                )
              }}
            />
            {projections.map((_proj, i) => (
              <>
                <Line
                  key={`buy_${i}`}
                  type="monotone"
                  dataKey={`buy_${i}`}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                  legendType="line"
                />
                <Line
                  key={`rent_${i}`}
                  type="monotone"
                  dataKey={`rent_${i}`}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  dot={false}
                  activeDot={{ r: 3 }}
                  legendType="line"
                  opacity={0.6}
                />
              </>
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
