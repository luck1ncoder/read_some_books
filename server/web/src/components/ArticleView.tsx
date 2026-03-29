import { useState, useEffect } from 'react'
import { getPageDetail, getHighlightMessages } from '../api'
import { Highlight, HighlightedText, findHighlightsInText, StatsBar, MessageList } from './shared'

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

export function ArticleView({ pageId }: { pageId: string }) {
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

  const showAll = hlParaIndices.size === 0
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
          <HighlightedText text={para} highlights={paraHighlights} />
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
