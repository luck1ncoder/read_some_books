import { useEffect, useState } from 'react'
import { StatusBanner } from './components/StatusBanner'
import { HighlightList } from './components/HighlightList'

const SERVER = 'http://localhost:7749'

export function App() {
  const [online, setOnline] = useState(true)
  const [highlights, setHighlights] = useState<any[]>([])
  const [currentUrl, setCurrentUrl] = useState('')
  const [pageTitle, setPageTitle] = useState('')
  const [focusHighlightId, setFocusHighlightId] = useState<string | null>(null)

  function loadHighlights(url: string) {
    fetch(`${SERVER}/highlights?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(data => { setHighlights(data); setOnline(true) })
      .catch(() => setOnline(false))
  }

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs[0]?.url ?? ''
      const title = tabs[0]?.title ?? ''
      setCurrentUrl(url)
      setPageTitle(title)
      loadHighlights(url)
    })

    // Background sends FOCUS_HIGHLIGHT after opening the sidepanel and saving the highlight.
    // Poll the highlights list until the new highlight appears, then focus it.
    const listener = (message: any) => {
      if (message.type !== 'FOCUS_HIGHLIGHT' || !message.highlightId) return
      const targetId = message.highlightId
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0]?.url ?? ''
        if (!url) return
        let attempts = 0
        const tryLoad = () => {
          fetch(`${SERVER}/highlights?url=${encodeURIComponent(url)}`)
            .then(r => r.json())
            .then((data: any[]) => {
              setHighlights(data)
              setOnline(true)
              if (data.some((h: any) => h.id === targetId)) {
                setFocusHighlightId(targetId)
              } else if (attempts < 10) {
                attempts++
                setTimeout(tryLoad, 300)
              }
            })
            .catch(() => setOnline(false))
        }
        tryLoad()
      })
    }
    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [])

  const domain = currentUrl ? (() => { try { return new URL(currentUrl).hostname.replace('www.', '') } catch { return '' } })() : ''

  return (
    <div style={{ minHeight: '100vh', background: '#f2f4f6', display: 'flex', flexDirection: 'column' }}>
      <StatusBanner online={online} />

      {/* Header */}
      <div style={{
        padding: '16px 14px 14px',
        background: '#fff',
        boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: domain ? 12 : 0 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 8,
            background: '#111827',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <span style={{ fontSize: 15, fontWeight: 800, color: '#111827', letterSpacing: '-0.4px' }}>当前页面划线</span>
        </div>

        {domain && (
          <div style={{
            padding: '8px 12px',
            background: '#f3f4f6',
            borderRadius: 10,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 2 }}>{domain}</div>
            <div style={{
              fontSize: 12, color: '#9ca3af',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {pageTitle || currentUrl}
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 72, padding: '12px 12px 72px' }}>
        <HighlightList highlights={highlights} focusId={focusHighlightId} />
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 14px 16px',
        background: '#fff',
        borderTop: '1px solid rgba(0,0,0,0.06)',
        position: 'fixed', bottom: 0, width: '100%',
        boxSizing: 'border-box',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
      }}>
        <button
          onClick={() => chrome.tabs.create({ url: SERVER })}
          style={{
            width: '100%', padding: '10px 0',
            background: '#111827',
            color: '#fff', border: 'none', borderRadius: 10,
            fontSize: 14, cursor: 'pointer', fontWeight: 700,
            fontFamily: 'inherit', letterSpacing: '-0.2px',
          }}
        >
          打开知识库
        </button>
      </div>
    </div>
  )
}
