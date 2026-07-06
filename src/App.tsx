import { lazy, Suspense, useState } from 'react'
import RentVsBuyPage from './tabs/rent-vs-buy/RentVsBuyPage'

const BacktesterPage = lazy(() => import('./tabs/backtester/BacktesterPage'))

type Tab = 'rent-vs-buy' | 'backtester'

const TABS: { id: Tab; label: string }[] = [
  { id: 'backtester', label: 'Backtester' },
  { id: 'rent-vs-buy', label: 'Rent vs Buy' },
]

function initialTab(): Tab {
  const saved = localStorage.getItem('fin-tab')
  return saved === 'rent-vs-buy' ? 'rent-vs-buy' : 'backtester'
}

export default function App() {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const switchTab = (t: Tab) => {
    setTab(t)
    localStorage.setItem('fin-tab', t)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-4 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <h1 className="text-base font-semibold text-white py-3">Fin</h1>
          <nav className="flex gap-4">
            {TABS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => switchTab(id)}
                className={`text-sm py-3 border-b-2 -mb-px ${
                  tab === id
                    ? 'text-white border-blue-500'
                    : 'text-gray-400 border-transparent hover:text-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
        <button
          className="md:hidden text-xs text-gray-400 border border-gray-700 px-2 py-1 rounded"
          onClick={() => setDrawerOpen((o) => !o)}
        >
          {drawerOpen ? 'Close inputs' : 'Edit inputs'}
        </button>
      </header>

      {tab === 'rent-vs-buy' ? (
        <RentVsBuyPage drawerOpen={drawerOpen} />
      ) : (
        <Suspense fallback={<div className="p-6 text-gray-500 text-sm">Loading…</div>}>
          <BacktesterPage drawerOpen={drawerOpen} />
        </Suspense>
      )}
    </div>
  )
}
