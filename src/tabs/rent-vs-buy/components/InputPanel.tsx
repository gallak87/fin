import { useState } from 'react'
import { useStore } from '../store'
import { EquitySourceList } from './EquitySourceList'
import { Tooltip } from '../../../components/Tooltip'
import {
  LOCATIONS,
  totalDownPayment,
  effectiveTaxRate,
  monthlyRent,
  medianPrice,
  lineColor,
  PRICE_OFFSETS,
} from '../compare'

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

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs lg:text-sm text-gray-300">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-600'}`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${checked ? 'left-[22px]' : 'left-[2px]'}`}
        />
      </button>
    </div>
  )
}

function SectionHeader({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="flex items-baseline justify-between pt-1 pb-0.5 border-t border-gray-800 mt-1">
      <span className="text-xs lg:text-sm font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      {hint && <span className="text-[10px] text-gray-600 normal-case">{hint}</span>}
    </div>
  )
}

export function InputPanel() {
  const {
    inputs,
    selectedLocations,
    focusedLocation,
    cityPrice,
    priceOffsets,
    setInputs,
    tapLocation,
    setFocusedPrice,
    toggleOffset,
    resetInputs,
  } = useStore()
  const [showAssumptions, setShowAssumptions] = useState(false)

  const downTotal = totalDownPayment(inputs)
  const downPct = inputs.housePrice > 0 ? (downTotal / inputs.housePrice) * 100 : 0
  const downColor = downPct >= 30 ? 'text-green-400' : downPct >= 20 ? 'text-yellow-400' : 'text-red-400'
  const taxRate = effectiveTaxRate(inputs)
  const rent = Math.round(monthlyRent(inputs))
  const focusedCity = LOCATIONS.find((l) => l.id === focusedLocation)?.city ?? '—'

  const appreciationTooltip = (
    <div className="space-y-1">
      <div className="font-semibold">Annual Home Appreciation</div>
      <div>An assumption, not a formula. Eastside ran 4–7% in good years but fell ~4.5% off the 2024 peak.</div>
      <div className="text-gray-400 mt-1">Conservative 3% · Realistic 4% · can go negative short-term</div>
      <div className="text-yellow-400 text-xs mt-1">Use it as a sensitivity dial. Try a negative value.</div>
    </div>
  )
  const rentTooltip = (
    <div className="space-y-1">
      <div className="font-semibold">Equivalent rent</div>
      <div>What it'd cost to rent the same home you're buying. Auto-derived from price (≈1/{inputs.rentToPriceRatio} of value per year). Editing it sets the price-to-rent ratio used for all lines.</div>
      <div className="text-gray-400 mt-1">Comparing a cheap home to an expensive rental is the #1 way to fool yourself — keep them like-for-like.</div>
    </div>
  )

  return (
    <div className="space-y-3 text-sm">
      <div className="flex justify-end">
        <button
          onClick={resetInputs}
          className="text-xs text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-500 rounded px-2 py-1 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* ── Locations (multi-select, each a color) ───────── */}
      <SectionHeader label="Locations" hint="tap to add · tap again to edit" />
      <div className="grid grid-cols-2 gap-1">
        {LOCATIONS.map((loc) => {
          const selected = selectedLocations.includes(loc.id)
          const focused = focusedLocation === loc.id
          const price = cityPrice[loc.id] ?? medianPrice(loc.id)
          return (
            <button
              key={loc.id}
              onClick={() => tapLocation(loc.id)}
              className={`relative text-xs px-2 py-1.5 rounded border text-left transition-colors ${
                focused
                  ? 'border-white/70 bg-gray-800'
                  : selected
                    ? 'border-gray-500 bg-gray-800/60'
                    : 'border-gray-800 text-gray-400 hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-1.5">
                {selected && (
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: lineColor(loc.id, 0) }} />
                )}
                <span className="font-medium text-gray-100">{loc.city}</span>
              </div>
              <div className="text-[10px] opacity-70 mt-0.5">
                ${(price / 1_000_000).toFixed(2)}M · ⭐{loc.schoolRating}
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Price (edits the focused city) ───────────────── */}
      <SectionHeader label="Price" hint={`editing ${focusedCity}`} />
      <SliderRow
        label="House price"
        value={inputs.housePrice}
        min={600_000}
        max={2_800_000}
        step={10_000}
        onChange={setFocusedPrice}
        display={`$${fmt(inputs.housePrice)}`}
      />
      <div>
        <div className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">also plot, relative to this price</div>
        <div className="flex gap-1">
          {PRICE_OFFSETS.map((o) => {
            const active = o === 0 || priceOffsets.includes(o)
            return (
              <button
                key={o}
                onClick={() => toggleOffset(o)}
                disabled={o === 0}
                className={`flex-1 text-[11px] px-1 py-1 rounded border transition-colors ${
                  o === 0
                    ? 'border-white/40 text-white bg-gray-800 cursor-default'
                    : active
                      ? 'border-blue-500 text-blue-200 bg-blue-600/15'
                      : 'border-gray-700 text-gray-500 hover:border-gray-500'
                }`}
              >
                {o === 0 ? 'median' : `${o > 0 ? '+' : ''}${o}%`}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Down payment ─────────────────────────────────── */}
      <SectionHeader label="Down payment" />
      <div className="flex items-center justify-between -mt-1">
        <span className="text-xs text-gray-500">of {focusedCity} price</span>
        <span className={`text-xs font-mono font-semibold ${downColor}`}>
          {downPct.toFixed(1)}% (${fmt(downTotal)})
        </span>
      </div>
      <SliderRow
        label="Liquid assets (total)"
        value={inputs.totalLiquidAssets}
        min={50_000}
        max={3_000_000}
        step={10_000}
        onChange={(v) => setInputs({ totalLiquidAssets: v, liquidDownPayment: Math.min(inputs.liquidDownPayment, v) })}
        display={`$${fmt(inputs.totalLiquidAssets)}`}
      />
      <SliderRow
        label="Using as down payment"
        value={inputs.liquidDownPayment}
        min={0}
        max={inputs.totalLiquidAssets}
        step={10_000}
        onChange={(v) => setInputs({ liquidDownPayment: v })}
        display={`$${fmt(inputs.liquidDownPayment)}`}
      />
      <div className="text-xs text-gray-500 pl-1">+ Equity to include:</div>
      <div className="pl-1">
        <EquitySourceList />
      </div>

      {/* ── You ──────────────────────────────────────────── */}
      <SectionHeader label="You" />
      <SliderRow
        label="How long you'll stay"
        value={inputs.holdingPeriodYears}
        min={2}
        max={30}
        step={1}
        onChange={(v) => setInputs({ holdingPeriodYears: v })}
        display={`${inputs.holdingPeriodYears} yr`}
      />
      <SliderRow
        label="Primary income /yr"
        value={inputs.income1}
        min={50_000}
        max={600_000}
        step={5_000}
        onChange={(v) => setInputs({ income1: v })}
        display={`$${fmt(inputs.income1)}`}
      />
      <Toggle label="Secondary income" checked={inputs.income2Active} onChange={(v) => setInputs({ income2Active: v })} />
      {inputs.income2Active && (
        <SliderRow
          label="Secondary income /yr"
          value={inputs.income2}
          min={50_000}
          max={600_000}
          step={5_000}
          onChange={(v) => setInputs({ income2: v })}
          display={`$${fmt(inputs.income2)}`}
        />
      )}
      <div className="flex justify-between items-center">
        <span className="text-xs text-gray-500">Effective tax {inputs.taxRateOverride ? '(manual)' : '(est.)'}</span>
        <span className="text-xs font-mono text-gray-300">{taxRate}%</span>
      </div>

      {/* ── Assumptions drawer ───────────────────────────── */}
      <button
        onClick={() => setShowAssumptions((v) => !v)}
        className="w-full flex items-center gap-1.5 text-xs lg:text-sm font-semibold text-gray-400 uppercase tracking-wider pt-1 pb-0.5 border-t border-gray-800 mt-1 hover:text-gray-200"
      >
        <span className="text-base leading-none font-light">{showAssumptions ? '−' : '+'}</span>
        <span>Assumptions</span>
        {!showAssumptions && (
          <span className="ml-auto normal-case font-normal text-[11px] text-gray-500">
            rent ${fmt(rent)} · {inputs.mortgageRate}% · {inputs.annualAppreciation}%↑
          </span>
        )}
      </button>
      {showAssumptions && (
        <div className="space-y-2.5">
          <SliderRow
            label="Equivalent rent /mo"
            value={rent}
            min={1_500}
            max={12_000}
            step={50}
            onChange={(v) => setInputs({ rentToPriceRatio: inputs.housePrice / (v * 12) })}
            display={`$${fmt(rent)} (1/${inputs.rentToPriceRatio.toFixed(0)})`}
            tooltip={rentTooltip}
          />
          <SliderRow
            label="Rent growth /yr"
            value={inputs.rentGrowth}
            min={0}
            max={8}
            step={0.1}
            onChange={(v) => setInputs({ rentGrowth: v })}
            display={`${inputs.rentGrowth.toFixed(1)}%`}
          />
          <SliderRow
            label="Mortgage rate"
            value={inputs.mortgageRate}
            min={4}
            max={10}
            step={0.1}
            onChange={(v) => setInputs({ mortgageRate: v })}
            display={`${inputs.mortgageRate.toFixed(1)}%`}
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
            label="Home appreciation /yr"
            value={inputs.annualAppreciation}
            min={-4}
            max={8}
            step={0.1}
            onChange={(v) => setInputs({ annualAppreciation: v })}
            display={`${inputs.annualAppreciation.toFixed(1)}%`}
            tooltip={appreciationTooltip}
          />
          <SliderRow
            label="Investment return /yr"
            value={inputs.investmentReturn}
            min={0}
            max={12}
            step={0.1}
            onChange={(v) => setInputs({ investmentReturn: v })}
            display={`${inputs.investmentReturn.toFixed(1)}%`}
          />
          <SliderRow
            label="Property tax /yr"
            value={inputs.propertyTaxRate}
            min={0.5}
            max={2.0}
            step={0.05}
            onChange={(v) => setInputs({ propertyTaxRate: v })}
            display={`${inputs.propertyTaxRate.toFixed(2)}%`}
          />
          <SliderRow
            label="Maintenance /yr"
            value={inputs.maintenanceRate}
            min={0}
            max={3}
            step={0.1}
            onChange={(v) => setInputs({ maintenanceRate: v })}
            display={`${inputs.maintenanceRate.toFixed(1)}%`}
          />
          <SliderRow
            label="Closing cost (buy)"
            value={inputs.closingCostPct}
            min={0}
            max={5}
            step={0.1}
            onChange={(v) => setInputs({ closingCostPct: v })}
            display={`${inputs.closingCostPct.toFixed(1)}%`}
          />
          <SliderRow
            label="Selling cost (exit)"
            value={inputs.sellingCostPct}
            min={0}
            max={10}
            step={0.1}
            onChange={(v) => setInputs({ sellingCostPct: v })}
            display={`${inputs.sellingCostPct.toFixed(1)}%`}
          />
          <Toggle
            label="Override tax rate"
            checked={inputs.taxRateOverride}
            onChange={(v) => setInputs({ taxRateOverride: v })}
          />
          {inputs.taxRateOverride && (
            <SliderRow
              label="Effective tax rate"
              value={inputs.effectiveTaxRate}
              min={10}
              max={50}
              step={1}
              onChange={(v) => setInputs({ effectiveTaxRate: v })}
              display={`${inputs.effectiveTaxRate}%`}
            />
          )}
          <SliderRow
            label="Non-housing expenses /mo"
            value={inputs.monthlyNonHousingExpenses}
            min={500}
            max={15_000}
            step={250}
            onChange={(v) => setInputs({ monthlyNonHousingExpenses: v })}
            display={`$${fmt(inputs.monthlyNonHousingExpenses)}`}
          />
        </div>
      )}
    </div>
  )
}
