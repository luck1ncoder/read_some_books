import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCards, getHighlightMessages } from '../api'
import { MessageList, getDomain } from './shared'

// ── Annotation thread (lazy loaded per card) ─────────────────────────────────

function AnnotThread({ highlightId }: { highlightId: string }) {
  const [messages, setMessages] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    getHighlightMessages(highlightId).then(data => {
      setMessages(Array.isArray(data) ? data : [])
      setLoaded(true)
    })
  }, [highlightId])

  if (!loaded) {
    return <div style={{ height: 40, background: '#f5f0ff', borderRadius: 8, opacity: 0.5 }} />
  }

  if (messages.length === 0) return null

  return (
    <div style={{
      borderTop: '1px solid rgba(45,51,56,0.06)',
      paddingTop: 14, marginTop: 4,
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
        textTransform: 'uppercase' as const, color: '#a78bfa',
        marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#a78bfa', display: 'inline-block' }} />
        批注对话 · {messages.length} 条
      </div>
      <MessageList messages={messages} />
    </div>
  )
}

// ── Single essence card ──────────────────────────────────────────────────────

function EssenceCard({ card }: { card: any }) {
  const navigate = useNavigate()
  const tags: string[] = (() => { try { return JSON.parse(card.tags || '[]') } catch { return [] } })()
  const dateStr = new Date(card.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
  const hasThread = card.highlight_id

  return (
    <div style={{
      background: '#fff',
      borderRadius: 14,
      overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(45,51,56,0.06)',
      transition: 'box-shadow 0.2s, transform 0.15s',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 24px rgba(45,51,56,0.1)'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(45,51,56,0.06)'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
      }}
    >
      {/* Quote strip */}
      {card.highlight_text && (
        <div style={{
          position: 'relative',
          padding: '22px 26px 18px 26px',
          background: 'linear-gradient(135deg, #fdfcf8 0%, #f8f5ee 100%)',
          borderBottom: '1px solid rgba(45,51,56,0.04)',
        }}>
          <div style={{
            position: 'absolute', left: 14, top: 8,
            fontFamily: 'Georgia, serif',
            fontSize: 48, color: 'rgba(180,165,140,0.3)',
            lineHeight: 1,
          }}>"</div>
          <div style={{
            fontFamily: "'Georgia', 'Noto Serif SC', serif",
            fontSize: 15, lineHeight: 1.8,
            color: '#3d3628', fontStyle: 'italic',
          }}>
            {card.highlight_text}
          </div>
        </div>
      )}

      {/* Card body */}
      <div style={{ padding: '20px 26px' }}>
        {/* Title */}
        {card.title && (
          <div
            style={{
              fontSize: 14, fontWeight: 600, color: '#2d3338',
              marginBottom: 10, lineHeight: 1.45,
              cursor: 'pointer',
            }}
            onClick={() => navigate(`/cards/${card.id}`)}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#596065')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#2d3338')}
          >
            {card.title}
          </div>
        )}

        {/* Layer 1: AI explanation */}
        {card.ai_explanation && (
          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase' as const, color: '#b0a693',
              marginBottom: 5,
            }}>① 局部含义</div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: '#596065' }}>
              {card.ai_explanation}
            </div>
          </div>
        )}

        {/* Layer 2: Context interpretation */}
        {card.context_interpretation && (
          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.1em',
              textTransform: 'uppercase' as const, color: '#b0a693',
              marginBottom: 5,
            }}>② 上下文解读</div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: '#596065' }}>
              {card.context_interpretation}
            </div>
          </div>
        )}

        {/* Inferred intent */}
        {card.inferred_intent && (
          <div style={{
            display: 'inline-block',
            fontSize: 11.5, color: '#7a6e5e',
            background: 'rgba(180,165,140,0.12)',
            borderRadius: 6, padding: '5px 12px',
            marginBottom: 14, lineHeight: 1.5,
          }}>
            💡 {card.inferred_intent}
          </div>
        )}

        {/* User note */}
        {card.my_note && (
          <div style={{
            padding: '12px 14px',
            background: '#f9f9fb',
            borderRadius: 8,
            fontSize: 13, lineHeight: 1.65, color: '#3d3628',
            borderLeft: '2px solid #d4c9b0',
            marginBottom: 14,
          }}>
            <div style={{
              fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase' as const, color: '#b0a693',
              marginBottom: 4,
            }}>我的笔记</div>
            {card.my_note}
          </div>
        )}

        {/* Annotation thread — loaded from highlight_messages */}
        {hasThread && <AnnotThread highlightId={card.highlight_id} />}
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 26px 16px',
        fontSize: 11, color: '#bcc1c6',
      }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {tags.slice(0, 2).map(t => (
            <span key={t} style={{
              fontSize: 10, fontWeight: 500, letterSpacing: '0.06em',
              textTransform: 'uppercase' as const, color: '#596065',
              background: '#ebeef2', borderRadius: 4, padding: '2px 7px',
            }}>
              #{t}
            </span>
          ))}
          {tags.length === 0 && card.page_url && (
            <span style={{
              fontSize: 10, fontWeight: 500, letterSpacing: '0.06em',
              textTransform: 'uppercase' as const, color: '#596065',
              background: '#ebeef2', borderRadius: 4, padding: '2px 7px',
              maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {getDomain(card.page_url)}
            </span>
          )}
        </div>
        <span>{dateStr}</span>
      </div>
    </div>
  )
}

// ── CardFeedView: shows all cards for a given page URL ───────────────────────

export function CardFeedView({ pageUrl, pageTitle }: { pageUrl: string; pageTitle: string }) {
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getCards({ url: pageUrl }).then(data => {
      setCards(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [pageUrl])

  const domain = getDomain(pageUrl)

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 640 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{
            background: '#fff', borderRadius: 14, overflow: 'hidden',
            boxShadow: '0 1px 4px rgba(45,51,56,0.06)',
          }}>
            <div style={{ height: 80, background: 'linear-gradient(135deg, #fdfcf8, #f8f5ee)' }} />
            <div style={{ padding: 20 }}>
              <div style={{ height: 14, background: '#ebeef2', borderRadius: 4, width: '60%', marginBottom: 12 }} />
              <div style={{ height: 12, background: '#ebeef2', borderRadius: 4, width: '90%', marginBottom: 8 }} />
              <div style={{ height: 12, background: '#ebeef2', borderRadius: 4, width: '75%' }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div style={{
        background: '#fff', borderRadius: 14, padding: '48px 24px',
        textAlign: 'center', boxShadow: '0 1px 4px rgba(45,51,56,0.06)',
      }}>
        <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.3 }}>📋</div>
        <p style={{ fontSize: 14, color: '#7a6e5e', fontWeight: 500, margin: '0 0 4px' }}>暂无卡片</p>
        <p style={{ fontSize: 12, color: '#a09480', margin: 0 }}>在扩展中划线并生成 AI 解读后，卡片会出现在这里</p>
      </div>
    )
  }

  return (
    <div>
      {/* Page info bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        marginBottom: 20,
        padding: '12px 16px',
        background: 'rgba(255,254,249,0.7)',
        border: '1px solid rgba(180,165,140,0.15)',
        borderRadius: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#e8d5c0', letterSpacing: '0.04em',
          background: '#2F4F4F',
        }}>
          {domain.slice(0, 2)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 600, color: '#3d3628',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {pageTitle || domain}
          </div>
          <div style={{ fontSize: 11, color: '#b0a693' }}>{domain}</div>
        </div>
        <div style={{
          fontSize: 12, color: '#9aa3ab',
          padding: '3px 10px', background: '#f0ebe2', borderRadius: 6,
          flexShrink: 0,
        }}>
          {cards.length} 张卡片
        </div>
      </div>

      {/* Card feed */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>
        {cards.map(card => (
          <EssenceCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  )
}
