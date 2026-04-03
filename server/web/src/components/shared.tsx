import React from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Highlight {
  id: string
  text: string
  message_count: number
}

// ── getDomain ─────────────────────────────────────────────────────────────────

export function getDomain(url: string): string {
  try { return new URL(url).hostname.replace('www.', '') } catch { return url }
}

// ── HighlightedText ───────────────────────────────────────────────────────────

export function findHighlightsInText(text: string, highlights: Highlight[], sliceLen = 100): Highlight[] {
  return highlights.filter(h => {
    const needle = h.text.slice(0, sliceLen).trim()
    return needle.length > 0 && text.includes(needle)
  })
}

interface HighlightedTextProps {
  text: string
  highlights: Highlight[]
  /** If provided, clicking a highlight calls this. Used in BookView. */
  onHighlightClick?: (h: Highlight) => void
  /** Which highlight is currently "open". Used in BookView. */
  openHighlightId?: string | null
  /** Whether to show annotated highlights in purple (BookView style) */
  showAnnotationColor?: boolean
}

export function HighlightedText({
  text,
  highlights,
  onHighlightClick,
  openHighlightId,
  showAnnotationColor = false,
}: HighlightedTextProps) {
  if (highlights.length === 0) return <>{text}</>

  interface Span { start: number; end: number; hl: Highlight }
  const spans: Span[] = []

  for (const hl of highlights) {
    const needle = hl.text.slice(0, 200).trim()
    const idx = text.indexOf(needle)
    if (idx !== -1) spans.push({ start: idx, end: idx + needle.length, hl })
  }
  if (spans.length === 0) return <>{text}</>
  spans.sort((a, b) => a.start - b.start)

  const parts: React.ReactNode[] = []
  let cursor = 0
  for (const span of spans) {
    if (span.start > cursor) parts.push(<span key={`t-${cursor}`}>{text.slice(cursor, span.start)}</span>)

    const isAnnotated = showAnnotationColor && span.hl.message_count > 0
    const isOpen = openHighlightId === span.hl.id

    const style: React.CSSProperties = showAnnotationColor
      ? {
          background: isAnnotated
            ? isOpen ? 'rgba(167,139,250,0.45)' : 'rgba(167,139,250,0.25)'
            : isOpen ? 'rgba(251,211,62,0.65)' : 'rgba(251,211,62,0.42)',
          borderRadius: 2, padding: '1px 0', cursor: 'pointer', color: 'inherit',
          transition: 'background 0.15s',
          borderBottom: isAnnotated ? '1.5px solid rgba(167,139,250,0.6)' : '1.5px solid rgba(251,180,0,0.5)',
        }
      : {
          background: 'linear-gradient(120deg, rgba(251,211,62,0.45) 0%, rgba(251,211,62,0.3) 100%)',
          borderRadius: 2, padding: '1px 0', color: 'inherit',
        }

    parts.push(
      <mark
        key={`hl-${span.start}`}
        onClick={onHighlightClick ? () => onHighlightClick(span.hl) : undefined}
        style={style}
      >
        {text.slice(span.start, span.end)}
      </mark>
    )
    cursor = span.end
  }
  if (cursor < text.length) parts.push(<span key="t-end">{text.slice(cursor)}</span>)
  return <>{parts}</>
}

// ── StatsBar ──────────────────────────────────────────────────────────────────

interface StatsBarProps {
  highlightCount: number
  annotationCount: number
  expanded: boolean
  onToggle: () => void
  /** Extra text after annotation count, e.g. "，点击高亮查看" */
  annotationSuffix?: string
  /** Extra element between annotation count and toggle button */
  extraNote?: React.ReactNode
}

export function StatsBar({ highlightCount, annotationCount, expanded, onToggle, annotationSuffix, extraNote }: StatsBarProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, fontSize: 12, color: '#9aa3ab' }}>
      <span>
        <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'rgba(251,211,62,0.7)', marginRight: 5, verticalAlign: 'middle' }} />
        {highlightCount} 条划线
      </span>
      {annotationCount > 0 && (
        <span>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'rgba(167,139,250,0.6)', marginRight: 5, verticalAlign: 'middle' }} />
          {annotationCount} 条批注{annotationSuffix ?? ''}
        </span>
      )}
      {extraNote}
      <button
        onClick={onToggle}
        style={{
          marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 11, color: '#9aa3ab', background: 'none', border: 'none',
          cursor: 'pointer', padding: '3px 6px', borderRadius: 6, transition: 'color 0.12s',
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
  )
}

// ── MessageList ────────────────────────────────────────────────────────────────

export function MessageList({ messages }: { messages: any[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {messages.map((m: any) => (
        <div key={m.id} style={{
          background: m.role === 'assistant' ? 'linear-gradient(135deg,#f0f4ff,#f5f0ff)' : '#f9f9fb',
          borderRadius: 8, padding: '8px 10px',
          borderLeft: m.role === 'assistant' ? '2px solid #a78bfa' : 'none',
          color: '#2d3338', fontSize: 12.5, lineHeight: 1.6,
        }}>
          <div style={{
            fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
            color: m.role === 'assistant' ? '#a78bfa' : '#9aa3ab', marginBottom: 3,
          }}>
            {m.role === 'assistant' ? 'AI' : '我'}
          </div>
          {m.content}
        </div>
      ))}
    </div>
  )
}

// ── Section label style ───────────────────────────────────────────────────────

export const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 500, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: '#9aa3ab',
}

// ── Tag badge style ───────────────────────────────────────────────────────────

export const tagBadgeStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 500, letterSpacing: '0.08em',
  textTransform: 'uppercase', color: '#596065',
  background: '#ebeef2', borderRadius: 4, padding: '2px 8px',
}
