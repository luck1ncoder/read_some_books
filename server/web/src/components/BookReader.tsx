import { useState, useEffect, useRef, useCallback } from 'react'
import { getPageDetail } from '../api'
import { Highlight, getDomain } from './shared'
import { DocNode, BookNode, AnnotPopover } from './BookView'
import { ArticleView } from './ArticleView'

// ── Pagination ────────────────────────────────────────────────────────────────

const PAGE_HEIGHT = 520  // iBooks-style taller content area

function paginateNodes(nodes: DocNode[], containerRef: HTMLDivElement): DocNode[][] {
  if (nodes.length === 0) return []

  const measure = document.createElement('div')
  measure.style.cssText = `
    visibility: hidden; position: absolute; left: -9999px; top: 0;
    width: ${containerRef.offsetWidth || 360}px;
    font-family: 'Georgia', 'Noto Serif SC', serif; font-size: 16px; line-height: 1.9;
    padding: 0;
  `
  document.body.appendChild(measure)

  const pages: DocNode[][] = []
  let currentPage: DocNode[] = []
  let currentHeight = 0

  for (const node of nodes) {
    const el = document.createElement('div')
    switch (node.type) {
      case 'h1': el.style.cssText = 'font-size:26px;font-weight:700;line-height:1.3;margin-bottom:12px;'; break
      case 'h2': el.style.cssText = 'font-size:18px;font-weight:700;margin-top:28px;margin-bottom:10px;'; break
      case 'h3': el.style.cssText = 'font-size:15px;font-weight:600;margin-top:20px;margin-bottom:8px;'; break
      case 'h4': el.style.cssText = 'font-size:14px;font-weight:600;margin-top:16px;margin-bottom:6px;'; break
      case 'h5': case 'h6': el.style.cssText = 'font-size:13px;font-weight:600;margin-top:14px;margin-bottom:5px;'; break
      case 'blockquote': el.style.cssText = 'border-left:3px solid #c8c0b0;margin:18px 0;padding:10px 18px;font-size:15px;line-height:1.75;'; break
      case 'li': el.style.cssText = 'display:flex;gap:8px;margin-bottom:6px;font-size:15px;line-height:1.8;'; break
      case 'pre': el.style.cssText = 'margin:16px 0;padding:14px 16px;font-size:12.5px;line-height:1.65;white-space:pre-wrap;word-break:break-word;'; break
      case 'table': el.style.cssText = 'margin:16px 0;padding:12px 14px;font-size:13px;line-height:1.7;'; break
      case 'hr': el.style.cssText = 'margin:28px 0;border:none;border-top:1px solid rgba(0,0,0,0.08);height:1px;'; break
      case 'img': el.style.cssText = 'margin:24px 0;height:120px;'; break
      default: el.style.cssText = 'font-size:16px;line-height:1.9;margin-bottom:16px;'; break
    }
    el.textContent = node.text ?? (node.type === 'img' ? '[image]' : '')
    measure.appendChild(el)
    const nodeHeight = el.offsetHeight
    if (currentPage.length > 0 && currentHeight + nodeHeight > PAGE_HEIGHT) {
      pages.push(currentPage)
      currentPage = [node]
      currentHeight = nodeHeight
    } else {
      currentPage.push(node)
      currentHeight += nodeHeight
    }
    measure.removeChild(el)
  }

  if (currentPage.length > 0) pages.push(currentPage)
  document.body.removeChild(measure)
  return pages
}

function textToDocNodes(text: string): DocNode[] {
  return text.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0).map(text => ({ type: 'p' as const, text }))
}

// ── iBooks page content ───────────────────────────────────────────────────────

function IBookPage({ nodes, highlights, pageNum, totalPages, onHighlightClick, openHighlightId, openHighlight, onCloseAnnot }: {
  nodes: DocNode[]
  highlights: Highlight[]
  pageNum: number
  totalPages: number
  onHighlightClick: (h: Highlight) => void
  openHighlightId: string | null
  openHighlight: Highlight | null
  onCloseAnnot: () => void
}) {
  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Georgia', 'Noto Serif SC', 'Source Han Serif SC', serif",
    }}>
      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {nodes.map((node, idx) => (
          <div key={idx} style={{ position: 'relative' }}>
            <BookNode
              node={node}
              highlights={highlights}
              onHighlightClick={onHighlightClick}
              openHighlightId={openHighlightId}
            />
            {openHighlight && node.text && node.text.includes(openHighlight.text.slice(0, 80)) && (
              <AnnotPopover highlight={openHighlight} onClose={onCloseAnnot} />
            )}
          </div>
        ))}
      </div>

      {/* Page number — bottom center, subtle */}
      <div style={{
        textAlign: 'center', paddingTop: 12,
        fontSize: 11, color: '#999', letterSpacing: '0.02em',
        fontFamily: "-apple-system, 'Helvetica Neue', sans-serif",
      }}>
        {pageNum}
      </div>
    </div>
  )
}

// ── FlipState ─────────────────────────────────────────────────────────────────

type FlipState = 'idle' | 'flipping-forward' | 'flipping-backward'

// ── BookReader (iBooks style) ─────────────────────────────────────────────────

export function BookReader({ pageId, mode }: {
  pageId: string
  mode: 'book' | 'article' | 'grid'
  coverColor?: string
  coverColorDark?: string
}) {
  const [page, setPage] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [pages, setPages] = useState<DocNode[][]>([])
  const [paginating, setPaginating] = useState(false)
  const [currentSpread, setCurrentSpread] = useState(0)
  const [flipState, setFlipState] = useState<FlipState>('idle')
  const [openHighlightId, setOpenHighlightId] = useState<string | null>(null)
  const [openHighlight, setOpenHighlight] = useState<Highlight | null>(null)
  const [isWide, setIsWide] = useState(window.innerWidth >= 900)
  const measureRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onResize() { setIsWide(window.innerWidth >= 900) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    setLoading(true)
    getPageDetail(pageId).then(data => { setPage(data); setLoading(false) })
  }, [pageId])

  useEffect(() => {
    if (!page) return
    setPaginating(true)
    function doPaginate() {
      if (!measureRef.current) { requestAnimationFrame(doPaginate); return }
      let nodes: DocNode[] = []
      try { nodes = page.doc_structure ? JSON.parse(page.doc_structure) : [] } catch {}
      if (nodes.length === 0 && page.full_text) nodes = textToDocNodes(page.full_text)
      if (nodes.length === 0) { setPages([]); setPaginating(false); return }
      setPages(paginateNodes(nodes, measureRef.current))
      setCurrentSpread(0)
      setPaginating(false)
    }
    requestAnimationFrame(doPaginate)
  }, [page])

  const highlights: Highlight[] = page?.highlights ?? []
  const totalPages = pages.length
  const pagesPerSpread = isWide ? 2 : 1
  const maxSpread = Math.max(0, Math.ceil(totalPages / pagesPerSpread) - 1)
  const canGoForward = currentSpread < maxSpread
  const canGoBackward = currentSpread > 0

  const goForward = useCallback(() => {
    if (!canGoForward || flipState !== 'idle') return
    setFlipState('flipping-forward')
    setTimeout(() => {
      setCurrentSpread(s => Math.min(s + 1, maxSpread))
      setFlipState('idle')
      setOpenHighlightId(null); setOpenHighlight(null)
    }, 400)
  }, [canGoForward, flipState, maxSpread])

  const goBackward = useCallback(() => {
    if (!canGoBackward || flipState !== 'idle') return
    setFlipState('flipping-backward')
    setTimeout(() => {
      setCurrentSpread(s => Math.max(s - 1, 0))
      setFlipState('idle')
      setOpenHighlightId(null); setOpenHighlight(null)
    }, 400)
  }, [canGoBackward, flipState])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); goForward() }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); goBackward() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [goForward, goBackward])

  function handleHighlightClick(h: Highlight) {
    if (openHighlightId === h.id) { setOpenHighlightId(null); setOpenHighlight(null) }
    else { setOpenHighlightId(h.id); setOpenHighlight(h) }
  }
  function handleCloseAnnot() { setOpenHighlightId(null); setOpenHighlight(null) }

  const domain = getDomain(page?.url ?? '')
  const title = page?.title ?? ''
  const leftPageIdx = currentSpread * pagesPerSpread
  const rightPageIdx = isWide ? leftPageIdx + 1 : -1
  // Only fall back if loading is done, pagination is done, and still no pages
  const showFallback = !loading && !paginating && pages.length === 0
  if (showFallback) return <ArticleView pageId={pageId} />

  const progress = totalPages > 0 ? ((leftPageIdx + 1) / totalPages) * 100 : 0

  // Page dimensions
  const pageW = isWide ? 400 : Math.min(480, window.innerWidth - 80)
  const pageH = 620

  return (
    <div style={{ position: 'relative' }}>
      {/* Hidden measure container */}
      <div ref={measureRef} style={{
        visibility: 'hidden', position: 'absolute', left: -9999, top: 0,
        width: pageW - 80, /* subtract padding */
      }} />

      {/* ── Top bar (iBooks style) ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 4px 16px',
        borderBottom: '1px solid rgba(0,0,0,0.06)',
        marginBottom: 20,
      }}>
        <span style={{
          fontSize: 11, color: '#999', letterSpacing: '0.04em',
          fontFamily: "-apple-system, 'Helvetica Neue', sans-serif",
        }}>
          {domain}
        </span>
        <span style={{
          fontSize: 13, fontWeight: 500, color: '#444',
          maxWidth: isWide ? 500 : 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          fontFamily: "-apple-system, 'PingFang SC', sans-serif",
        }}>
          {title}
        </span>
        <span style={{
          fontSize: 11, color: '#999',
          fontFamily: "-apple-system, 'Helvetica Neue', sans-serif",
        }}>
          {isWide
            ? `${leftPageIdx + 1}–${Math.min(rightPageIdx + 1, totalPages)} / ${totalPages}`
            : `${leftPageIdx + 1} / ${totalPages}`
          }
        </span>
      </div>

      {/* ── Book pages area ── */}
      <div style={{
        display: 'flex', justifyContent: 'center',
        gap: 0,
        position: 'relative',
        userSelect: flipState !== 'idle' ? 'none' : 'auto',
      }}>
        {/* Left page */}
        <div style={{
          ...ibooksPageStyle(pageW, pageH),
          borderRadius: isWide ? '4px 0 0 4px' : 4,
          boxShadow: isWide
            ? '0 1px 4px rgba(0,0,0,0.08), -2px 0 8px rgba(0,0,0,0.04)'
            : '0 2px 12px rgba(0,0,0,0.1), 0 0 1px rgba(0,0,0,0.06)',
          opacity: flipState === 'flipping-forward' ? 0.7 : 1,
          transition: 'opacity 400ms ease',
        }}>
          {/* Subtle left-page inner shadow for gutter */}
          {isWide && <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: 30,
            background: 'linear-gradient(to left, rgba(0,0,0,0.03), transparent)',
            pointerEvents: 'none', zIndex: 1,
          }} />}

          {(loading || paginating) ? <PageSkeleton /> : pages[leftPageIdx] ? (
            <IBookPage
              nodes={pages[leftPageIdx]}
              highlights={highlights}
              pageNum={leftPageIdx + 1}
              totalPages={totalPages}
              onHighlightClick={handleHighlightClick}
              openHighlightId={openHighlightId}
              openHighlight={openHighlight}
              onCloseAnnot={handleCloseAnnot}
            />
          ) : null}
        </div>

        {/* Center gutter — thin vertical line */}
        {isWide && (
          <div style={{
            width: 1, flexShrink: 0,
            background: 'rgba(0,0,0,0.08)',
            boxShadow: '1px 0 3px rgba(0,0,0,0.04), -1px 0 3px rgba(0,0,0,0.04)',
          }} />
        )}

        {/* Right page */}
        {isWide && (
          <div style={{
            ...ibooksPageStyle(pageW, pageH),
            borderRadius: '0 4px 4px 0',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08), 2px 0 8px rgba(0,0,0,0.04)',
            opacity: flipState === 'flipping-backward' ? 0.7 : 1,
            transition: 'opacity 400ms ease',
          }}>
            {/* Subtle right-page inner shadow for gutter */}
            <div style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 30,
              background: 'linear-gradient(to right, rgba(0,0,0,0.03), transparent)',
              pointerEvents: 'none', zIndex: 1,
            }} />

            {/* Page curl hint — bottom-right corner */}
            <div style={{
              position: 'absolute', right: 0, bottom: 0,
              width: 28, height: 28,
              background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.04) 50%)',
              borderRadius: '0 0 4px 0',
              pointerEvents: 'none', zIndex: 1,
            }} />

            {(loading || paginating) ? <PageSkeleton /> : pages[rightPageIdx] ? (
              <IBookPage
                nodes={pages[rightPageIdx]}
                highlights={highlights}
                pageNum={rightPageIdx + 1}
                totalPages={totalPages}
                onHighlightClick={handleHighlightClick}
                openHighlightId={openHighlightId}
                openHighlight={openHighlight}
                onCloseAnnot={handleCloseAnnot}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Georgia', serif",
              }}>
                <span style={{ fontSize: 13, color: '#bbb', fontStyle: 'italic' }}>- fin -</span>
              </div>
            )}
          </div>
        )}

        {/* Page curl hint — single page mode */}
        {!isWide && (
          <div style={{
            position: 'absolute', right: 0, bottom: 0,
            width: 28, height: 28,
            background: 'linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.04) 50%)',
            borderRadius: '0 0 4px 0',
            pointerEvents: 'none',
          }} />
        )}

        {/* Click zones */}
        <div
          onClick={goBackward}
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0, width: '30%',
            cursor: canGoBackward ? 'pointer' : 'default', zIndex: 5,
          }}
        />
        <div
          onClick={goForward}
          style={{
            position: 'absolute', right: 0, top: 0, bottom: 0, width: '30%',
            cursor: canGoForward ? 'pointer' : 'default', zIndex: 5,
          }}
        />
      </div>

      {/* ── Bottom progress bar (iBooks style) ── */}
      <div style={{ padding: '20px 0 0' }}>
        {/* Progress track */}
        <div style={{
          position: 'relative', height: 3, borderRadius: 2,
          background: 'rgba(0,0,0,0.06)',
          margin: '0 4px',
        }}>
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${progress}%`,
            background: '#888',
            borderRadius: 2,
            transition: 'width 300ms ease',
          }} />
        </div>

        {/* Nav controls */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 0 0',
          fontFamily: "-apple-system, 'Helvetica Neue', sans-serif",
        }}>
          <button
            onClick={goBackward}
            disabled={!canGoBackward || flipState !== 'idle'}
            style={{
              ...navBtnStyle,
              opacity: canGoBackward ? 1 : 0.3,
              cursor: canGoBackward ? 'pointer' : 'default',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <span style={{ fontSize: 11, color: '#999' }}>
            {Math.round(progress)}%
          </span>

          <button
            onClick={goForward}
            disabled={!canGoForward || flipState !== 'idle'}
            style={{
              ...navBtnStyle,
              opacity: canGoForward ? 1 : 0.3,
              cursor: canGoForward ? 'pointer' : 'default',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div style={{ padding: '8px 0' }}>
      {[75, 100, 90, 100, 85, 100, 60, 100, 95, 45].map((w, i) => (
        <div key={i} style={{
          height: i === 0 ? 22 : 13,
          background: '#eee',
          borderRadius: 3,
          width: `${w}%`,
          marginBottom: i === 0 ? 18 : 10,
        }} />
      ))}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

function ibooksPageStyle(w: number, h: number): React.CSSProperties {
  return {
    width: w,
    height: h,
    background: '#fafafa',
    padding: '40px 44px 24px',
    position: 'relative',
    overflow: 'hidden',
    boxSizing: 'border-box' as const,
  }
}

const navBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none',
  color: '#666', padding: '4px 8px',
  fontFamily: 'inherit',
  display: 'flex', alignItems: 'center',
}
