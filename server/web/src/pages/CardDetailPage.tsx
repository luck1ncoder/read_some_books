import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getCard, updateCard, exportCardUrl } from '../api'
import { ChatThread } from '../components/ChatThread'

export function CardDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [card, setCard] = useState<any>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)
  const intentRef = useRef<HTMLTextAreaElement>(null)
  const [noteFocused, setNoteFocused] = useState(false)
  const [intentFocused, setIntentFocused] = useState(false)

  useEffect(() => { if (id) getCard(id).then(setCard) }, [id])

  if (!card) return (
    <div style={{ padding: 60, textAlign: 'center', color: '#9aa3ab', fontSize: 13 }}>加载中...</div>
  )

  const tags: string[] = JSON.parse(card.tags || '[]')
  const domain = card.page_url ? (() => { try { return new URL(card.page_url).hostname.replace('www.', '') } catch { return card.page_url } })() : ''
  const dateStr = new Date(card.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    /* Three-column layout: narrow left gutter | main content (max 680) | right rail */
    <div style={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── Main content ── */}
      <div style={{ flex: 1, maxWidth: 720, margin: '0 auto', padding: '48px 40px 100px' }}>

        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            fontSize: 12.5, color: '#9aa3ab', background: 'none', border: 'none',
            cursor: 'pointer', padding: '0 0 28px', fontFamily: 'inherit',
            transition: 'color 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#2d3338')}
          onMouseLeave={e => (e.currentTarget.style.color = '#9aa3ab')}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5"/><path d="m12 5-7 7 7 7"/>
          </svg>
          返回
        </button>

        {/* Tag + date overline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          {tags.slice(0, 2).map(t => (
            <span key={t} style={{
              fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: '#596065', background: '#ebeef2', borderRadius: 4, padding: '2px 8px',
            }}>#{t}</span>
          ))}
          {domain && !tags.length && (
            <span style={{
              fontSize: 10, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase',
              color: '#596065', background: '#ebeef2', borderRadius: 4, padding: '2px 8px',
            }}>{domain}</span>
          )}
          <span style={{ fontSize: 11.5, color: '#9aa3ab', marginLeft: tags.length || domain ? 4 : 0 }}>· {dateStr}</span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 32, fontWeight: 600, color: '#2d3338',
          lineHeight: 1.25, letterSpacing: '-0.6px', margin: '0 0 20px',
        }}>
          {card.title || '无标题'}
        </h1>

        {/* Source link */}
        {card.page_url && (
          <a href={card.page_url} target="_blank" rel="noreferrer" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12.5, color: '#596065', textDecoration: 'none',
            marginBottom: 36, fontStyle: 'normal',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#2d3338')}
          onMouseLeave={e => (e.currentTarget.style.color = '#596065')}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            {card.page_title || domain}
          </a>
        )}

        {/* Highlighted quote — Atelier blockquote style */}
        {card.highlight_text && (
          <blockquote style={{
            margin: '0 0 36px',
            padding: '16px 20px',
            borderLeft: '3px solid #d4d9de',
            background: 'transparent',
            fontSize: 15, color: '#596065', lineHeight: 1.75, fontStyle: 'italic',
          }}>
            "{card.highlight_text}"
          </blockquote>
        )}

        {/* ── Layer ①: Local Meaning (AI 解释) ── */}
        {card.ai_explanation && (
          <section style={{ marginBottom: 32 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: 6,
                background: 'linear-gradient(135deg, #ebeef2, #d4d9de)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <span style={{ fontSize: 10, color: '#596065', fontWeight: 700 }}>①</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9aa3ab' }}>
                局部含义
              </div>
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.75, color: '#2d3338', margin: 0 }}>{card.ai_explanation}</p>
          </section>
        )}

        {/* ── Layer ②: Context Interpretation ── */}
        {card.context_interpretation && (
          <section style={{ marginBottom: 32 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: 6,
                background: 'linear-gradient(135deg, #5f5e60, #535254)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <span style={{ fontSize: 10, color: '#fff', fontWeight: 700 }}>②</span>
              </div>
              <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9aa3ab' }}>
                上下文解读
              </div>
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.75, color: '#2d3338', margin: 0 }}>{card.context_interpretation}</p>
          </section>
        )}

        {/* ── Inferred Intent (editable) ── */}
        <section style={{ marginBottom: 36 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14,
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: 6,
              background: 'rgba(245, 196, 64, 0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#b08a1e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9aa3ab' }}>
              划线意图
            </div>
            <span style={{ fontSize: 11, color: '#c8cbd0', marginLeft: 2 }}>（可编辑）</span>
          </div>
          <div style={{
            background: '#ffffff', borderRadius: 10,
            border: `1px solid ${intentFocused ? 'rgba(95,94,96,0.25)' : 'rgba(45,51,56,0.08)'}`,
            padding: '14px 16px',
            transition: 'border-color 0.15s',
          }}>
            <textarea
              ref={intentRef}
              defaultValue={card.inferred_intent}
              onFocus={() => setIntentFocused(true)}
              onBlur={async () => {
                setIntentFocused(false)
                await updateCard(card.id, { inferred_intent: intentRef.current?.value ?? '' })
              }}
              placeholder="AI 推断的划线意图..."
              style={{
                width: '100%', minHeight: 56, padding: 0,
                border: 'none', outline: 'none',
                fontSize: 14, lineHeight: 1.7, color: '#596065',
                resize: 'vertical', fontFamily: 'inherit', background: 'transparent',
                fontStyle: 'italic',
              }}
            />
          </div>
        </section>

        {/* Divider */}
        <div style={{ height: 1, background: 'transparent', margin: '0 0 36px', borderTop: '1px solid rgba(45,51,56,0.08)' }} />

        {/* My Note */}
        <section style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9aa3ab', marginBottom: 14 }}>
            我的看法
          </div>
          <div style={{
            background: '#ffffff', borderRadius: 10,
            border: `1px solid ${noteFocused ? 'rgba(95,94,96,0.25)' : 'rgba(45,51,56,0.08)'}`,
            padding: '14px 16px',
            transition: 'border-color 0.15s',
          }}>
            <textarea
              ref={noteRef}
              defaultValue={card.my_note}
              onFocus={() => setNoteFocused(true)}
              onBlur={async () => {
                setNoteFocused(false)
                await updateCard(card.id, { my_note: noteRef.current?.value ?? '' })
              }}
              placeholder="记录你的想法..."
              style={{
                width: '100%', minHeight: 88, padding: 0,
                border: 'none', outline: 'none',
                fontSize: 15, lineHeight: 1.7, color: '#2d3338',
                resize: 'vertical', fontFamily: 'inherit', background: 'transparent',
              }}
            />
          </div>
        </section>

        {/* Export */}
        <div style={{ marginBottom: 40 }}>
          <a
            href={exportCardUrl(card.id)} download
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 13, color: '#596065', textDecoration: 'none',
              padding: '7px 14px', borderRadius: 8,
              border: '1px solid rgba(45,51,56,0.15)', background: '#ffffff',
              transition: 'all 0.12s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#2d3338'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(45,51,56,0.35)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#596065'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(45,51,56,0.15)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            导出为 Markdown
          </a>
        </div>

        {/* AI Chat */}
        <section>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9aa3ab', marginBottom: 16 }}>
            继续问 AI
          </div>
          <div style={{ background: '#ffffff', borderRadius: 12, border: '1px solid rgba(45,51,56,0.08)', overflow: 'hidden' }}>
            <ChatThread cardId={card.id} initialMessages={card.chat_messages} />
          </div>
        </section>
      </div>

      {/* ── Right rail ── */}
      <div style={{ width: 220, flexShrink: 0, padding: '80px 24px 40px 8px' }}>
        {/* Source info */}
        {domain && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9aa3ab', marginBottom: 10 }}>
              来源
            </div>
            <a href={card.page_url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: '#596065', textDecoration: 'none', display: 'block', lineHeight: 1.5 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#2d3338')}
              onMouseLeave={e => (e.currentTarget.style.color = '#596065')}
            >
              {domain}
            </a>
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9aa3ab', marginBottom: 10 }}>
              标签
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {tags.map(t => (
                <span key={t} style={{
                  fontSize: 11, color: '#596065', background: '#ebeef2',
                  borderRadius: 5, padding: '3px 8px', fontWeight: 500,
                }}>#{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
