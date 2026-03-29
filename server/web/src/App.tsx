import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Sidebar } from './components/Sidebar'
import { LibraryPage } from './pages/LibraryPage'
import { CardDetailPage } from './pages/CardDetailPage'
import { SettingsPage } from './pages/SettingsPage'

export function App() {
  return (
    <BrowserRouter>
      {/* surface_container_low as page bg — no border between sidebar and main */}
      <div style={{ display: 'flex', minHeight: '100vh', background: '#f2f4f6' }}>
        <Sidebar />
        {/* surface (#f9f9fb) for main content area — tonal difference creates the boundary */}
        <main style={{ flex: 1, overflow: 'auto', background: '#f9f9fb' }}>
          <Routes>
            <Route path="/" element={<LibraryPage />} />
            <Route path="/cards/:id" element={<CardDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
