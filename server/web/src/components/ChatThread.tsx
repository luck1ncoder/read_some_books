import { useState, useRef, useEffect } from 'react'
import { BASE } from '../api'

interface Message { role: 'user' | 'assistant'; content: string }

export function ChatThread({ cardId, initialMessages }: { cardId: string; initialMessages: Message[] }) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [inputFocused, setInputFocused] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send() {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    const res = await fetch(`${BASE}/cards/${cardId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMsg }),
    })
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let content = ''
    setMessages(prev => [...prev, { role: 'assistant', content: '' }])

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of decoder.decode(value).split('\n')) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6)
        if (data === '[DONE]') { setLoading(false); break }
        try {
          const { delta } = JSON.parse(data)
          if (delta) {
            content += delta
            setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content }])
          }
        } catch {}
      }
    }
  }

  return (
    <div>
      {/* Messages */}
      <div style={{ maxHeight: 420, overflowY: 'auto', padding: '20px 20px 8px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#9aa3ab', fontSize: 13, padding: '20px 0 12px' }}>
            还没有对话，输入问题开始聊吧
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 18 }}>
            {/* Role label */}
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: '#9aa3ab', marginBottom: 6,
            }}>
              {m.role === 'user' ? '你' : 'AI'}
            </div>
            {/* Message body — no bubble, just text like Atelier editorial style */}
            <p style={{
              fontSize: 14, lineHeight: 1.75, color: '#2d3338',
              margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              paddingLeft: m.role === 'assistant' ? 12 : 0,
              borderLeft: m.role === 'assistant' ? '2px solid #d4d9de' : 'none',
            }}>
              {m.content || (loading && i === messages.length - 1
                ? <span style={{ color: '#9aa3ab', fontStyle: 'italic' }}>思考中...</span>
                : ''
              )}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        display: 'flex', gap: 8, padding: '12px 16px 16px',
        borderTop: '1px solid rgba(45,51,56,0.07)',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
          placeholder="问 AI 一个问题..."
          style={{
            flex: 1, padding: '9px 13px',
            borderRadius: 10,
            background: inputFocused ? '#ffffff' : '#f2f4f6',
            border: `1px solid ${inputFocused ? 'rgba(95,94,96,0.2)' : 'transparent'}`,
            fontSize: 13.5, outline: 'none', color: '#2d3338',
            fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          style={{
            padding: '9px 18px',
            background: loading || !input.trim()
              ? '#ebeef2'
              : 'linear-gradient(135deg, #5f5e60, #535254)',
            color: loading || !input.trim() ? '#9aa3ab' : '#ffffff',
            border: 'none', borderRadius: 10,
            fontSize: 13.5, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', fontWeight: 500,
            transition: 'all 0.15s',
          }}
        >
          发送
        </button>
      </div>
    </div>
  )
}
