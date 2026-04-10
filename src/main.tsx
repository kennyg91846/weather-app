import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/weather-app/sw.js').then((registration) => {
      // If a new SW is already waiting when the page loads, notify the UI.
      if (registration.waiting) {
        window.dispatchEvent(new Event('swUpdateAvailable'))
      }

      // A new SW was found and is installing; watch for it to reach 'installed'.
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (!newWorker) return
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            window.dispatchEvent(new Event('swUpdateAvailable'))
          }
        })
      })
    })
  })
}
