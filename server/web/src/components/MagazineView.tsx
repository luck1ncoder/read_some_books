import { useState, useEffect } from 'react'
import { getPageDetail, getHighlightMessages } from '../api'
import { Highlight, HighlightedText, findHighlightsInText, getDomain } from './shared'

interface DocNode {
  type: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'blockquote' | 'img' | 'li' | 'pre' | 'table' | 'hr'
  text?: string
  src?: string
  alt?: string
}

// ── Magazine node renderer ───────────────────────────────────────────────────

function MagNode({ node, highlights, isFirstParagraph }: {
  node: DocNode
  highlights: Highlight[]
  isFirstParagraph?: boolean
}) {
  const text = node.text ?? ''
  const nodeHighlights = node.type !== 'img' ? findHighlightsInText(text, highlights) : []

  const inner = (
    <HighlightedText text={text} highlights={nodeHighlights} />
  )

  switch (node.type) {
    case 'h1':
      return null
    case 'h2':
      return (
        <div style={{
          fontSize: 22, fontWeight: 700, color: '#f5f2ec',
          fontFamily: "'Playfair Display', 'Noto Serif SC', serif",
          marginTop: 36, marginBottom: 14, lineHeight: 1.35,
          breakAfter: 'avoid' as any,
        }}>
          {inner}
        </div>
      )
    case 'h3':
      return (
        <div style={{
          fontSize: 18, fontWeight: 600, color: '#e8e4dc',
          fontFamily: "'Playfair Display', 'Noto Serif SC', serif",
          marginTop: 24, marginBottom: 10, lineHeight: 1.4,
        }}>
          {inner}
        </div>
      )
    case 'h4':
    case 'h5':
    case 'h6':
      return (
        <div style={{
          fontSize: 14, fontWeight: 600, color: '#c8c0b4',
          textTransform: 'uppercase', letterSpacing: '0.06em',
          marginTop: 20, marginBottom: 8, lineHeight: 1.4,
        }}>
          {inner}
        </div>
      )
    case 'blockquote':
      return (
        <div style={{
          borderLeft: '2px solid #2a2620', margin: '20px 0',
          padding: '8px 16px', color: '#8a8478', fontStyle: 'italic',
          fontSize: 15, lineHeight: 1.75, breakInside: 'avoid' as any,
        }}>
          {inner}
        </div>
      )
    case 'li':
      return (
        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
          <span style={{ color: '#6a645a', flexShrink: 0, marginTop: 2 }}>·</span>
          <span style={{ fontSize: 15, lineHeight: 1.85, color: '#c8c0b4' }}>{inner}</span>
        </div>
      )
    case 'pre':
      return (
        <pre style={{
          margin: '16px 0', padding: '14px 16px',
          background: 'rgba(200,169,110,0.05)', border: '1px solid #1a1816',
          borderRadius: 6, fontSize: 12.5, lineHeight: 1.65, color: '#c8c0b4',
          overflow: 'auto', fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
          whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        }}>
          {text}
        </pre>
      )
    case 'table':
      return (
        <div style={{
          margin: '16px 0', padding: '12px 14px',
          background: 'rgba(200,169,110,0.04)', border: '1px solid #1a1816',
          borderRadius: 6, fontSize: 13, lineHeight: 1.7, color: '#c8c0b4', overflow: 'auto',
        }}>
          {text.split('\n').map((row, i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, padding: '3px 0',
              borderBottom: i === 0 ? '1px solid #2a2620' : 'none',
              fontWeight: i === 0 ? 600 : 400,
            }}>
              {row.split(' | ').map((cell, j) => <span key={j} style={{ flex: 1, minWidth: 0 }}>{cell}</span>)}
            </div>
          ))}
        </div>
      )
    case 'hr':
      return <hr style={{ border: 'none', borderTop: '1px solid #1e1c18', margin: '28px 0' }} />
    case 'img':
      return (
        <div style={{ margin: '24px 0', textAlign: 'center', breakInside: 'avoid' as any }}>
          <img
            src={node.src} alt={node.alt ?? ''}
            style={{ maxWidth: '100%', borderRadius: 6, opacity: 0.92 }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
          {node.alt && <div style={{ fontSize: 11, color: '#6a645a', marginTop: 6, fontStyle: 'italic' }}>{node.alt}</div>}
        </div>
      )
    case 'p':
    default:
      if (isFirstParagraph && text.length > 0) {
        return (
          <p style={{
            fontSize: 15, lineHeight: 1.85, color: '#c8c0b4', marginBottom: 18,
          }}>
            <span style={{
              fontFamily: "'Playfair Display', serif", float: 'left',
              fontSize: 82, lineHeight: 0.7, padding: '6px 10px 0 0',
              color: '#f5f2ec', fontWeight: 900,
            }}>
              {text[0]}
            </span>
            <span>
              <HighlightedText text={text.slice(1)} highlights={nodeHighlights} />
            </span>
          </p>
        )
      }
      return (
        <p style={{
          fontSize: 15, lineHeight: 1.85, color: '#c8c0b4', marginBottom: 18,
          textIndent: '2em',
        }}>
          {inner}
        </p>
      )
  }
}

// ── Highlight callout box ────────────────────────────────────────────────────

function HighlightCallout({ hl }: { hl: Highlight }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(200,169,110,0.08), rgba(200,169,110,0.04))',
      borderLeft: '2px solid #c8a96e',
      padding: '14px 16px',
      margin: '20px 0',
      borderRadius: '0 6px 6px 0',
      fontStyle: 'italic',
      color: '#d4c8a8',
      fontSize: 14,
      lineHeight: 1.7,
      breakInside: 'avoid' as any,
    }}>
      <div style={{
        fontSize: 9, fontWeight: 600, letterSpacing: '0.12em',
        textTransform: 'uppercase', color: '#c8a96e',
        fontStyle: 'normal', marginBottom: 4,
      }}>
        ✦ 划线{hl.message_count > 0 ? ' + 批注' : ''}
      </div>
      "{hl.text}"
    </div>
  )
}

// ── Pull quote (column-span: all) ────────────────────────────────────────────

function PullQuote({ text }: { text: string }) {
  return (
    <div style={{
      columnSpan: 'all' as any, margin: '36px 0', padding: '28px 60px',
      position: 'relative', textAlign: 'center',
    }}>
      <div style={{
        position: 'absolute', left: 0, right: 0, top: 0, height: 1,
        background: 'linear-gradient(to right, transparent, rgba(200,169,110,0.38), transparent)',
      }} />
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 1,
        background: 'linear-gradient(to right, transparent, rgba(200,169,110,0.38), transparent)',
      }} />
      <div style={{
        fontFamily: "'Playfair Display', 'Noto Serif SC', serif",
        fontSize: 22, fontStyle: 'italic', color: '#c8a96e', lineHeight: 1.55,
      }}>
        "{text}"
      </div>
    </div>
  )
}

// ── MagazineView ─────────────────────────────────────────────────────────────

export function MagazineView({ pageId }: { pageId: string }) {
  const [page, setPage] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getPageDetail(pageId).then(data => { setPage(data); setLoading(false) })
  }, [pageId])

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div style={{
        background: '#0a0a0c', borderRadius: 12, padding: '60px 48px 80px',
        maxWidth: 1100, margin: '0 auto',
      }}>
        {[70, 40, 90, 80, 60, 85, 50].map((w, i) => (
          <div key={i} style={{
            height: i === 0 ? 32 : 14, background: '#16151a',
            borderRadius: 4, width: `${w}%`, marginBottom: i === 0 ? 24 : 12,
            animation: 'pulse 1.8s ease-in-out infinite',
          }} />
        ))}
      </div>
    )
  }

  // ── Empty state ──
  if (!page) {
    return (
      <div style={{
        background: '#0a0a0c', borderRadius: 12, padding: '80px 48px',
        maxWidth: 1100, margin: '0 auto', textAlign: 'center',
      }}>
        <div style={{ fontSize: 15, color: '#6a645a' }}>暂无内容</div>
      </div>
    )
  }

  const highlights: Highlight[] = page.highlights ?? []
  let nodes: DocNode[] = []
  try { nodes = page.doc_structure ? JSON.parse(page.doc_structure) : [] } catch { nodes = [] }
  if (nodes.length === 0) {
    return (
      <div style={{
        background: '#0a0a0c', borderRadius: 12, padding: '80px 48px',
        maxWidth: 1100, margin: '0 auto', textAlign: 'center',
      }}>
        <div style={{ fontSize: 15, color: '#6a645a' }}>暂无文档结构</div>
      </div>
    )
  }

  const domain = getDomain(page.url)
  const h1Node = nodes.find(n => n.type === 'h1')
  const title = h1Node?.text ?? page.title ?? ''
  const firstP = nodes.find(n => n.type === 'p' && (n.text ?? '').length > 0)
  const subtitle = firstP ? (firstP.text!.length > 120 ? firstP.text!.slice(0, 120) + '…' : firstP.text!) : ''
  const highlightCount = highlights.length
  const annotationCount = highlights.filter(h => h.message_count > 0).length
  const dateStr = new Date(page.saved_at).toLocaleDateString('zh-CN')

  // Collect pull-quote candidates from highlights
  const pullQuoteCandidates = highlights.filter(h => h.text.length >= 20 && h.text.length <= 200)

  // Track paragraph index for pull-quote insertion & first-p detection
  let pCount = 0
  let pullQuoteIdx = 0
  let isFirstP = true

  // Build rendered body elements
  const bodyElements: React.ReactNode[] = []

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i]
    const text = node.text ?? ''
    const isP = node.type === 'p'

    if (isP) pCount++

    // Determine first-paragraph flag
    let firstParagraph = false
    if (isP && isFirstP) {
      firstParagraph = true
      isFirstP = false
    }

    // Render the node
    bodyElements.push(
      <MagNode key={`node-${i}`} node={node} highlights={highlights} isFirstParagraph={firstParagraph} />
    )

    // After the node, check for highlight callouts in this text
    if (text && node.type !== 'img') {
      const matched = findHighlightsInText(text, highlights)
      for (const hl of matched) {
        bodyElements.push(<HighlightCallout key={`hl-${hl.id}-${i}`} hl={hl} />)
      }
    }

    // Insert pull quote every ~6 paragraphs
    if (isP && pCount > 0 && pCount % 6 === 0 && pullQuoteIdx < pullQuoteCandidates.length) {
      bodyElements.push(
        <PullQuote key={`pq-${pullQuoteIdx}`} text={pullQuoteCandidates[pullQuoteIdx].text} />
      )
      pullQuoteIdx++
    }
  }

  return (
    <div style={{
      background: '#0a0a0c', borderRadius: 12, position: 'relative',
      maxWidth: 1100, margin: '0 auto', overflow: 'hidden',
    }}>
      {/* Ambient glows */}
      <div style={{
        position: 'absolute', top: 200, right: 60, width: 220, height: 220,
        background: 'radial-gradient(circle, rgba(200,169,110,0.07), transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: 300, left: 40, width: 180, height: 180,
        background: 'radial-gradient(circle, rgba(140,120,200,0.05), transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ padding: '60px 48px 80px', position: 'relative', zIndex: 1 }}>

        {/* ── Header ── */}
        <header style={{ marginBottom: 48 }}>
          {/* Category label with gradient line */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24,
          }}>
            <span style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.2em',
              textTransform: 'uppercase', color: '#c8a96e', flexShrink: 0,
            }}>
              {domain}
            </span>
            <div style={{
              flex: 1, height: 1,
              background: 'linear-gradient(to right, #c8a96e, transparent)',
            }} />
          </div>

          {/* Title */}
          <h1 style={{
            fontFamily: "'Playfair Display', 'Noto Serif SC', serif",
            fontSize: 58, fontWeight: 900, color: '#f5f2ec',
            letterSpacing: -2, lineHeight: 1.08, maxWidth: 800,
            margin: '0 0 20px',
          }}>
            {title}
          </h1>

          {/* Subtitle */}
          {subtitle && (
            <p style={{
              fontSize: 17, fontStyle: 'italic', color: '#9a948a',
              lineHeight: 1.6, maxWidth: 560, margin: '0 0 24px',
            }}>
              {subtitle}
            </p>
          )}

          {/* Meta line */}
          <div style={{
            fontSize: 11, color: '#6a645a', display: 'flex',
            alignItems: 'center', gap: 6, letterSpacing: '0.04em',
          }}>
            <span>{domain}</span>
            <span style={{ color: '#3a3630' }}>·</span>
            <span>{dateStr}</span>
            <span style={{ color: '#3a3630' }}>·</span>
            <span>{highlightCount} 处划线</span>
            {annotationCount > 0 && (
              <>
                <span style={{ color: '#3a3630' }}>·</span>
                <span>{annotationCount} 处批注</span>
              </>
            )}
          </div>

          {/* Divider with diamond ornament */}
          <div style={{
            position: 'relative', marginTop: 32, height: 1,
            background: '#1e1c18',
          }}>
            <div style={{
              position: 'absolute', left: '50%', top: '50%',
              transform: 'translate(-50%, -50%) rotate(45deg)',
              width: 7, height: 7, background: '#0a0a0c',
              border: '1px solid #2a2620',
            }} />
          </div>
        </header>

        {/* ── Body columns ── */}
        <div style={{
          columnCount: 3, columnGap: 40,
          columnRule: '1px solid #1a1816',
          fontFamily: "'Source Serif 4', 'Noto Serif SC', serif",
          fontSize: 15, lineHeight: 1.85, color: '#c8c0b4',
          textAlign: 'justify' as any,
        }}>
          {bodyElements}
        </div>

        {/* ── Footer ── */}
        <div style={{
          marginTop: 48, paddingTop: 16,
          borderTop: '1px solid #1e1c18',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 11, color: '#6a645a' }}>
            {highlightCount > 0 ? `${highlightCount} 处划线` : '暂无划线'}
          </span>
          <a
            href={page.url} target="_blank" rel="noreferrer"
            style={{
              fontSize: 11, color: '#c8a96e', textDecoration: 'none',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#e0c98e')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = '#c8a96e')}
          >
            查看原文 →
          </a>
        </div>
      </div>
    </div>
  )
}
