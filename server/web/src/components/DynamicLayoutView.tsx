import { useState, useEffect } from 'react'
import { getPageDetail } from '../api'
import { Highlight, HighlightedText, findHighlightsInText, getDomain } from './shared'

// ── Types ─────────────────────────────────────────────────────────────────────

interface DocNode {
  type: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'blockquote' | 'img' | 'li' | 'pre' | 'table' | 'hr'
  text?: string
  src?: string
  alt?: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SERIF_STACK = "'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', Palatino, serif"
const SANS_STACK = "'Helvetica Neue', Helvetica, Arial, sans-serif"
const INK = '#11100d'
const MUTED = '#4f463b'
const ACCENT = '#d97757'
const PAPER = '#f6f0e6'
const CREDIT_COLOR = 'rgba(17,16,13,0.58)'
const PULL_QUOTE_INTERVAL = 8

// ── Helpers ───────────────────────────────────────────────────────────────────

function textToDocNodes(text: string): DocNode[] {
  return text.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0).map(text => ({ type: 'p' as const, text }))
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function DynamicSkeleton() {
  return (
    <div style={{
      background: PAPER,
      borderRadius: 12,
      padding: '60px 56px 80px',
      minHeight: 600,
    }}>
      {/* Title skeleton */}
      <div style={{ height: 14, width: 120, background: 'rgba(17,16,13,0.06)', borderRadius: 3, marginBottom: 24 }} />
      <div style={{ height: 42, width: '85%', background: 'rgba(17,16,13,0.08)', borderRadius: 4, marginBottom: 12 }} />
      <div style={{ height: 42, width: '60%', background: 'rgba(17,16,13,0.08)', borderRadius: 4, marginBottom: 32 }} />
      <div style={{ height: 16, width: '70%', background: 'rgba(17,16,13,0.05)', borderRadius: 3, marginBottom: 32 }} />
      <div style={{ height: 2, width: '100%', background: 'rgba(217,119,87,0.3)', borderRadius: 1, marginBottom: 32 }} />
      {/* Body skeletons */}
      {[100, 95, 100, 88, 100, 72, 100, 90].map((w, i) => (
        <div key={i} style={{
          height: 14,
          width: `${w}%`,
          background: 'rgba(17,16,13,0.05)',
          borderRadius: 3,
          marginBottom: 14,
          animation: 'none',
        }} />
      ))}
    </div>
  )
}

// ── Pull Quote ────────────────────────────────────────────────────────────────

function PullQuote({ text }: { text: string }) {
  return (
    <div style={{ margin: '48px 0', padding: '32px 40px', position: 'relative', textAlign: 'center' }}>
      <div style={{
        position: 'absolute', left: '50%', top: 0,
        transform: 'translateX(-50%)', width: 60, height: 3,
        background: ACCENT, borderRadius: 2,
      }} />
      <div style={{
        fontFamily: SERIF_STACK,
        fontSize: 24, fontWeight: 600, fontStyle: 'italic',
        color: INK, lineHeight: 1.45, marginTop: 16,
      }}>
        &ldquo;{text}&rdquo;
      </div>
      <div style={{
        position: 'absolute', left: '50%', bottom: 0,
        transform: 'translateX(-50%)', width: 60, height: 3,
        background: ACCENT, borderRadius: 2,
      }} />
    </div>
  )
}

// ── Highlight Callout ─────────────────────────────────────────────────────────

function HighlightCallout({ hl }: { hl: Highlight }) {
  return (
    <div style={{
      background: 'rgba(217,119,87,0.06)',
      borderLeft: `3px solid ${ACCENT}`,
      padding: '16px 20px',
      margin: '20px 0',
      borderRadius: '0 8px 8px 0',
      breakInside: 'avoid' as const,
    }}>
      <div style={{
        fontFamily: SANS_STACK,
        fontSize: 10, fontWeight: 600,
        letterSpacing: '0.12em', textTransform: 'uppercase' as const,
        color: ACCENT, marginBottom: 6,
      }}>
        ✦ 划线{hl.message_count > 0 ? ' + 批注' : ''}
      </div>
      <div style={{
        fontStyle: 'italic', color: MUTED,
        fontSize: 15, lineHeight: 1.7,
      }}>
        &ldquo;{hl.text}&rdquo;
      </div>
    </div>
  )
}

// ── Content Node Renderer ─────────────────────────────────────────────────────

function DynamicNode({ node, highlights }: { node: DocNode; highlights: Highlight[] }) {
  const matchedHighlights = node.text ? findHighlightsInText(node.text, highlights) : []

  switch (node.type) {
    case 'h1':
      return (
        <h1 style={{
          fontFamily: SERIF_STACK,
          fontSize: 36, fontWeight: 700, color: INK,
          lineHeight: 1.15, letterSpacing: '-0.5px',
          marginTop: 48, marginBottom: 16,
        }}>
          {node.text && <HighlightedText text={node.text} highlights={matchedHighlights} />}
        </h1>
      )
    case 'h2':
      return (
        <h2 style={{
          fontFamily: SERIF_STACK,
          fontSize: 28, fontWeight: 700, color: INK,
          lineHeight: 1.2, marginTop: 48, marginBottom: 16,
        }}>
          {node.text && <HighlightedText text={node.text} highlights={matchedHighlights} />}
        </h2>
      )
    case 'h3':
      return (
        <h3 style={{
          fontFamily: SERIF_STACK,
          fontSize: 22, fontWeight: 600, color: INK,
          lineHeight: 1.3, marginTop: 36, marginBottom: 12,
        }}>
          {node.text && <HighlightedText text={node.text} highlights={matchedHighlights} />}
        </h3>
      )
    case 'h4':
    case 'h5':
    case 'h6':
      return (
        <div style={{
          fontFamily: SERIF_STACK,
          fontSize: 16, fontWeight: 600, color: MUTED,
          lineHeight: 1.4, marginTop: 28, marginBottom: 10,
        }}>
          {node.text && <HighlightedText text={node.text} highlights={matchedHighlights} />}
        </div>
      )
    case 'blockquote':
      return (
        <blockquote style={{
          borderLeft: `3px solid ${ACCENT}`,
          padding: '12px 20px', margin: '24px 0',
          color: MUTED, fontStyle: 'italic',
          fontFamily: SERIF_STACK, fontSize: 15.5, lineHeight: 1.75,
          background: 'rgba(217,119,87,0.04)',
          borderRadius: '0 8px 8px 0',
        }}>
          {node.text && <HighlightedText text={node.text} highlights={matchedHighlights} />}
        </blockquote>
      )
    case 'li':
      return (
        <div style={{
          display: 'flex', gap: 10, marginBottom: 10,
          fontFamily: SERIF_STACK, fontSize: 16.5, lineHeight: 1.85,
          color: INK, fontWeight: 450, letterSpacing: '0.002em',
        }}>
          <span style={{ color: ACCENT, flexShrink: 0, marginTop: 2, fontSize: 8, lineHeight: '28px' }}>●</span>
          <span>{node.text && <HighlightedText text={node.text} highlights={matchedHighlights} />}</span>
        </div>
      )
    case 'pre':
      return (
        <pre style={{
          background: 'rgba(17,16,13,0.04)',
          border: '1px solid rgba(17,16,13,0.08)',
          borderRadius: 8, padding: '14px 18px',
          margin: '20px 0',
          fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
          fontSize: 13, lineHeight: 1.65,
          color: INK, overflowX: 'auto',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {node.text ?? ''}
        </pre>
      )
    case 'table':
      return (
        <div style={{
          background: 'rgba(17,16,13,0.03)',
          border: '1px solid rgba(17,16,13,0.08)',
          borderRadius: 8, padding: '14px 18px',
          margin: '20px 0',
          fontFamily: SANS_STACK,
          fontSize: 13.5, lineHeight: 1.7,
          color: INK, overflowX: 'auto',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {node.text ?? ''}
        </div>
      )
    case 'hr':
      return (
        <hr style={{
          border: 'none',
          borderTop: '1px solid rgba(17,16,13,0.12)',
          margin: '36px 0',
        }} />
      )
    case 'img':
      return node.src ? (
        <div style={{ margin: '28px 0', textAlign: 'center' }}>
          <img
            src={node.src}
            alt={node.alt ?? ''}
            style={{
              maxWidth: '100%', borderRadius: 8,
              boxShadow: '0 2px 12px rgba(17,16,13,0.08)',
            }}
          />
          {node.alt && (
            <div style={{
              fontFamily: SANS_STACK,
              fontSize: 12, color: CREDIT_COLOR,
              marginTop: 8, fontStyle: 'italic',
            }}>
              {node.alt}
            </div>
          )}
        </div>
      ) : null
    case 'p':
    default:
      if (!node.text) return null
      return (
        <p
          style={{
            fontFamily: SERIF_STACK,
            fontSize: 16.5, lineHeight: 1.85, fontWeight: 450,
            letterSpacing: '0.002em', color: INK,
            marginBottom: 24, marginTop: 0,
            transition: 'color 120ms ease', cursor: 'text',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = ACCENT)}
          onMouseLeave={e => (e.currentTarget.style.color = INK)}
        >
          <HighlightedText text={node.text} highlights={matchedHighlights} />
        </p>
      )
  }
}

// ── DynamicLayoutView ─────────────────────────────────────────────────────────

export function DynamicLayoutView({ pageId }: { pageId: string }) {
  const [page, setPage] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getPageDetail(pageId).then(data => { setPage(data); setLoading(false) })
  }, [pageId])

  // ── Loading state ──
  if (loading) return <DynamicSkeleton />

  // ── Empty state ──
  if (!page) {
    return (
      <div style={{
        background: PAPER, borderRadius: 12,
        minHeight: 400, display: 'flex',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: SERIF_STACK, fontSize: 15, color: MUTED }}>
          暂无内容
        </span>
      </div>
    )
  }

  // ── Parse data ──
  let nodes: DocNode[] = []
  try { nodes = page.doc_structure ? JSON.parse(page.doc_structure) : [] } catch { nodes = [] }
  if (nodes.length === 0 && page.full_text) nodes = textToDocNodes(page.full_text)

  const highlights: Highlight[] = page.highlights ?? []
  const highlightCount = highlights.length
  const annotationCount = highlights.filter((h: Highlight) => h.message_count > 0).length
  const domain = getDomain(page.url ?? '')

  // ── Derive subtitle from first paragraph ──
  const firstPara = nodes.find(n => n.type === 'p' && n.text)
  const subtitle = firstPara?.text
    ? (firstPara.text.length > 150 ? firstPara.text.slice(0, 150) + '…' : firstPara.text)
    : ''

  // ── Pick a notable highlight for pull quotes ──
  const pullQuoteHighlights = highlights.filter(h => h.text.length >= 30 && h.text.length <= 200)

  // ── Build body content with pull quotes and highlight callouts ──
  let paraCount = 0
  let pullQuoteIdx = 0
  const bodyElements: React.ReactNode[] = []

  // Track which highlights have been rendered as callouts (inline matches)
  const renderedHighlightIds = new Set<string>()

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]

    // Render the node
    bodyElements.push(<DynamicNode key={`node-${i}`} node={node} highlights={highlights} />)

    // After rendering a paragraph, check for highlight callouts
    if (node.type === 'p' && node.text) {
      paraCount++
      const matched = findHighlightsInText(node.text, highlights)
      for (const hl of matched) {
        if (!renderedHighlightIds.has(hl.id)) {
          renderedHighlightIds.add(hl.id)
          bodyElements.push(<HighlightCallout key={`hl-${hl.id}`} hl={hl} />)
        }
      }

      // Insert pull quote after every PULL_QUOTE_INTERVAL paragraphs
      if (paraCount > 0 && paraCount % PULL_QUOTE_INTERVAL === 0 && pullQuoteIdx < pullQuoteHighlights.length) {
        bodyElements.push(
          <PullQuote key={`pq-${pullQuoteIdx}`} text={pullQuoteHighlights[pullQuoteIdx].text} />
        )
        pullQuoteIdx++
      }
    }
  }

  // Render remaining highlights that weren't matched inline
  const unmatchedHighlights = highlights.filter(h => !renderedHighlightIds.has(h.id))
  if (unmatchedHighlights.length > 0) {
    for (const hl of unmatchedHighlights) {
      bodyElements.push(<HighlightCallout key={`hl-rest-${hl.id}`} hl={hl} />)
    }
  }

  return (
    <div style={{
      background: PAPER,
      color: INK,
      borderRadius: 12,
      position: 'relative',
      overflow: 'hidden',
      minHeight: 600,
    }}>
      {/* ── Atmosphere layers ── */}
      {/* Left atmosphere — blue-ish ambient glow */}
      <div style={{
        position: 'absolute', inset: '-10%',
        pointerEvents: 'none', zIndex: 0, opacity: 1,
        background: 'radial-gradient(62% 54% at 16% 82%, rgba(45,88,128,0.16), transparent 69%), radial-gradient(44% 34% at 28% 64%, rgba(57,78,124,0.07), transparent 76%)',
      }} />
      {/* Right atmosphere — warm orange glow */}
      <div style={{
        position: 'absolute', inset: '-10%',
        pointerEvents: 'none', zIndex: 0, opacity: 1,
        background: 'radial-gradient(58% 48% at 86% 16%, rgba(217,119,87,0.18), transparent 70%), linear-gradient(135deg, rgba(217,119,87,0.055) 0%, rgba(217,119,87,0.02) 24%, transparent 42%, rgba(45,88,128,0.045) 100%)',
      }} />

      {/* ── Content area ── */}
      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: 900, margin: '0 auto',
        padding: '60px 56px 80px',
      }}>
        {/* ── Header ── */}
        <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: `2px solid ${ACCENT}` }}>
          {/* Credit / domain */}
          <div style={{
            fontFamily: SANS_STACK,
            fontSize: 12, fontWeight: 500,
            letterSpacing: '0.14em', textTransform: 'uppercase' as const,
            color: CREDIT_COLOR,
            marginBottom: 16,
          }}>
            {domain}
          </div>

          {/* Title */}
          <h1 style={{
            fontFamily: SERIF_STACK,
            fontSize: 48, fontWeight: 700,
            letterSpacing: '-1px', color: INK,
            lineHeight: 1.05, marginTop: 0, marginBottom: 24,
          }}>
            {page.title ?? '无标题'}
          </h1>

          {/* Subtitle */}
          {subtitle && (
            <div style={{
              fontFamily: SERIF_STACK,
              fontSize: 16, fontWeight: 450,
              color: MUTED, lineHeight: 1.7,
              maxWidth: 600,
            }}>
              {subtitle}
            </div>
          )}
        </div>

        {/* ── Body ── */}
        <div>
          {bodyElements}
        </div>

        {/* ── Footer ── */}
        <div style={{
          marginTop: 56, paddingTop: 20,
          borderTop: '2px solid rgba(17,16,13,0.1)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{
            fontFamily: SANS_STACK,
            fontSize: 11, letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            color: 'rgba(17,16,13,0.4)',
          }}>
            {highlightCount} 处划线 · {annotationCount} 处批注
          </span>
          <a
            href={page.url}
            target="_blank"
            rel="noreferrer"
            style={{
              fontFamily: SANS_STACK,
              fontSize: 11, letterSpacing: '0.08em',
              color: ACCENT, textDecoration: 'none', fontWeight: 500,
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            查看原文 →
          </a>
        </div>
      </div>
    </div>
  )
}
