import { useState, useRef } from 'react'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
}

export function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  return (
    <div className="relative inline-flex" ref={ref}>
      <div
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
        className=""
      >
        {children}
      </div>
      {visible && (
        <div className="absolute z-50 top-full right-0 mt-2 w-64 rounded-lg bg-gray-900 text-white text-xs p-3 shadow-xl pointer-events-none">
          <div className="absolute bottom-full right-4 border-4 border-transparent border-b-gray-900" />
          {content}
        </div>
      )}
    </div>
  )
}

interface StatusDotProps {
  value: number
  thresholds: { green: [number, number]; yellow: [number, number] }
  labels: { green: string; yellow: string; red: string }
}

export function StatusIndicator({ value, thresholds, labels }: StatusDotProps) {
  const isGreen = value >= thresholds.green[0] && value <= thresholds.green[1]
  const isYellow = !isGreen && value >= thresholds.yellow[0] && value <= thresholds.yellow[1]
  const color = isGreen ? 'bg-green-500' : isYellow ? 'bg-yellow-400' : 'bg-red-500'
  const label = isGreen ? labels.green : isYellow ? labels.yellow : labels.red

  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
      <span className="text-xs text-gray-500">{label}</span>
    </span>
  )
}
