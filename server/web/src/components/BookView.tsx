import { useState, useEffect, useRef } from 'react'
import { getPageDetail, getHighlightMessages } from '../api'

interface DocNode {
  type: 'h1' | 'h2' | 'h3' | 'p' | 'blockquote' | 'img' | 'li'
  text?: string
  src?: string
  alt?: string
}

interface Highlight {
  id: string
  text: string
  message_count: number
}

// Find which highlight(s) appear in a text string
function findHighlightsInText(text: string, highlights: Highlight[]): Highlight[] {
  return highlights.filter(h => {
    const needle = h.text.slice(0, 100).trim()
    return needle.length > 0 && text.includes(needle)
  })
}

// Render text with highlight <mark> spans injected inline
function HighlightedText({
  text,
  highlights,
  onHighlightClick,
  openHighlightId,
}: {
  text: string
  highlights: Highlight[]
  onHighlightClick: (h: Highlight) => void
  openHighlightId: string | null
}) {
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
    const isAnnotated = span.hl.message_count > 0
    const isOpen = openHighlightId === span.hl.id
    parts.push(
      <mark
        key={`hl-${span.start}`}
        onClick={() => onHighlightClick(span.hl)}
        style={{
          background: isAnnotated
            ? isOpen ? 'rgba(167,139,250,0.45)' : 'rgba(167,139,250,0.25)'
            : isOpen ? 'rgba(251,211,62,0.65)' : 'rgba(251,211,62,0.42)',
          borderRadius: 2,
          padding: '1px 0',
          cursor: 'pointer',
          color: 'inherit',
          transition: 'background 0.15s',
          borderBottom: isAnnotated ? '1.5px solid rgba(167,139,250,0.6)' : '1.5px solid rgba(251,180,0,0.5)',
        }}
      >
        {text.slice(span.start, span.end)}
      </mark>
    )
    cursor = span.end
  }
  if (cursor < text.length) parts.push(<span key="t-end">{text.slice(cursor)}</span>)
  return <>{parts}</>
}

// Annotation popover panel
function AnnotPopover({ highlight, onClose }: { highlight: Highlight; onClose: () => void }) {
  const [messages, setMessages] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getHighlightMessages(highlight.id).then(data => {
      setMessages(Array.isArray(data) ? data : [])
      setLoaded(true)
    })
  }, [highlight.id])

  // Click outside to close
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    setTimeout(() => document.addEventListener('mousedown', handle), 50)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  return (
    <div ref={ref} style={{
      position: 'absolute',
      left: '50%', top: 'calc(100% + 12px)',
      transform: 'translateX(-50%)',
      width: 300,
      background: '#fff',
      borderRadius: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
      padding: 16,
      zIndex: 100,
      fontSize: 12.5,
      lineHeight: 1.6,
    }}>
      {/* Arrow */}
      <div style={{
        position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
        borderWidth: 7, borderStyle: 'solid', borderColor: 'transparent transparent #fff transparent',
      }} />
      {/* Close */}
      <button onClick={onClose} style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#9aa3ab', fontSize: 14, lineHeight: 1 }}>×</button>

      {highlight.message_count === 0 ? (
        <div style={{ textAlign: 'center', padding: '12px 0', color: '#9aa3ab', fontSize: 12 }}>
          暂无批注<br/>
          <span style={{ fontSize: 11, color: '#bcc1c6' }}>在扩展侧边栏中添加</span>
        </div>
      ) : !loaded ? (
        <div style={{ height: 60, background: '#f2f4f6', borderRadius: 8 }} />
      ) : (
        <>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9aa3ab', marginBottom: 10 }}>批注对话</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 240, overflowY: 'auto' }}>
            {messages.map((m: any) => (
              <div key={m.id} style={{
                background: m.role === 'assistant' ? 'linear-gradient(135deg,#f0f4ff,#f5f0ff)' : '#f9f9fb',
                borderRadius: 8, padding: '8px 10px',
                borderLeft: m.role === 'assistant' ? '2px solid #a78bfa' : 'none',
                color: '#2d3338',
              }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: m.role === 'assistant' ? '#a78bfa' : '#9aa3ab', marginBottom: 3 }}>
                  {m.role === 'assistant' ? 'AI' : '我'}
                </div>
                {m.content}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// Single renderable node with highlight support
function BookNode({
  node,
  highlights,
  onHighlightClick,
  openHighlightId,
  isFirst,
}: {
  node: DocNode
  highlights: Highlight[]
  onHighlightClick: (h: Highlight) => void
  openHighlightId: string | null
  isFirst: boolean
}) {
  const text = node.text ?? ''
  const nodeHighlights = node.type !== 'img' ? findHighlightsInText(text, highlights) : []

  const inner = (
    <HighlightedText
      text={text}
      highlights={nodeHighlights}
      onHighlightClick={onHighlightClick}
      openHighlightId={openHighlightId}
    />
  )

  switch (node.type) {
    case 'h1':
      return (
        <div style={{ fontSize: 28, fontWeight: 700, color: '#1a1610', lineHeight: 1.25, letterSpacing: '-0.5px', marginBottom: 10, marginTop: 0 }}>
          {inner}
        </div>
      )
    case 'h2':
      return (
        <div style={{ fontSize: 16, fontWeight: 700, color: '#2d2820', marginTop: 32, marginBottom: 10, letterSpacing: '-0.1px' }}>
          {inner}
        </div>
      )
    case 'h3':
      return (
        <div style={{ fontSize: 14, fontWeight: 600, color: '#3d3628', marginTop: 20, marginBottom: 8, letterSpacing: '-0.05px' }}>
          {inner}
        </div>
      )
    case 'blockquote':
      return (
        <div style={{
          borderLeft: '3px solid #d4c9b0', margin: '20px 0',
          padding: '10px 18px', color: '#5c5346', fontStyle: 'italic',
          fontSize: 15, lineHeight: 1.75,
          background: 'rgba(212,201,176,0.12)', borderRadius: '0 6px 6px 0',
        }}>
          {inner}
        </div>
      )
    case 'li':
      return (
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <span style={{ color: '#b0a693', flexShrink: 0, marginTop: 2 }}>·</span>
          <span style={{ fontSize: 15, lineHeight: 1.8, color: '#3d3628' }}>{inner}</span>
        </div>
      )
    case 'img':
      return (
        <div style={{ margin: '24px -8px', textAlign: 'center' }}>
          <img
            src={node.src}
            alt={node.alt ?? ''}
            style={{ maxWidth: '100%', borderRadius: 6, opacity: 0.9 }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          {node.alt && <div style={{ fontSize: 11, color: '#9a8e7e', marginTop: 6, fontStyle: 'italic' }}>{node.alt}</div>}
        </div>
      )
    case 'p':
    default:
      return (
        <p style={{
          fontSize: 15, lineHeight: 1.85, color: '#3d3628', marginBottom: 18,
          // Drop cap on first paragraph
          ...(isFirst ? {} : {}),
        }}>
          {inner}
        </p>
      )
  }
}

interface BookViewProps {
  pageId: string
}

export function BookView({ pageId }: BookViewProps) {
  const [page, setPage] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [openHighlightId, setOpenHighlightId] = useState<string | null>(null)
  const [openHighlight, setOpenHighlight] = useState<Highlight | null>(null)
  const [activeChapter, setActiveChapter] = useState(0)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setLoading(true)
    setOpenHighlightId(null)
    setOpenHighlight(null)
    getPageDetail(pageId).then(data => {
      setPage(data)
      setLoading(false)
    })
  }, [pageId])

  if (loading) {
    return (
      <div style={{ background: '#fffef9', borderRadius: '4px 12px 12px 4px', padding: '52px 72px 52px 80px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: 'linear-gradient(to right,#c8bfae,#e8e2d6)', borderRadius: '4px 0 0 4px' }} />
        {[80, 50, 90, 70, 85, 60].map((w, i) => (
          <div key={i} style={{ height: i === 0 ? 28 : 15, background: '#edeae2', borderRadius: 4, width: `${w}%`, marginBottom: i === 0 ? 20 : 12 }} />
        ))}
      </div>
    )
  }

  if (!page) return null

  const highlights: Highlight[] = page.highlights ?? []
  let nodes: DocNode[] = []
  try {
    nodes = page.doc_structure ? JSON.parse(page.doc_structure) : []
  } catch { nodes = [] }

  if (nodes.length === 0) return null

  // Build chapter list from h2 nodes
  const chapters = nodes
    .map((n, i) => n.type === 'h2' ? { idx: i, title: n.text ?? '' } : null)
    .filter(Boolean) as { idx: number; title: string }[]

  // Find h1 for page title
  const h1Node = nodes.find(n => n.type === 'h1')

  function handleHighlightClick(h: Highlight) {
    if (openHighlightId === h.id) {
      setOpenHighlightId(null)
      setOpenHighlight(null)
    } else {
      setOpenHighlightId(h.id)
      setOpenHighlight(h)
    }
  }

  const highlightCount = highlights.length
  const annotationCount = highlights.filter(h => h.message_count > 0).length

  return (
    <div style={{ position: 'relative' }}>
      {/* Stats bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, fontSize: 12, color: '#9a8e7e' }}>
        <span>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'rgba(251,211,62,0.7)', marginRight: 5, verticalAlign: 'middle' }} />
          {highlightCount} 条划线
        </span>
        {annotationCount > 0 && (
          <span>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: 'rgba(167,139,250,0.6)', marginRight: 5, verticalAlign: 'middle' }} />
            {annotationCount} 条批注，点击高亮查看
          </span>
        )}
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, color: '#9a8e7e', background: 'none', border: 'none',
            cursor: 'pointer', padding: '3px 6px', borderRadius: 6,
            transition: 'color 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#5c5346')}
          onMouseLeave={e => (e.currentTarget.style.color = '#9a8e7e')}
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

      {/* Book */}
      <div style={{
        background: '#fffef9',
        borderRadius: '4px 12px 12px 4px',
        boxShadow: '-4px 0 8px rgba(0,0,0,0.03), 0 4px 28px rgba(0,0,0,0.09), inset -1px 0 0 rgba(0,0,0,0.03)',
        position: 'relative',
        height: expanded ? 'auto' : 520,
        overflow: expanded ? 'visible' : 'hidden',
        transition: 'height 0.3s ease',
      }}>
        {/* Spine */}
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 7,
          background: 'linear-gradient(to right,#c8bfae,#e8e2d6)',
          borderRadius: '4px 0 0 4px',
          zIndex: 2,
        }} />
        {/* Bottom fade — hints scrollability, hidden when expanded */}
        {!expanded && (
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, height: 64,
            background: 'linear-gradient(to bottom, transparent, rgba(255,254,249,0.95))',
            pointerEvents: 'none', zIndex: 2, borderRadius: '0 0 12px 0',
          }} />
        )}

        {/* TOC dots (chapter nav) */}
        {chapters.length > 0 && (
          <div style={{
            position: 'absolute', right: -24, top: '50%', transform: 'translateY(-50%)',
            display: 'flex', flexDirection: 'column', gap: 8, zIndex: 2,
          }}>
            {chapters.map((ch, i) => (
              <div
                key={ch.idx}
                title={ch.title}
                onClick={() => {
                  setActiveChapter(i)
                  document.getElementById(`chapter-${ch.idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: activeChapter === i ? '#7a6e5e' : '#d4c9b0',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  transform: activeChapter === i ? 'scale(1.4)' : 'scale(1)',
                }}
              />
            ))}
          </div>
        )}

        <div style={{ height: expanded ? 'auto' : '100%', overflowY: expanded ? 'visible' : 'auto', padding: '44px 68px 56px 80px', scrollbarWidth: 'thin', scrollbarColor: '#d4c9b0 transparent' }}>
          {/* Page header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 36, paddingBottom: 10,
            borderBottom: '1px solid rgba(0,0,0,0.07)',
          }}>
            <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#b0a693' }}>
              {new URL(page.url).hostname.replace('www.', '')}
            </span>
            <span style={{ fontSize: 10, color: '#b0a693', letterSpacing: '0.06em' }}>
              {new Date(page.saved_at).toLocaleDateString('zh-CN')}
            </span>
          </div>

          {/* Content nodes */}
          {nodes.map((node, idx) => {
            const isH2 = node.type === 'h2'
            const chapterIdx = chapters.findIndex(c => c.idx === idx)
            return (
              <div
                key={idx}
                id={isH2 ? `chapter-${idx}` : undefined}
                style={{ position: 'relative' }}
                onMouseEnter={() => { if (isH2 && chapterIdx !== -1) setActiveChapter(chapterIdx) }}
              >
                <BookNode
                  node={node}
                  highlights={highlights}
                  onHighlightClick={handleHighlightClick}
                  openHighlightId={openHighlightId}
                  isFirst={idx === 0 || (idx === 1 && h1Node !== undefined)}
                />
                {/* Annotation popover anchored to this node if it contains the open highlight */}
                {openHighlight && node.text && node.text.includes(openHighlight.text.slice(0, 80)) && (
                  <AnnotPopover
                    highlight={openHighlight}
                    onClose={() => { setOpenHighlightId(null); setOpenHighlight(null) }}
                  />
                )}
              </div>
            )
          })}

          {/* Page footer */}
          <div style={{
            marginTop: 40, paddingTop: 14,
            borderTop: '1px solid rgba(0,0,0,0.07)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 11, color: '#b0a693' }}>
              {highlightCount > 0 ? `${highlightCount} 处划线` : '暂无划线'}
            </span>
            <a
              href={page.url}
              target="_blank"
              rel="noreferrer"
              style={{ fontSize: 11, color: '#b0a693', textDecoration: 'none' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#7a6e5e')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#b0a693')}
            >
              查看原文 →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
