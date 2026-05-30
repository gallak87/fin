import { useStore } from '../store'
import { computeMetrics } from '../lib/mortgage'

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-US', { maximumFractionDigits: decimals })
}

interface Props {
  onClose: () => void
}

type MetricRow = {
  label: string
  key: string
  format: (v: number) => string
  lowerIsBetter?: boolean
}

const ROWS: MetricRow[] = [
  { label: 'House Price', key: 'housePrice', format: (v) => `$${fmt(v / 1000)}k` },
  { label: 'Down Payment', key: 'downPayment', format: (v) => `$${fmt(v / 1000)}k` },
  { label: 'Down Payment %', key: 'downPaymentPct', format: (v) => `${v.toFixed(1)}%` },
  { label: 'Loan Amount', key: 'loanAmount', format: (v) => `$${fmt(v / 1000)}k`, lowerIsBetter: true },
  { label: 'Monthly PITI', key: 'monthlyPITI', format: (v) => `$${fmt(v)}`, lowerIsBetter: true },
  { label: 'Front-end DTI', key: 'frontEndDTI', format: (v) => `${v.toFixed(1)}%`, lowerIsBetter: true },
  { label: 'Cash Reserve', key: 'cashReserve', format: (v) => `$${fmt(v / 1000)}k` },
  { label: 'Months Reserve', key: 'monthsOfReserve', format: (v) => `${v.toFixed(1)} mo` },
  { label: 'Discretionary /mo', key: 'discretionaryMonthly', format: (v) => `$${fmt(v)}` },
  { label: 'Opp. Cost /yr', key: 'opportunityCostAnnual', format: (v) => `$${fmt(v)}`, lowerIsBetter: true },
  { label: 'Break-even Year', key: 'breakEvenYear', format: (v) => v > 0 ? `Yr ${v}` : '> 30yr', lowerIsBetter: true },
]

export function CompareModal({ onClose }: Props) {
  const { scenarios, selectedIds } = useStore()
  const selected = selectedIds.length > 0
    ? scenarios.filter((s) => selectedIds.includes(s.id))
    : scenarios

  if (selected.length === 0) return null

  const allMetrics = selected.map((sc) => ({
    scenario: sc,
    metrics: computeMetrics(sc.inputs),
  }))

  function getCellValue(key: string, sc: typeof allMetrics[0]): number {
    if (key === 'housePrice') return sc.scenario.inputs.housePrice
    return (sc.metrics as unknown as Record<string, number>)[key] ?? 0
  }

  function getBest(key: string, lowerIsBetter?: boolean): number {
    const vals = allMetrics.map((m) => getCellValue(key, m))
    return lowerIsBetter ? Math.min(...vals) : Math.max(...vals)
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-5xl mt-8 mb-8">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="text-sm font-semibold text-white">
            Scenario Comparison
            {selectedIds.length === 0 && <span className="text-gray-500 font-normal ml-2">(all scenarios)</span>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg leading-none">×</button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-3 text-gray-500 font-normal min-w-36">Metric</th>
                {selected.map((sc) => (
                  <th key={sc.id} className="p-3 text-white font-semibold text-center min-w-32">
                    {sc.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => {
                const best = getBest(row.key, row.lowerIsBetter)
                return (
                  <tr key={row.key} className="border-b border-gray-800 hover:bg-gray-800/30">
                    <td className="p-3 text-gray-400">{row.label}</td>
                    {allMetrics.map(({ scenario, metrics }) => {
                      const val = getCellValue(row.key, { scenario, metrics })
                      const isBest = selected.length > 1 && val === best
                      return (
                        <td
                          key={scenario.id}
                          className={`p-3 text-center font-mono ${isBest ? 'text-green-400 font-semibold' : 'text-gray-300'}`}
                        >
                          {row.format(val)}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="p-3 text-xs text-gray-600 border-t border-gray-700">
          Green = best value for that metric across selected scenarios
        </div>
      </div>
    </div>
  )
}
