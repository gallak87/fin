import { useStore } from '../store'
import type { EquitySource } from '../types'

export function EquitySourceList() {
  const { inputs, setInputs } = useStore()

  function updateSource(id: string, patch: Partial<EquitySource>) {
    setInputs({
      equitySources: inputs.equitySources.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      ),
    })
  }

  function addSource() {
    setInputs({
      equitySources: [
        ...inputs.equitySources,
        { id: crypto.randomUUID(), name: 'New Property', amount: 0, include: false },
      ],
    })
  }

  function removeSource(id: string) {
    setInputs({ equitySources: inputs.equitySources.filter((s) => s.id !== id) })
  }

  return (
    <div className="space-y-2">
      {inputs.equitySources.map((source) => (
        <div key={source.id} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={source.include}
            onChange={(e) => updateSource(source.id, { include: e.target.checked })}
            className="w-4 h-4 accent-blue-600 shrink-0"
          />
          <input
            type="text"
            value={source.name}
            onChange={(e) => updateSource(source.id, { name: e.target.value })}
            className="flex-1 min-w-0 text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
          />
          <input
            type="number"
            value={source.amount}
            onChange={(e) => updateSource(source.id, { amount: Number(e.target.value) })}
            className="w-24 text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
          />
          <button
            onClick={() => removeSource(source.id)}
            className="text-gray-500 hover:text-red-400 text-xs shrink-0"
            title="Remove"
          >
            ×
          </button>
        </div>
      ))}
      <button
        onClick={addSource}
        className="text-xs text-blue-400 hover:text-blue-300 mt-1"
      >
        + Add equity source
      </button>
    </div>
  )
}
