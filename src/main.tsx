import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initDb } from './db/client'
import { startSyncWatcher } from './lib/sync'
import { PinGate } from './components/PinGate'

const root = createRoot(document.getElementById('root')!)

initDb()
  .then(() => {
    startSyncWatcher()
    root.render(
      <StrictMode>
        <PinGate>
          <App />
        </PinGate>
      </StrictMode>,
    )
  })
  .catch((err) => {
    console.error('Failed to initialize local database', err)
    root.render(<div style={{ padding: 24 }}>Failed to start local database: {String(err)}</div>)
  })
