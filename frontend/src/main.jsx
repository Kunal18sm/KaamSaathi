import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Service workers must not control Vite's development modules. In development
// they can cache/intercept /@vite/client and cause a blank screen; enable PWA
// behavior only in a production build.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => console.log('[SevaSetu PWA] Service Worker registered:', reg.scope))
      .catch((err) => console.warn('[SevaSetu PWA] Service Worker registration failed:', err));
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
