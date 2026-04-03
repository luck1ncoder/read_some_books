import { useState, useEffect, useRef } from 'react'

const SERVER = 'http://localhost:7749'

// ── Design tokens (Atelier light, matching Web UI) ──
const C = {
  bg: '#ffffff',
  bgSubtle: '#f2f4f6',
  bgHover: '#f9f9fb',
  border: 'rgba(45,51,56,0.08)',
  borderFocus: 'rgba(95,94,96,0.25)',
  text: '#2d3338',
  textSecondary: '#596065',
  textMuted: '#9aa3ab',
  accent: '#5f5e60',
  accentBg: '#ebeef2',
  yellow: 'rgba(234,179,8,0.85)',
  userBubble: '#2d3338',
  userBubbleText: '#ffffff',
  aiBubble: '#f2f4f6',
  aiBubbleText: '#2d3338',
  btnPrimary: 'linear-gradient(135deg, #5f5e60, #535254)',
  btnPrimaryText: '#ffffff',
  shadow: '0 1px 3px rgba(45,51,56,0.06)',
  shadowMd: '0 2px 8px rgba(45,51,56,0.08)',
}

interface Highlight {
  id: string
  text: string
  color: string
  created_at: number
  message_count: number
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: number
}

function AnnotationThread({ highlight, autoFocus }: { highlight: Highlight; autoFocus: boolean }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streaming, setStreaming] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`${SERVER}/highlights/${highlight.id}/messages`)
      .then(r => r.json())
      .then(setMessages)
      .catch(() => {})
  }, [highlight.id])

  useEffect(() => {
    if (autoFocus) setTimeout(() => inputRef.current?.focus(), 120)
  }, [autoFocus])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streaming])

  async function handleSave() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setLoading(true)
    try {
      await fetch(`${SERVER}/highlights/${highlight.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      setMessages(prev => [...prev, {
        id: Date.now().toString(), role: 'user', content: text, created_at: Date.now(),
      }])
    } catch {}
    setLoading(false)
  }

  async function handleAI() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setLoading(true)
    setMessages(prev => [...prev, {
      id: Date.now().toString(), role: 'user', content: text, created_at: Date.now(),
    }])
    setStreaming('')

    try {
      const res = await fetch(`${SERVER}/highlights/${highlight.id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })
      const reader = res.body!.getReader()
      const dec = new TextDecoder()
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of dec.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6)
          if (d === '[DONE]') break
          try {
            const { delta } = JSON.parse(d)
            if (delta) { full += delta; setStreaming(full) }
          } catch {}
        }
      }
      if (full) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(), role: 'assistant', content: full, created_at: Date.now(),
        }])
      }
      setStreaming('')
    } catch {}
    setLoading(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAI() }
  }

  const canSend = input.trim().length > 0 && !loading

  return (
    <div style={{ paddingTop: 12 }}>

      {/* Message history */}
      {(messages.length > 0 || streaming) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {messages.map(msg => (
            <div key={msg.id} style={{
              display: 'flex',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            }}>
              <div style={{
                maxWidth: '86%',
                padding: '8px 12px',
                borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '2px 12px 12px 12px',
                background: msg.role === 'user' ? C.userBubble : C.aiBubble,
                color: msg.role === 'user' ? C.userBubbleText : C.aiBubbleText,
                fontSize: 12.5,
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                boxShadow: C.shadow,
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {/* Streaming AI bubble */}
          {streaming && (
            <div style={{ display: 'flex', flexDirection: 'row' }}>
              <div style={{
                maxWidth: '86%',
                padding: '8px 12px',
                borderRadius: '2px 12px 12px 12px',
                background: C.aiBubble,
                color: C.aiBubbleText,
                fontSize: 12.5,
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                boxShadow: C.shadow,
              }}>
                {streaming}
                <span style={{ opacity: 0.4, fontSize: 11 }}> ▌</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Empty hint */}
      {messages.length === 0 && !streaming && (
        <p style={{ fontSize: 11.5, color: C.textMuted, margin: '0 0 10px', fontStyle: 'italic', lineHeight: 1.5 }}>
          写下你的想法，Enter 发给 AI，或点「保存」只记录
        </p>
      )}

      {/* Input */}
      <textarea
        ref={inputRef}
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="写下批注..."
        rows={2}
        style={{
          width: '100%', boxSizing: 'border-box',
          background: C.bgSubtle,
          border: `1px solid ${C.border}`,
          borderRadius: 8,
          color: C.text,
          fontSize: 12.5,
          padding: '8px 10px',
          resize: 'none',
          fontFamily: 'inherit',
          outline: 'none',
          lineHeight: 1.65,
          transition: 'border-color 0.15s, background 0.15s',
        }}
        onFocus={e => {
          e.target.style.borderColor = C.borderFocus
          e.target.style.background = C.bg
        }}
        onBlur={e => {
          e.target.style.borderColor = C.border
          e.target.style.background = C.bgSubtle
        }}
      />

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
        <button
          onClick={handleSave}
          disabled={!canSend}
          style={{
            flex: 1,
            padding: '7px 0',
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 7,
            color: canSend ? C.textSecondary : C.textMuted,
            fontSize: 12,
            cursor: canSend ? 'pointer' : 'default',
            fontFamily: 'inherit',
            fontWeight: 500,
            transition: 'all 0.12s',
          }}
          onMouseEnter={e => { if (canSend) (e.currentTarget.style.borderColor = 'rgba(45,51,56,0.2)') }}
          onMouseLeave={e => { (e.currentTarget.style.borderColor = C.border) }}
        >
          保存
        </button>
        <button
          onClick={handleAI}
          disabled={!canSend}
          style={{
            flex: 2,
            padding: '7px 0',
            background: canSend ? C.btnPrimary : C.bgSubtle,
            border: 'none',
            borderRadius: 7,
            color: canSend ? C.btnPrimaryText : C.textMuted,
            fontSize: 12,
            cursor: canSend ? 'pointer' : 'default',
            fontFamily: 'inherit',
            fontWeight: 600,
            letterSpacing: '0.01em',
            transition: 'all 0.12s',
            boxShadow: canSend ? '0 1px 4px rgba(45,51,56,0.18)' : 'none',
          }}
        >
          {loading ? '思考中...' : 'AI 回应'}
        </button>
      </div>
    </div>
  )
}

export function HighlightList({ highlights, focusId }: { highlights: Highlight[]; focusId?: string | null }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (focusId) setExpandedId(focusId)
  }, [focusId])

  if (highlights.length === 0) {
    return (
      <div style={{ padding: '48px 8px', textAlign: 'center' }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: C.bgSubtle,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </div>
        <p style={{ color: C.text, fontSize: 13.5, fontWeight: 600, margin: '0 0 4px' }}>当前页面暂无划线</p>
        <p style={{ color: C.textMuted, fontSize: 12, margin: 0 }}>选中文字后点击工具栏保存</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {highlights.map(hl => {
        const isOpen = expandedId === hl.id
        return (
          <div
            key={hl.id}
            style={{
              background: C.bg,
              borderRadius: 12,
              border: `1px solid ${isOpen ? 'rgba(95,94,96,0.18)' : C.border}`,
              boxShadow: isOpen ? C.shadowMd : C.shadow,
              overflow: 'hidden',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
          >
            {/* Header */}
            <div
              onClick={() => setExpandedId(isOpen ? null : hl.id)}
              style={{
                padding: '11px 13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 9,
                userSelect: 'none',
              }}
            >
              {/* Yellow left bar */}
              <div style={{
                width: 3, borderRadius: 2, flexShrink: 0,
                background: C.yellow,
                alignSelf: 'stretch', minHeight: 18,
              }} />

              {/* Highlight text */}
              <p style={{
                flex: 1,
                fontSize: 12.5,
                lineHeight: 1.65,
                color: C.text,
                margin: 0,
                display: '-webkit-box',
                WebkitLineClamp: isOpen ? undefined : 2,
                WebkitBoxOrient: 'vertical' as any,
                overflow: isOpen ? 'visible' : 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {hl.text}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                {/* Badge */}
                {hl.message_count > 0 && !isOpen && (
                  <span style={{
                    fontSize: 10, fontWeight: 600,
                    background: C.accentBg,
                    color: C.accent,
                    borderRadius: 10,
                    padding: '1px 6px',
                    minWidth: 16,
                    textAlign: 'center',
                  }}>
                    {hl.message_count}
                  </span>
                )}
                {/* Chevron */}
                <svg
                  width="11" height="11" viewBox="0 0 24 24" fill="none"
                  stroke={C.textMuted} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{
                    transition: 'transform 0.18s',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    flexShrink: 0,
                  }}
                >
                  <path d="m6 9 6 6 6-6"/>
                </svg>
              </div>
            </div>

            {/* Annotation thread */}
            {isOpen && (
              <div style={{
                padding: '0 13px 13px',
                borderTop: `1px solid ${C.border}`,
              }}>
                <AnnotationThread highlight={hl} autoFocus={focusId === hl.id} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
