interface Props {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
  display: string
  note?: string
}

export function Slider({ label, value, min, max, step, onChange, display, note }: Props) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-sm font-mono font-semibold text-white tabular-nums">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-1.5 accent-blue-500 cursor-pointer"
      />
      {note && <span className="block text-[11px] text-gray-500 -mt-0.5">{note}</span>}
    </label>
  )
}
