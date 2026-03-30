import { useState, useEffect } from 'react'
import { getPageDetail } from '../api'
import { Highlight, HighlightedText, findHighlightsInText, getDomain } from './shared'
import { DocNode } from './BookView'

// ── NewsNode ─────────────────────────────────────────────────────────────────

function NewsNode({ node, highlights, isFirstParagraph }: {
  node: DocNode; highlights: Highlight[]; isFirstParagraph: boolean
}) {
  const text = node.text ?? ''
  const nodeHighlights = node.type !== 'img' ? findHighlightsInText(text, highlights) : []

  const inner = (
    <HighlightedText text={text} highlights={nodeHighlights} />
  )

  switch (node.type) {
    case 'h1':
      return null // used in headline area
    case 'h2':
      return (
        <div style={{
          fontSize: 20, fontWeight: 700, color: '#1a1610', lineHeight: 1.3,
          marginTop: 32, marginBottom: 12, letterSpacing: '-0.3px',
          fontFamily: "'Playfair Display', 'Noto Serif SC', serif",
          breakAfter: 'avoid' as any,
        }}>
          {inner}
        </div>
      )
    case 'h3':
      return (
        <div style={{
          fontSize: 17, fontWeight: 600, color: '#2a2418', lineHeight: 1.35,
          marginTop: 24, marginBottom: 10,
          fontFamily: "'Playfair Display', 'Noto Serif SC', serif",
          breakAfter: 'avoid' as any,
        }}>
          {inner}
        </div>
      )
    case 'h4':
      return (
        <div style={{
          fontSize: 15, fontWeight: 600, color: '#2a2418', lineHeight: 1.4,
          marginTop: 20, marginBottom: 8,
          fontFamily: "'Source Serif 4', 'Noto Serif SC', serif",
        }}>
          {inner}
        </div>
      )
    case 'h5':
    case 'h6':
      return (
        <div style={{
          fontSize: 13, fontWeight: 600, color: '#4a4238', lineHeight: 1.4,
          marginTop: 16, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em',
          fontFamily: "'Source Serif 4', 'Noto Serif SC', serif",
        }}>
          {inner}
        </div>
      )
    case 'blockquote':
      return (
        <div style={{
          borderLeft: '2px solid #c8bfae', margin: '18px 0', padding: '8px 16px',
          color: '#6a5e4e', fontStyle: 'italic', fontSize: 14, lineHeight: 1.75,
          breakInside: 'avoid' as any,
        }}>
          {inner}
        </div>
      )
    case 'li':
      return (
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <span style={{ color: '#6a5e4e', flexShrink: 0, marginTop: 2 }}>·</span>
          <span style={{ fontSize: 15, lineHeight: 1.8, color: '#2a2418' }}>{inner}</span>
        </div>
      )
    case 'pre':
      return (
        <pre style={{
          margin: '16px 0', padding: '14px 16px',
          background: 'rgba(42,36,24,0.04)', border: '1px solid rgba(42,36,24,0.1)',
          borderRadius: 4, fontSize: 12, lineHeight: 1.65, color: '#2a2418',
          overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
          breakInside: 'avoid' as any,
        }}>
          {text}
        </pre>
      )
    case 'table':
      return (
        <div style={{
          margin: '16px 0', padding: '12px 14px',
          background: 'rgba(42,36,24,0.03)', border: '1px solid rgba(42,36,24,0.08)',
          borderRadius: 4, fontSize: 13, lineHeight: 1.7, color: '#2a2418', overflow: 'auto',
          breakInside: 'avoid' as any,
        }}>
          {text.split('\n').map((row, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, padding: '3px 0',
              borderBottom: i === 0 ? '1px solid rgba(42,36,24,0.12)' : 'none',
              fontWeight: i === 0 ? 600 : 400,
            }}>
              {row.split(' | ').map((cell, j) => <span key={j} style={{ flex: 1, minWidth: 0 }}>{cell}</span>)}
            </div>
          ))}
        </div>
      )
    case 'hr':
      return <hr style={{ border: 'none', borderTop: '1px solid #c8bfae', margin: '24px 0' }} />
    case 'img':
      return (
        <div style={{ margin: '20px 0', textAlign: 'center', breakInside: 'avoid' as any }}>
          <img src={node.src} alt={node.alt ?? ''} style={{ maxWidth: '100%', borderRadius: 4, opacity: 0.92 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
          {node.alt && <div style={{ fontSize: 10, color: '#9a8e7e', marginTop: 6, fontStyle: 'italic' }}>{node.alt}</div>}
        </div>
      )
    case 'p':
    default:
      if (isFirstParagraph && text.length > 1) {
        return (
          <p style={{
            fontSize: 15, lineHeight: 1.8, color: '#2a2418', marginBottom: 16,
            textAlign: 'justify' as any,
            fontFamily: "'Source Serif 4', 'Noto Serif SC', serif",
          }}>
            <span style={{
              fontFamily: "'Playfair Display', serif", float: 'left',
              fontSize: 76, lineHeight: 0.72, padding: '4px 8px 0 0',
              color: '#1a1610', fontWeight: 900,
            }}>
              {text[0]}
            </span>
            <HighlightedText text={text.slice(1)} highlights={nodeHighlights.map(h => ({
              ...h, text: h.text.startsWith(text[0]) ? h.text.slice(1) : h.text,
            }))} />
          </p>
        )
      }
      return (
        <p style={{
          fontSize: 15, lineHeight: 1.8, color: '#2a2418', marginBottom: 16,
          textIndent: '1.5em', textAlign: 'justify' as any,
          fontFamily: "'Source Serif 4', 'Noto Serif SC', serif",
        }}>
          {inner}
        </p>
      )
  }
}

// ── NewspaperView ─────────────────────────────────────────────────────────────

export function NewspaperView({ pageId }: { pageId: string }) {
  const [page, setPage] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getPageDetail(pageId).then(data => { setPage(data); setLoading(false) })
  }, [pageId])

  // Loading skeleton
  if (loading) {
    return (
      <div style={{
        background: '#f4efe6', borderRadius: 12, padding: '48px 48px 80px',
        minHeight: 400,
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ height: 12, width: 180, background: '#e4ddd0', borderRadius: 3, margin: '0 auto 12px', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <div style={{ height: 8, width: 120, background: '#e4ddd0', borderRadius: 3, margin: '0 auto' }} />
        </div>
        <div style={{ height: 1, background: '#d4c9b0', marginBottom: 24 }} />
        <div style={{ height: 40, width: '75%', background: '#e4ddd0', borderRadius: 4, marginBottom: 24 }} />
        <div style={{ columnCount: 2, columnGap: 36 }}>
          {[90, 80, 95, 70, 85, 75, 88, 92].map((w, i) => (
            <div key={i} style={{ height: 14, width: `${w}%`, background: '#e4ddd0', borderRadius: 3, marginBottom: 12 }} />
          ))}
        </div>
        <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
      </div>
    )
  }

  // Empty state
  if (!page) {
    return (
      <div style={{
        background: '#f4efe6', borderRadius: 12, padding: '80px 48px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 14, color: '#6a5e4e', fontFamily: "'Source Serif 4', 'Noto Serif SC', serif" }}>
          暂无内容
        </div>
      </div>
    )
  }

  const highlights: Highlight[] = page.highlights ?? []
  let nodes: DocNode[] = []
  try { nodes = page.doc_structure ? JSON.parse(page.doc_structure) : [] } catch { nodes = [] }

  const domain = getDomain(page.url)
  const formattedDate = new Date(page.saved_at).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // Find h1 for headline, first p for subtitle
  const h1Node = nodes.find(n => n.type === 'h1')
  const title = h1Node?.text ?? page.title ?? ''
  const firstPNode = nodes.find(n => n.type === 'p' && (n.text ?? '').length > 0)
  const subtitle = firstPNode?.text
    ? (firstPNode.text.length > 120 ? firstPNode.text.slice(0, 120) + '...' : firstPNode.text)
    : ''

  // Body nodes: skip the first h1
  const bodyNodes = nodes.filter(n => n !== h1Node)

  // Track first p for drop cap
  let foundFirstP = false

  // Pull quote: find a highlight with message_count > 0 for the pull quote
  const pullQuoteHighlight = highlights.find(h => h.message_count > 0 && h.text.length > 20)

  // Count p nodes to insert pull quote after ~8 paragraphs
  let pCount = 0
  let pullQuoteInserted = false

  // Highlight callout boxes — collect highlights that match each node
  const highlightCount = highlights.length
  const annotationCount = highlights.filter(h => h.message_count > 0).length

  return (
    <div style={{
      background: '#f4efe6', borderRadius: 12, overflow: 'hidden',
      position: 'relative',
    }}>
      {/* Decorative sun SVG */}
      <div style={{ position: 'absolute', top: 60, right: -30, width: 120, height: 120, opacity: 0.08, pointerEvents: 'none' }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
          <g fill="#2a2418">
            <circle cx="50" cy="50" r="20" />
            {Array.from({ length: 12 }).map((_, i) => (
              <rect key={i} x="48" y="5" width="4" height="18" rx="2" transform={`rotate(${i * 30} 50 50)`} />
            ))}
          </g>
        </svg>
      </div>

      <div style={{ padding: '48px 48px 80px', maxWidth: 1100, margin: '0 auto' }}>
        {/* Masthead */}
        <div style={{ textAlign: 'center', paddingBottom: 16, borderBottom: '3px double #2a2418', marginBottom: 8 }}>
          <div style={{
            fontFamily: "'DM Serif Display', 'Noto Serif SC', serif",
            fontSize: 12, letterSpacing: '0.35em', textTransform: 'uppercase',
            color: '#6a5e4e', marginBottom: 4,
          }}>
            The Reader's Digest
          </div>
          <div style={{
            fontFamily: "'Source Serif 4', serif",
            fontSize: 10, color: '#9a8e7e', letterSpacing: '0.1em',
          }}>
            {formattedDate} · {domain}
          </div>
        </div>
        <div style={{ height: 1, background: '#2a2418', marginBottom: 32 }} />

        {/* Headline area */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 320px', gap: 40,
          marginBottom: 32, alignItems: 'end',
        }}>
          <h1 style={{
            fontFamily: "'Playfair Display', 'Noto Serif SC', serif",
            fontSize: 52, fontWeight: 900, lineHeight: 1.0,
            letterSpacing: '-1.5px', color: '#1a1610', margin: 0,
          }}>
            {title}
          </h1>
          <div style={{
            padding: '20px 0',
            borderTop: '1px solid #c8bfae', borderBottom: '1px solid #c8bfae',
          }}>
            <div style={{
              fontFamily: "'Source Serif 4', serif",
              fontSize: 12, fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: '#4a4238', marginBottom: 8,
            }}>
              {domain}
            </div>
            <div style={{
              fontFamily: "'Source Serif 4', serif",
              fontSize: 14, fontStyle: 'italic', color: '#6a5e4e', lineHeight: 1.6,
            }}>
              {subtitle}
            </div>
          </div>
        </div>

        {/* Separator */}
        <div style={{ height: 1, background: '#c8bfae', marginBottom: 28 }} />

        {/* Body — 2-column layout */}
        <div style={{
          columnCount: 2, columnGap: 36,
          columnRule: '1px solid #d4c9b0',
          fontFamily: "'Source Serif 4', 'Noto Serif SC', serif",
          fontSize: 15, lineHeight: 1.8, color: '#2a2418',
        }}>
          {bodyNodes.map((node, idx) => {
            const isFirstP = !foundFirstP && node.type === 'p' && (node.text ?? '').length > 1
            if (isFirstP) foundFirstP = true

            // Count p nodes
            if (node.type === 'p') pCount++

            // Gather highlight callout boxes for this node
            const nodeText = node.text ?? ''
            const nodeHighlights = node.type !== 'img' ? findHighlightsInText(nodeText, highlights) : []

            // Insert pull quote after ~8 paragraphs
            const shouldInsertPullQuote = !pullQuoteInserted && pullQuoteHighlight && pCount === 8 && node.type === 'p'
            if (shouldInsertPullQuote) pullQuoteInserted = true

            return (
              <div key={idx}>
                <NewsNode node={node} highlights={highlights} isFirstParagraph={isFirstP} />

                {/* Highlight callout boxes */}
                {nodeHighlights.map(hl => (
                  <div key={hl.id} style={{
                    background: 'rgba(200,169,110,0.1)',
                    borderLeft: '3px solid #b8a070',
                    padding: '14px 16px', margin: '18px 0',
                    borderRadius: '0 4px 4px 0',
                    fontStyle: 'italic', color: '#4a4238',
                    fontSize: 14, lineHeight: 1.7,
                    breakInside: 'avoid' as any,
                  }}>
                    <div style={{
                      fontSize: 9, fontWeight: 600, letterSpacing: '0.12em',
                      textTransform: 'uppercase', color: '#8a7e6e',
                      fontStyle: 'normal', marginBottom: 4,
                    }}>
                      ✦ 划线{hl.message_count > 0 ? ' + 批注' : ''}
                    </div>
                    "{hl.text}"
                  </div>
                ))}

                {/* Pull quote — column-spanning */}
                {shouldInsertPullQuote && pullQuoteHighlight && (
                  <div style={{
                    columnSpan: 'all' as any, margin: '32px 0', padding: '24px 48px',
                    textAlign: 'center',
                    borderTop: '2px solid #2a2418', borderBottom: '2px solid #2a2418',
                  }}>
                    <div style={{
                      fontFamily: "'Playfair Display', 'Noto Serif SC', serif",
                      fontSize: 24, fontWeight: 700, fontStyle: 'italic',
                      color: '#1a1610', lineHeight: 1.4,
                    }}>
                      "{pullQuoteHighlight.text.length > 150 ? pullQuoteHighlight.text.slice(0, 150) + '...' : pullQuoteHighlight.text}"
                    </div>
                    <div style={{
                      marginTop: 8, fontFamily: "'Source Serif 4', serif",
                      fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: '#9a8e7e',
                    }}>
                      — {domain}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 48, paddingTop: 14,
          borderTop: '2px solid #2a2418',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{
            fontSize: 11, color: '#6a5e4e',
            fontFamily: "'Source Serif 4', serif",
          }}>
            {highlightCount > 0
              ? `${highlightCount} 处划线${annotationCount > 0 ? ` · ${annotationCount} 处批注` : ''}`
              : '暂无划线'}
          </span>
          <a
            href={page.url}
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: 11, color: '#6a5e4e', textDecoration: 'none',
              fontFamily: "'Source Serif 4', serif",
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#2a2418')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#6a5e4e')}
          >
            查看原文 →
          </a>
        </div>
      </div>
    </div>
  )
}
