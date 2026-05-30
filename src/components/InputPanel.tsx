import { useState } from 'react'
import { useStore } from '../store'
import { EquitySourceList } from './EquitySourceList'
import { Tooltip } from './Tooltip'
import { computeMetrics, totalDownPayment } from '../lib/mortgage'

function fmt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  display,
  tooltip,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  display: string
  tooltip?: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1">
          <span className="text-xs lg:text-sm text-gray-300">{label}</span>
          {tooltip && (
            <Tooltip content={tooltip}>
              <span className="text-gray-600 hover:text-gray-400 text-xs">ℹ</span>
            </Tooltip>
          )}
        </div>
        <span className="text-xs font-mono text-white">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 accent-blue-500"
      />
    </div>
  )
}


function Toggle({
  label,
  checked,
  onChange,
  tooltip,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
  tooltip?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1">
        <span className="text-xs lg:text-sm text-gray-300">{label}</span>
        {tooltip && (
          <Tooltip content={tooltip}>
            <span className="text-gray-600 hover:text-gray-400 text-xs">ℹ</span>
          </Tooltip>
        )}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-600'}`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
        />
      </button>
    </div>
  )
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="text-xs lg:text-sm font-semibold text-gray-400 uppercase tracking-wider pt-1 pb-0.5 border-t border-gray-800 mt-1">
      {label}
    </div>
  )
}

function CollapsibleSectionHeader({
  label,
  open,
  onToggle,
}: {
  label: string
  open: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-1.5 text-xs lg:text-sm font-semibold text-gray-400 uppercase tracking-wider pt-1 pb-0.5 border-t border-gray-800 mt-1 hover:text-gray-200"
    >
      <span className="text-base leading-none font-light">{open ? '−' : '+'}</span>
      <span>{label}</span>
    </button>
  )
}

export function InputPanel() {
  const { inputs, setInputs, resetInputs, saveScenario } = useStore()
  const [showProjectionSliders, setShowProjectionSliders] = useState(false)
  const [scenarioName, setScenarioName] = useState('')

  function handleSave() {
    saveScenario(scenarioName.trim() || 'Unnamed')
    setScenarioName('')
  }
  const metrics = computeMetrics(inputs)
  const downTotal = totalDownPayment(inputs)
  const downPct = inputs.housePrice > 0 ? (downTotal / inputs.housePrice) * 100 : 0
  const downPctColor =
    downPct >= 30 ? 'text-green-400' : downPct >= 20 ? 'text-yellow-400' : 'text-red-400'

  const rateTooltip = (
    <div className="space-y-1">
      <div className="font-semibold">Mortgage Rate</div>
      <div>Each +0.5% ≈ +${fmt((metrics.loanAmount * 0.005) / 12 / 2)}/mo on this loan.</div>
      <div className="text-gray-400">Current 30yr avg ~7%. Shop 3+ lenders.</div>
    </div>
  )

  const appreciationTooltip = (
    <div className="space-y-1">
      <div className="font-semibold">Annual Home Appreciation</div>
      <div>There's no single formula — it's an assumption based on historical data for your market.</div>
      <div className="text-gray-300 mt-1">How to estimate:</div>
      <ul className="text-gray-400 space-y-0.5 list-disc list-inside">
        <li>Look up your zip on Zillow or Redfin → "Market" tab → 5–10yr price history</li>
        <li>Case-Shiller index: national avg ~3.5–4%/yr long-term</li>
        <li>Seattle metro has run 4–7% in good decades, can go negative short-term</li>
      </ul>
      <div className="text-gray-400 mt-1">Conservative: 3% · Realistic: 4–5% · Optimistic: 6%+</div>
      <div className="text-yellow-400 text-xs mt-1">Past appreciation ≠ future returns. Use this as a sensitivity dial, not a prediction.</div>
    </div>
  )

  const income2Tooltip = (
    <div className="space-y-1">
      <div className="font-semibold">Secondary Income</div>
      <div>Many lenders won&apos;t count income that&apos;s new, unlicensed, or not yet received.</div>
      <div className="text-gray-400">Check with your lender on qualifying criteria.</div>
    </div>
  )

  return (
    <div className="space-y-3 text-sm">
      {/* Fork form — top, inline with editing context */}
      <div className="flex gap-2 items-center">
        <input
          type="text"
          placeholder="fork as new…"
          value={scenarioName}
          onChange={(e) => setScenarioName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="flex-1 text-xs bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-white placeholder-gray-600 focus:border-amber-600 focus:outline-none"
        />
        <button
          onClick={handleSave}
          className="text-xs bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded whitespace-nowrap"
        >
          Fork
        </button>
        <button
          onClick={resetInputs}
          className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-500 rounded px-2 py-1.5 transition-colors whitespace-nowrap"
        >
          Reset
        </button>
      </div>
      <SectionHeader label="Purchase" />

      <SliderRow
        label="House price"
        value={inputs.housePrice}
        min={800_000}
        max={2_500_000}
        step={10_000}
        onChange={(v) => setInputs({ housePrice: v })}
        display={`$${fmt(inputs.housePrice)}`}
      />

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs lg:text-sm text-gray-300">Down payment sources</span>
          <span className={`text-xs font-mono font-semibold ${downPctColor}`}>
            {downPct.toFixed(1)}% (${fmt(downTotal)})
          </span>
        </div>
        <SliderRow
          label="Liquid assets"
          value={inputs.liquidAssets}
          min={50_000}
          max={inputs.housePrice}
          step={10_000}
          onChange={(v) => setInputs({ liquidAssets: v })}
          display={`$${fmt(inputs.liquidAssets)}`}
        />
        <div className="text-xs text-gray-500 pl-1">+ Equity to include:</div>
        <div className="pl-1">
          <EquitySourceList />
        </div>
      </div>

      <SliderRow
        label="Mortgage rate"
        value={inputs.mortgageRate}
        min={4}
        max={10}
        step={0.1}
        onChange={(v) => setInputs({ mortgageRate: v })}
        display={`${inputs.mortgageRate.toFixed(1)}%`}
        tooltip={rateTooltip}
      />

      <div className="flex items-center justify-between">
        <span className="text-xs lg:text-sm text-gray-300">Loan term</span>
        <div className="flex gap-1">
          {([30, 15] as const).map((t) => (
            <button
              key={t}
              onClick={() => setInputs({ loanTermYears: t })}
              className={`text-xs px-2 py-0.5 rounded ${inputs.loanTermYears === t ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              {t}yr
            </button>
          ))}
        </div>
      </div>

      <SliderRow
        label="Property tax rate"
        value={inputs.propertyTaxRate}
        min={0.5} max={3.0} step={0.05}
        onChange={(v) => setInputs({ propertyTaxRate: v })}
        display={`${inputs.propertyTaxRate.toFixed(2)}%`}
      />

      <SectionHeader label="Income" />

      <SliderRow
        label="Primary income /yr"
        value={inputs.income1}
        min={50_000} max={600_000} step={5_000}
        onChange={(v) => setInputs({ income1: v })}
        display={`$${fmt(inputs.income1)}`}
      />
      <SliderRow
        label="Take-home pay /mo"
        value={inputs.monthlyTakeHome}
        min={2_000} max={40_000} step={250}
        onChange={(v) => setInputs({ monthlyTakeHome: v })}
        display={`$${fmt(inputs.monthlyTakeHome)}`}
      />
      <Toggle
        label="Secondary income active"
        checked={inputs.income2Active}
        onChange={(v) => setInputs({ income2Active: v })}
        tooltip={income2Tooltip}
      />
      {inputs.income2Active && (
        <SliderRow
          label="Secondary income /yr"
          value={inputs.income2}
          min={50_000} max={600_000} step={5_000}
          onChange={(v) => setInputs({ income2: v })}
          display={`$${fmt(inputs.income2)}`}
        />
      )}

      <SectionHeader label="Goals & Assumptions" />

      <SliderRow
        label="Discretionary goal /mo"
        value={inputs.discretionaryGoal}
        min={500} max={20_000} step={250}
        onChange={(v) => setInputs({ discretionaryGoal: v })}
        display={`$${fmt(inputs.discretionaryGoal)}`}
      />
      <SliderRow
        label="Non-housing expenses /mo"
        value={inputs.monthlyNonHousingExpenses}
        min={500} max={15_000} step={250}
        onChange={(v) => setInputs({ monthlyNonHousingExpenses: v })}
        display={`$${fmt(inputs.monthlyNonHousingExpenses)}`}
      />
      <SliderRow
        label="Current rent /mo"
        value={inputs.currentRent}
        min={500} max={10_000} step={50}
        onChange={(v) => setInputs({ currentRent: v })}
        display={`$${fmt(inputs.currentRent)}`}
      />

      <CollapsibleSectionHeader
        label={`Projection assumptions${!showProjectionSliders ? ` · ${inputs.annualAppreciation.toFixed(1)}% / ${inputs.investmentReturn.toFixed(1)}%` : ''}`}
        open={showProjectionSliders}
        onToggle={() => setShowProjectionSliders((v) => !v)}
      />
      {showProjectionSliders && (
        <>
          <SliderRow
            label="Annual appreciation"
            value={inputs.annualAppreciation}
            min={0}
            max={8}
            step={0.1}
            onChange={(v) => setInputs({ annualAppreciation: v })}
            display={`${inputs.annualAppreciation.toFixed(1)}%`}
            tooltip={appreciationTooltip}
          />
          <SliderRow
            label="Investment return"
            value={inputs.investmentReturn}
            min={0}
            max={12}
            step={0.1}
            onChange={(v) => setInputs({ investmentReturn: v })}
            display={`${inputs.investmentReturn.toFixed(1)}%`}
          />
        </>
      )}

    </div>
  )
}
