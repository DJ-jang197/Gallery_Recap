import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LibraryProvider } from './context/LibraryContext.jsx'

// Bootstraps React root with global library state provider.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LibraryProvider>
      <App />
    </LibraryProvider>
  </StrictMode>,
)

