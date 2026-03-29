import { useEffect, useState } from 'react'

export function Popup() {
  const [hlMode, setHlMode] = useState(false)
  const [tabId, setTabId] = useState<number | null>(null)
  const [bookState, setBookState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [bookError, setBookError] = useState('')

  // On mount: get current tab and read persisted mode state
  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0]
      if (!tab?.id) return
      setTabId(tab.id)
      // Read persisted mode from storage for this tab
      chrome.storage.session.get([`hlMode_${tab.id}`], (result) => {
        setHlMode(!!result[`hlMode_${tab.id}`])
      })
    })
  }, [])

  function toggleMode() {
    if (tabId === null) return
    const next = !hlMode
    setHlMode(next)
    // Persist to session storage
    chrome.storage.session.set({ [`hlMode_${tabId}`]: next })
    // Tell content script
    chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_HIGHLIGHT_MODE', active: next })
    // Close popup after a brief moment so user sees the animation
    setTimeout(() => window.close(), 180)
  }

  function saveAsBook() {
    if (tabId === null || bookState === 'saving') return
    setBookState('saving')
    setBookError('')
    chrome.tabs.sendMessage(tabId, { type: 'SAVE_AS_BOOK' }, (response) => {
      const err = chrome.runtime.lastError?.message
      if (err || !response?.ok) {
        const msg = err ?? response?.error ?? '未知错误'
        setBookError(msg)
        setBookState('error')
        setTimeout(() => { setBookState('idle'); setBookError('') }, 4000)
      } else {
        setBookState('done')
        setTimeout(() => window.close(), 900)
      }
    })
  }

  function openSidepanel() {
    if (tabId === null) return
    // Panel is always enabled (setPanelBehavior in background), open() directly.
    chrome.sidePanel.open({ tabId }).catch(() => {})
    window.close()
  }

  return (
    <div style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 20 }}>🎒</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e4e9', letterSpacing: '-0.2px' }}>知识书包</div>
          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 1 }}>网页划线知识库</div>
        </div>
      </div>

      {/* Highlight mode toggle button */}
      <button
        onClick={toggleMode}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px',
          background: hlMode ? 'linear-gradient(135deg,#4f3b8a,#6d3fa0)' : '#2a2a3e',
          border: `1.5px solid ${hlMode ? 'rgba(167,139,250,0.6)' : 'rgba(139,92,246,0.2)'}`,
          borderRadius: 10,
          cursor: 'pointer',
          marginBottom: 10,
          transition: 'all 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          boxShadow: hlMode ? '0 0 20px rgba(139,92,246,0.35), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Icon: morphs between bag and pen */}
        <div style={{ width: 32, height: 32, position: 'relative', flexShrink: 0 }}>
          {/* Bag icon */}
          <svg
            width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="#a78bfa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            style={{
              position: 'absolute', top: 6, left: 6,
              opacity: hlMode ? 0 : 1,
              transform: hlMode ? 'scale(0.3) rotate(30deg)' : 'scale(1) rotate(0deg)',
              transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
          {/* Pen icon */}
          <svg
            width="20" height="20" viewBox="0 0 24 24" fill="none"
            stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
            style={{
              position: 'absolute', top: 6, left: 6,
              opacity: hlMode ? 1 : 0,
              transform: hlMode ? 'scale(1) rotate(0deg)' : 'scale(0.3) rotate(-30deg)',
              transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            <path d="M12 19l7-7 3 3-7 7-3-3z"/>
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
            <path d="M2 2l7.586 7.586"/>
            <circle cx="11" cy="11" r="2"/>
          </svg>
        </div>

        {/* Text */}
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: hlMode ? '#e9d8fd' : '#c4c8d0', letterSpacing: '-0.1px' }}>
            {hlMode ? '划线模式进行中' : '开启划线模式'}
          </div>
          <div style={{ fontSize: 10.5, color: hlMode ? 'rgba(233,216,253,0.6)' : '#6b7280', marginTop: 1 }}>
            {hlMode ? '点击退出，光标恢复正常' : '光标变荧光笔，选中即保存'}
          </div>
        </div>

        {/* ON/OFF pill */}
        <div style={{
          fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          padding: '3px 7px', borderRadius: 20, flexShrink: 0,
          background: hlMode ? 'rgba(167,139,250,0.25)' : 'rgba(255,255,255,0.06)',
          color: hlMode ? '#c4b5fd' : '#6b7280',
          transition: 'all 0.2s',
        }}>
          {hlMode ? 'ON' : 'OFF'}
        </div>
      </button>

      {/* Save as book button */}
      <button
        onClick={saveAsBook}
        disabled={bookState === 'saving'}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          background: bookState === 'done' ? 'rgba(134,239,172,0.1)' : bookState === 'error' ? 'rgba(248,113,113,0.1)' : 'transparent',
          border: `1.5px solid ${bookState === 'done' ? 'rgba(134,239,172,0.4)' : bookState === 'error' ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.07)'}`,
          borderRadius: 10,
          cursor: bookState === 'saving' ? 'default' : 'pointer',
          marginBottom: 10,
          transition: 'all 0.2s',
          opacity: bookState === 'saving' ? 0.6 : 1,
        }}
        onMouseEnter={e => { if (bookState === 'idle') e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
        onMouseLeave={e => { if (bookState === 'idle') e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)' }}
      >
        <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {bookState === 'saving' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
              </path>
            </svg>
          ) : bookState === 'done' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#86efac" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>
            </svg>
          )}
        </div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: bookState === 'done' ? '#86efac' : bookState === 'error' ? '#f87171' : '#9ca3af', letterSpacing: '-0.1px' }}>
            {bookState === 'saving' ? '提取中...' : bookState === 'done' ? '已存为书页' : bookState === 'error' ? '提取失败，重试' : '存为书页'}
          </div>
          <div style={{ fontSize: 10.5, color: '#4b5563', marginTop: 1 }}>
            {bookState === 'idle' ? '提取页面结构到知识库' : bookState === 'done' ? '在知识库按来源查看' : ''}
          </div>
        </div>
      </button>

      {/* Book error detail */}
      {bookState === 'error' && bookError && (
        <div style={{ fontSize: 10, color: '#f87171', marginBottom: 8, padding: '4px 8px', background: 'rgba(248,113,113,0.08)', borderRadius: 6, wordBreak: 'break-all' }}>
          {bookError}
        </div>
      )}

      {/* Sidepanel button */}
      <button
        onClick={openSidepanel}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px',
          background: 'transparent',
          border: '1.5px solid rgba(255,255,255,0.07)',
          borderRadius: 10,
          cursor: 'pointer',
          marginBottom: 14,
          transition: 'border-color 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
      >
        <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        </div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 12.5, fontWeight: 500, color: '#9ca3af', letterSpacing: '-0.1px' }}>打开批注侧边栏</div>
          <div style={{ fontSize: 10.5, color: '#4b5563', marginTop: 1 }}>查看当前页面的划线</div>
        </div>
      </button>

      {/* Footer: link to web UI */}
      <div style={{ textAlign: 'center' }}>
        <a
          href="http://localhost:7749"
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 11, color: '#4b5563', textDecoration: 'none' }}
          onMouseEnter={e => ((e.target as HTMLElement).style.color = '#6b7280')}
          onMouseLeave={e => ((e.target as HTMLElement).style.color = '#4b5563')}
        >
          打开知识库 →
        </a>
      </div>
    </div>
  )
}
