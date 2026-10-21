import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Nachgeladene Datei fehlt (alter Tab nach einem Deploy) → Seite neu laden.
// Höchstens einmal pro Minute, sonst Endlosschleife, falls die Datei wirklich fehlt.
const PRELOAD_RELOAD_KEY = 'mds-preload-reload'
window.addEventListener('vite:preloadError', (event) => {
  try {
    const last = Number(sessionStorage.getItem(PRELOAD_RELOAD_KEY)) || 0
    if (Date.now() - last < 60 * 1000) return // Fehler normal weiterwerfen
    sessionStorage.setItem(PRELOAD_RELOAD_KEY, String(Date.now()))
  } catch {
    return // ohne Storage keine Sperre gegen Endlosschleife → nicht neu laden
  }
  event.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
