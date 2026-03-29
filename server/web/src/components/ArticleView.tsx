import { useState, useEffect } from 'react'
import { getPageDetail, getHighlightMessages } from '../api'

interface Highlight {
  id: string
  text: string
  message_count: number
}

interface AnnotationPanelProps {
  highlight: Highlight
  open: boolean
}

function AnnotationPanel({ highlight, open }: AnnotationPanelProps) {
  const [messages, setMessages] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!open || loaded) return
    getHighlightMessages(highlight.id).then(data => {
      setMessages(Array.isArray(data) ? data : [])
      setLoaded(true)
    })
  }, [open, highlight.id, loaded])

  return (
    <div style={{
      width: open ? 300 : 0,
      overflow: 'hidden',
      flexShrink: 0,
      transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
      borderLeft: open ? '1px solid rgba(45,51,56,0.07)' : '1px solid transparent',
      background: '#f9f9fb',
    }}>
      <div style={{ width: 300, padding: '14px 16px', opacity: open ? 1 : 0, transition: 'opacity 0.18s 0.1s' }}>
        {highlight.message_count === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#9aa3ab', lineHeight: 1.6 }}>
              暂无批注<br />
              <span style={{ fontSize: 11, color: '#bcc1c6' }}>在扩展侧边栏中添加</span>
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9aa3ab', marginBottom: 12 }}>
              批注对话
            </div>
            {!loaded ? (
              <div style={{ height: 60, background: '#ebeef2', borderRadius: 8, animation: 'pulse 1.5s ease-in-out infinite' }} />
            ) : messages.length === 0 ? (
              <div style={{ fontSize: 12, color: '#bcc1c6' }}>暂无消息记录</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {messages.map((m: any) => (
                  <div key={m.id} style={{
                    background: m.role === 'assistant'
                      ? 'linear-gradient(135deg,#f0f4ff,#f5f0ff)'
                      : '#fff',
                    borderRadius: 8,
                    padding: '9px 11px',
                    fontSize: 12.5,
                    lineHeight: 1.6,
                    color: '#2d3338',
                    boxShadow: '0 1px 3px rgba(45,51,56,0.06)',
                    borderLeft: m.role === 'assistant' ? '2px solid #a78bfa' : 'none',
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: m.role === 'assistant' ? '#a78bfa' : '#9aa3ab', marginBottom: 4 }}>
                      {m.role === 'assistant' ? 'AI' : '我'}
                    </div>
                    {m.content}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// Split full_text into meaningful paragraphs, filtering blanks
function splitParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
}

// Find which highlight(s) appear in a paragraph (substring match)
function findHighlightsInParagraph(para: string, highlights: Highlight[]): Highlight[] {
  return highlights.filter(h => {
    // Use first 80 chars of highlight text for matching to handle truncation
    const needle = h.text.slice(0, 80).trim()
    return needle.length > 0 && para.includes(needle)
  })
}

// Render paragraph text with highlight spans injected
function HighlightedText({ text, highlights }: { text: string; highlights: Highlight[] }) {
  if (highlights.length === 0) {
    return <>{text}</>
  }

  // Build list of [start, end, highlightIdx] intervals
  interface Span { start: number; end: number; hl: Highlight }
  const spans: Span[] = []

  for (const hl of highlights) {
    const needle = hl.text.slice(0, 80).trim()
    const idx = text.indexOf(needle)
    if (idx !== -1) {
      // Try to find the full highlight text
      const fullIdx = text.indexOf(hl.text.slice(0, 200).trim())
      const start = fullIdx !== -1 ? fullIdx : idx
      const matchText = fullIdx !== -1 ? hl.text.slice(0, 200).trim() : needle
      const end = start + matchText.length
      spans.push({ start, end, hl })
    }
  }

  if (spans.length === 0) return <>{text}</>

  // Sort by start position
  spans.sort((a, b) => a.start - b.start)

  const parts: React.ReactNode[] = []
  let cursor = 0
  for (const span of spans) {
    if (span.start > cursor) {
      parts.push(<span key={`plain-${cursor}`}>{text.slice(cursor, span.start)}</span>)
    }
    const actualEnd = Math.max(span.end, span.start + 1)
    parts.push(
      <mark key={`hl-${span.start}`} style={{
        background: 'linear-gradient(120deg, rgba(251,211,62,0.45) 0%, rgba(251,211,62,0.3) 100%)',
        borderRadius: 2,
        padding: '1px 0',
        color: 'inherit',
      }}>
        {text.slice(span.start, actualEnd)}
      </mark>
    )
    cursor = actualEnd
  }
  if (cursor < text.length) {
    parts.push(<span key={`plain-end`}>{text.slice(cursor)}</span>)
  }

  return <>{parts}</>
}

interface ArticleViewProps {
  pageId: string
}

export function ArticleView({ pageId }: ArticleViewProps) {
  const [page, setPage] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [openHighlightId, setOpenHighlightId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setLoading(true)
    setOpenHighlightId(null)
    getPageDetail(pageId).then(data => {
      setPage(data)
      setLoading(false)
    })
  }, [pageId])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ height: 20, background: '#ebeef2', borderRadius: 4, width: `${60 + (i % 3) * 15}%` }} />
        ))}
      </div>
    )
  }

  if (!page) return null

  const highlights: Highlight[] = page.highlights ?? []
  const paragraphs = splitParagraphs(page.full_text ?? '')

  // Only show paragraphs that have at least one highlight, plus a few lines of context around them
  // Build a set of "important" paragraph indices
  const hlParaIndices = new Set<number>()
  const paraHighlightMap = new Map<number, Highlight[]>()

  for (let i = 0; i < paragraphs.length; i++) {
    const found = findHighlightsInParagraph(paragraphs[i], highlights)
    if (found.length > 0) {
      hlParaIndices.add(i)
      paraHighlightMap.set(i, found)
      // 1 line of context above and below
      if (i > 0) hlParaIndices.add(i - 1)
      if (i < paragraphs.length - 1) hlParaIndices.add(i + 1)
    }
  }

  // If no highlights matched (e.g., text mismatch), show all paragraphs
  const showAll = hlParaIndices.size === 0
  const indicesToShow = showAll
    ? paragraphs.map((_, i) => i)
    : Array.from(hlParaIndices).sort((a, b) => a - b)

  function handleLineClick(paraHighlights: Highlight[]) {
    if (paraHighlights.length === 0) return
    const firstId = paraHighlights[0].id
    setOpenHighlightId(prev => prev === firstId ? null : firstId)
  }

  // Render with ellipsis separators between non-consecutive lines
  const rows: React.ReactNode[] = []
  let prevIdx = -1

  for (const idx of indicesToShow) {
    // Gap separator
    if (prevIdx !== -1 && idx > prevIdx + 1) {
      rows.push(
        <div key={`sep-${idx}`} style={{
          display: 'flex',
          borderBottom: '1px solid rgba(45,51,56,0.05)',
        }}>
          <div style={{ width: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 0', color: '#d1d5db', fontSize: 11 }}>
            ···
          </div>
          <div style={{ flex: 1, padding: '6px 16px 6px 4px', fontSize: 12, color: '#d1d5db', fontStyle: 'italic' }}>
            {idx - prevIdx - 1} 段省略
          </div>
        </div>
      )
    }

    const para = paragraphs[idx]
    const paraHighlights = paraHighlightMap.get(idx) ?? []
    const hasHighlight = paraHighlights.length > 0
    const hasAnnotation = paraHighlights.some(h => h.message_count > 0)
    const firstHlId = paraHighlights[0]?.id ?? null
    const isOpen = firstHlId !== null && openHighlightId === firstHlId
    const openHl = paraHighlights.find(h => h.id === openHighlightId) ?? paraHighlights[0] ?? null

    rows.push(
      <div
        key={`para-${idx}`}
        style={{
          display: 'flex',
          borderBottom: '1px solid rgba(45,51,56,0.05)',
          background: isOpen ? 'rgba(167,139,250,0.04)' : 'transparent',
          cursor: hasHighlight ? 'pointer' : 'default',
          transition: 'background 0.12s',
        }}
        onClick={() => handleLineClick(paraHighlights)}
        onMouseEnter={e => { if (hasHighlight && !isOpen) (e.currentTarget as HTMLElement).style.background = hasAnnotation ? 'rgba(167,139,250,0.04)' : 'rgba(251,211,62,0.04)' }}
        onMouseLeave={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        {/* Gutter */}
        <div style={{ width: 36, flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 14 }}>
          {hasAnnotation ? (
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(167,139,250,0.8)', marginTop: 1 }} />
          ) : hasHighlight ? (
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(251,211,62,0.8)', marginTop: 1 }} />
          ) : (
            <span style={{ fontSize: 10, color: '#e2e4e9', fontVariantNumeric: 'tabular-nums' }}>{idx + 1}</span>
          )}
        </div>

        {/* Text */}
        <div style={{
          flex: 1,
          padding: '12px 16px 12px 4px',
          fontSize: 14,
          lineHeight: 1.75,
          color: hasHighlight ? '#2d3338' : '#bcc1c6',
          fontStyle: hasHighlight ? 'normal' : 'normal',
          minWidth: 0,
        }}>
          <HighlightedText text={para} highlights={paraHighlights} />
        </div>

        {/* Annotation panel */}
        {hasHighlight && openHl && (
          <AnnotationPanel highlight={openHl} open={isOpen} />
        )}
        {hasHighlight && !openHl && (
          <div style={{ width: 0, flexShrink: 0 }} />
        )}
      </div>
    )

    prevIdx = idx
  }

  const highlightCount = highlights.length
  const annotationCount = highlights.filter(h => h.message_count > 0).length

  return (
    <div>
      {/* Stats bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, fontSize: 12, color: '#9aa3ab' }}>
        <span>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'rgba(251,211,62,0.8)', marginRight: 5, verticalAlign: 'middle' }} />
          {highlightCount} 条划线
        </span>
        {annotationCount > 0 && (
          <span>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'rgba(167,139,250,0.8)', marginRight: 5, verticalAlign: 'middle' }} />
            {annotationCount} 条批注
          </span>
        )}
        <span style={{ color: '#d1d5db' }}>· 点击划线行展开批注</span>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, color: '#9aa3ab', background: 'none', border: 'none',
            cursor: 'pointer', padding: '3px 6px', borderRadius: 6,
            transition: 'color 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#596065')}
          onMouseLeave={e => (e.currentTarget.style.color = '#9aa3ab')}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {expanded
              ? <><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="10" y1="14" x2="21" y2="3"/><line x1="3" y1="21" x2="14" y2="10"/></>
              : <><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></>
            }
          </svg>
          {expanded ? '收起' : '展开'}
        </button>
      </div>

      {/* Article lines */}
      <div style={{ position: 'relative', background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(45,51,56,0.06)' }}>
        <div style={{ maxHeight: expanded ? 'none' : 520, overflowY: expanded ? 'visible' : 'auto', scrollbarWidth: 'thin', scrollbarColor: '#e2e4e9 transparent' }}>
          {rows}
        </div>
        {!expanded && (
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 48, background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.96))', pointerEvents: 'none' }} />
        )}
      </div>
    </div>
  )
}
