import { useState, useEffect } from 'react'
import { getPageDetail, getHighlightMessages } from '../api'
import { Highlight, HighlightedText, findHighlightsInText, StatsBar, MessageList, getDomain } from './shared'
import { DocNode, BookNode, AnnotPopover } from './BookView'

function AnnotationPanel({ highlight, open }: { highlight: Highlight; open: boolean }) {
  const [messages, setMessages] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!open || loaded) return
    getHighlightMessages(highlight.id).then(data => { setMessages(Array.isArray(data) ? data : []); setLoaded(true) })
  }, [open, highlight.id, loaded])

  return (
    <div style={{
      width: open ? 300 : 0, overflow: 'hidden', flexShrink: 0,
      transition: 'width 0.28s cubic-bezier(0.4,0,0.2,1)',
      borderLeft: open ? '1px solid rgba(45,51,56,0.07)' : '1px solid transparent',
      background: '#f9f9fb',
    }}>
      <div style={{ width: 300, padding: '14px 16px', opacity: open ? 1 : 0, transition: 'opacity 0.18s 0.1s' }}>
        {highlight.message_count === 0 ? (
          <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12, color: '#9aa3ab', lineHeight: 1.6 }}>
            暂无批注<br /><span style={{ fontSize: 11, color: '#bcc1c6' }}>在扩展侧边栏中添加</span>
          </div>
        ) : !loaded ? (
          <div style={{ height: 60, background: '#ebeef2', borderRadius: 8 }} />
        ) : messages.length === 0 ? (
          <div style={{ fontSize: 12, color: '#bcc1c6' }}>暂无消息记录</div>
        ) : (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9aa3ab', marginBottom: 12 }}>批注对话</div>
            <MessageList messages={messages} />
          </>
        )}
      </div>
    </div>
  )
}

function splitParagraphs(text: string): string[] {
  return text.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0)
}

// ── Structured scroll view: uses doc_structure with BookNode for rich rendering ──

function StructuredScrollView({ page }: { page: any }) {
  const [openHighlightId, setOpenHighlightId] = useState<string | null>(null)
  const [openHighlight, setOpenHighlight] = useState<Highlight | null>(null)

  const highlights: Highlight[] = page.highlights ?? []
  let nodes: DocNode[] = []
  try { nodes = page.doc_structure ? JSON.parse(page.doc_structure) : [] } catch { nodes = [] }

  const highlightCount = highlights.length
  const annotationCount = highlights.filter(h => h.message_count > 0).length

  function handleHighlightClick(h: Highlight) {
    if (openHighlightId === h.id) { setOpenHighlightId(null); setOpenHighlight(null) }
    else { setOpenHighlightId(h.id); setOpenHighlight(h) }
  }

  return (
    <div>
      {/* Stats */}
      {highlightCount > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 0 16px', fontSize: 12, color: '#9aa3ab',
        }}>
          <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'rgba(251,211,62,0.7)' }} />
          {highlightCount} 处划线
          {annotationCount > 0 && (
            <>
              <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'rgba(167,139,250,0.7)', marginLeft: 6 }} />
              {annotationCount} 处批注
              <span style={{ color: '#d1d5db' }}>· 点击高亮查看</span>
            </>
          )}
        </div>
      )}

      {/* Scroll content */}
      <div style={{
        background: '#fffef9', borderRadius: 12, padding: '48px 56px 56px',
        boxShadow: '0 1px 6px rgba(45,51,56,0.06)',
        fontFamily: "'Georgia', 'Noto Serif SC', 'Source Han Serif SC', serif",
        position: 'relative',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 32, paddingBottom: 10,
          borderBottom: '1px solid rgba(0,0,0,0.07)',
        }}>
          <span style={{ fontSize: 10, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#b0a693' }}>
            {getDomain(page.url)}
          </span>
          <span style={{ fontSize: 10, color: '#b0a693', letterSpacing: '0.06em' }}>
            {new Date(page.saved_at).toLocaleDateString('zh-CN')}
          </span>
        </div>

        {/* Content nodes */}
        {nodes.map((node, idx) => (
          <div key={idx} style={{ position: 'relative' }}>
            <BookNode node={node} highlights={highlights} onHighlightClick={handleHighlightClick} openHighlightId={openHighlightId} />
            {openHighlight && node.text && node.text.includes(openHighlight.text.slice(0, 80)) && (
              <AnnotPopover highlight={openHighlight} onClose={() => { setOpenHighlightId(null); setOpenHighlight(null) }} />
            )}
          </div>
        ))}

        {/* Footer */}
        <div style={{
          marginTop: 40, paddingTop: 14,
          borderTop: '1px solid rgba(0,0,0,0.07)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, color: '#b0a693' }}>
            {highlightCount > 0 ? `${highlightCount} 处划线` : ''}
          </span>
          <a href={page.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#b0a693', textDecoration: 'none' }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#7a6e5e')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#b0a693')}>
            查看原文 →
          </a>
        </div>
      </div>
    </div>
  )
}

// ── ArticleView ──────────────────────────────────────────────────────────────

export function ArticleView({ pageId, showFullContent = false }: { pageId: string; showFullContent?: boolean }) {
  const [page, setPage] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [openHighlightId, setOpenHighlightId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setLoading(true); setOpenHighlightId(null)
    getPageDetail(pageId).then(data => { setPage(data); setLoading(false) })
  }, [pageId])

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2, 3, 4, 5].map(i => <div key={i} style={{ height: 20, background: '#ebeef2', borderRadius: 4, width: `${60 + (i % 3) * 15}%` }} />)}
      </div>
    )
  }

  if (!page) return null

  // When showFullContent is true and doc_structure is available, use structured scroll view
  if (showFullContent) {
    let hasDocStructure = false
    try { hasDocStructure = page.doc_structure && JSON.parse(page.doc_structure).length > 0 } catch {}
    if (hasDocStructure) {
      return <StructuredScrollView page={page} />
    }
  }

  const highlights: Highlight[] = page.highlights ?? []
  const paragraphs = splitParagraphs(page.full_text ?? '')

  // Build highlight → paragraph mapping
  const hlParaIndices = new Set<number>()
  const paraHighlightMap = new Map<number, Highlight[]>()

  for (let i = 0; i < paragraphs.length; i++) {
    const found = findHighlightsInText(paragraphs[i], highlights, 80)
    if (found.length > 0) {
      hlParaIndices.add(i)
      paraHighlightMap.set(i, found)
      if (i > 0) hlParaIndices.add(i - 1)
      if (i < paragraphs.length - 1) hlParaIndices.add(i + 1)
    }
  }

  const showAll = showFullContent || hlParaIndices.size === 0
  const indicesToShow = showAll ? paragraphs.map((_, i) => i) : Array.from(hlParaIndices).sort((a, b) => a - b)

  const highlightCount = highlights.length
  const annotationCount = highlights.filter(h => h.message_count > 0).length

  // Render rows with ellipsis separators
  const rows: React.ReactNode[] = []
  let prevIdx = -1

  for (const idx of indicesToShow) {
    if (prevIdx !== -1 && idx > prevIdx + 1) {
      rows.push(
        <div key={`sep-${idx}`} style={{ display: 'flex', borderBottom: '1px solid rgba(45,51,56,0.05)' }}>
          <div style={{ width: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px 0', color: '#d1d5db', fontSize: 11 }}>···</div>
          <div style={{ flex: 1, padding: '6px 16px 6px 4px', fontSize: 12, color: '#d1d5db', fontStyle: 'italic' }}>{idx - prevIdx - 1} 段省略</div>
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
      <div key={`para-${idx}`}
        style={{ display: 'flex', borderBottom: '1px solid rgba(45,51,56,0.05)', background: isOpen ? 'rgba(167,139,250,0.04)' : 'transparent', cursor: hasHighlight ? 'pointer' : 'default', transition: 'background 0.12s' }}
        onClick={() => { if (paraHighlights.length > 0) setOpenHighlightId(prev => prev === firstHlId ? null : firstHlId) }}
        onMouseEnter={e => { if (hasHighlight && !isOpen) (e.currentTarget as HTMLElement).style.background = hasAnnotation ? 'rgba(167,139,250,0.04)' : 'rgba(251,211,62,0.04)' }}
        onMouseLeave={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        <div style={{ width: 36, flexShrink: 0, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 14 }}>
          {hasAnnotation ? <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(167,139,250,0.8)', marginTop: 1 }} />
            : hasHighlight ? <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(251,211,62,0.8)', marginTop: 1 }} />
            : <span style={{ fontSize: 10, color: '#e2e4e9', fontVariantNumeric: 'tabular-nums' }}>{idx + 1}</span>}
        </div>
        <div style={{ flex: 1, padding: '12px 16px 12px 4px', fontSize: 14, lineHeight: 1.75, color: hasHighlight ? '#2d3338' : '#bcc1c6', minWidth: 0 }}>
          <HighlightedText text={para} highlights={paraHighlights} showAnnotationColor openHighlightId={openHighlightId} />
        </div>
        {hasHighlight && openHl && <AnnotationPanel highlight={openHl} open={isOpen} />}
      </div>
    )
    prevIdx = idx
  }

  return (
    <div>
      <StatsBar
        highlightCount={highlightCount}
        annotationCount={annotationCount}
        expanded={expanded}
        onToggle={() => setExpanded(e => !e)}
        extraNote={<span style={{ color: '#d1d5db' }}>· 点击划线行展开批注</span>}
      />
      <div style={{ position: 'relative', background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(45,51,56,0.06)' }}>
        <div style={{ maxHeight: expanded ? 'none' : 520, overflowY: expanded ? 'visible' : 'auto', scrollbarWidth: 'thin', scrollbarColor: '#e2e4e9 transparent' }}>
          {rows}
        </div>
        {!expanded && <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 48, background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.96))', pointerEvents: 'none' }} />}
      </div>
    </div>
  )
}
