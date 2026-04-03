import { useState, useEffect, useRef, useCallback } from 'react'
import { getCards, getPageDetail } from '../api'
import { getDomain } from './shared'
import { BookReader } from './BookReader'
import { ArticleView } from './ArticleView'
import { CardFeedView } from './CardFeedView'
import { MagazineView } from './MagazineView'
import { NewspaperView } from './NewspaperView'
import { DynamicLayoutView } from './DynamicLayoutView'

// ── Types ─────────────────────────────────────────────────────────────────────

interface BookInfo {
  pageId: string
  pageUrl: string
  pageTitle: string
  domain: string
  highlightCount: number
  savedAt: number
  mode: 'book' | 'article' | 'grid'
}

// ── Cover color palette ───────────────────────────────────────────────────────

const COVER_COLORS = [
  { bg: '#8B4513', fg: '#e8d5c0' },
  { bg: '#2F4F4F', fg: '#c8dcd0' },
  { bg: '#4A3728', fg: '#ddd0c4' },
  { bg: '#1B3A4B', fg: '#b8d0dc' },
  { bg: '#3C2415', fg: '#dac8b8' },
  { bg: '#2D4A3E', fg: '#c0d8cc' },
  { bg: '#5C3D2E', fg: '#e0ccbc' },
  { bg: '#2E3A4E', fg: '#c0c8d8' },
]

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

function getCoverColor(domain: string) {
  return COVER_COLORS[hashCode(domain) % COVER_COLORS.length]
}

// ── BookCover ─────────────────────────────────────────────────────────────────

function BookCover({ book, onClick }: { book: BookInfo; onClick: () => void }) {
  const color = getCoverColor(book.domain)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 140, height: 195, flexShrink: 0,
        background: `linear-gradient(145deg, ${color.bg}, ${color.bg}dd)`,
        borderRadius: '3px 8px 8px 3px',
        position: 'relative', cursor: 'pointer',
        transform: hovered
          ? 'perspective(800px) rotateY(-3deg) translateY(-10px)'
          : 'perspective(800px) rotateY(-5deg)',
        transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1), box-shadow 0.25s ease',
        boxShadow: hovered
          ? '6px 8px 18px rgba(60,45,25,0.3), 1px 1px 3px rgba(60,45,25,0.15)'
          : '3px 4px 10px rgba(60,45,25,0.22), 1px 1px 2px rgba(60,45,25,0.1)',
        transformOrigin: 'left center',
        display: 'flex', flexDirection: 'column',
        padding: '16px 14px 12px 18px',
        overflow: 'hidden',
      }}
    >
      {/* Spine edge */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 5,
        background: 'linear-gradient(to right, rgba(0,0,0,0.3), rgba(0,0,0,0.05))',
        borderRadius: '3px 0 0 3px',
      }} />

      {/* Top decoration line */}
      <div style={{ height: 1, background: `${color.fg}30`, marginBottom: 14 }} />

      {/* Domain */}
      <div style={{
        fontSize: 9, fontWeight: 500, letterSpacing: '0.12em', textTransform: 'uppercase',
        color: `${color.fg}90`, marginBottom: 10, lineHeight: 1.3,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {book.domain}
      </div>

      {/* Title */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center',
      }}>
        <div style={{
          fontSize: 13, fontWeight: 600, lineHeight: 1.45, color: color.fg,
          display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical' as any,
          overflow: 'hidden', wordBreak: 'break-word',
        }}>
          {book.pageTitle || book.domain}
        </div>
      </div>

      {/* Bottom decoration + highlight count */}
      <div>
        <div style={{ height: 1, background: `${color.fg}25`, marginBottom: 8 }} />
        <div style={{
          fontSize: 9, color: `${color.fg}70`, letterSpacing: '0.06em',
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <span style={{ display: 'inline-block', width: 5, height: 5, borderRadius: 1, background: 'rgba(251,211,62,0.6)' }} />
          {book.highlightCount} 处划线
        </div>
      </div>
    </div>
  )
}

// ── Wooden shelf row ──────────────────────────────────────────────────────────

function ShelfRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      {/* Books */}
      <div style={{
        display: 'flex', gap: 18, padding: '20px 24px 14px',
        alignItems: 'flex-end', flexWrap: 'wrap',
        minHeight: 220,
      }}>
        {children}
      </div>
      {/* Wooden plank */}
      <div style={{
        height: 16,
        background: 'linear-gradient(to bottom, #c8b89c 0%, #b8a88e 35%, #a89878 65%, #bca88c 100%)',
        borderRadius: '0 0 3px 3px',
        boxShadow: '0 3px 6px rgba(120,100,70,0.18), inset 0 1px 0 rgba(255,255,255,0.25)',
        position: 'relative',
      }}>
        {/* Wood grain lines */}
        <div style={{
          position: 'absolute', inset: 0, borderRadius: '0 0 3px 3px',
          background: 'repeating-linear-gradient(90deg, transparent, transparent 45px, rgba(90,70,40,0.04) 45px, rgba(90,70,40,0.04) 47px)',
        }} />
        {/* Front lip shadow */}
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: -2, height: 2,
          background: 'linear-gradient(to bottom, rgba(120,100,70,0.08), transparent)',
        }} />
      </div>
    </div>
  )
}

// ── Bookshelf ─────────────────────────────────────────────────────────────────

export function Bookshelf() {
  const [books, setBooks] = useState<BookInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [openBook, setOpenBook] = useState<BookInfo | null>(null)
  const [animPhase, setAnimPhase] = useState<'shelf' | 'opening' | 'reading' | 'closing'>('shelf')
  const [flyStyle, setFlyStyle] = useState<React.CSSProperties>({})
  const [readMode, setReadMode] = useState<'book' | 'scroll' | 'cards' | 'magazine' | 'newspaper' | 'dynamic'>('book')
  const [fullscreen, setFullscreen] = useState(false)
  const coverRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const fullscreenRef = useRef<HTMLDivElement>(null)

  // Load all books (grouped by page_url)
  const loadBooks = useCallback(async () => {
    const cards: any[] = await getCards()
    const pageMap = new Map<string, { pageId: string; pageUrl: string; pageTitle: string; domain: string; highlightCount: number; savedAt: number }>()

    for (const c of cards) {
      const url = c.page_url || ''
      if (!pageMap.has(url)) {
        pageMap.set(url, {
          pageId: c.page_id || '',
          pageUrl: url,
          pageTitle: c.page_title || '',
          domain: url ? getDomain(url) : '未知',
          highlightCount: 0,
          savedAt: c.created_at,
        })
      }
      pageMap.get(url)!.highlightCount++
    }

    const entries = Array.from(pageMap.values()).sort((a, b) => b.savedAt - a.savedAt)
    const booksWithMode: BookInfo[] = []

    for (const entry of entries) {
      let mode: 'book' | 'article' | 'grid' = 'grid'
      if (entry.pageId) {
        try {
          const detail = await getPageDetail(entry.pageId)
          if (detail?.doc_structure && detail.doc_structure.length > 2) mode = 'book'
          else if (detail?.full_text && detail.full_text.length > 0) mode = 'article'
        } catch {}
      }
      booksWithMode.push({ ...entry, mode })
    }

    setBooks(booksWithMode)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadBooks()
    const timer = setInterval(loadBooks, 5000)
    const onVisible = () => { if (document.visibilityState === 'visible') loadBooks() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible) }
  }, [])

  // Open book with fly animation
  const handleOpen = useCallback((book: BookInfo) => {
    const el = coverRefs.current.get(book.pageId)
    if (!el) {
      // No animation, just open
      setOpenBook(book)
      setAnimPhase('reading')
      return
    }

    const rect = el.getBoundingClientRect()
    // Start: at cover position
    setFlyStyle({
      position: 'fixed',
      left: rect.left, top: rect.top,
      width: rect.width, height: rect.height,
      zIndex: 9999,
      transition: 'none',
      opacity: 1,
      borderRadius: '3px 8px 8px 3px',
      pointerEvents: 'none',
    })
    setOpenBook(book)
    setAnimPhase('opening')

    // Next frame: animate to center
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const targetW = Math.min(window.innerWidth - 80, 900)
        const targetH = Math.min(window.innerHeight - 120, 640)
        setFlyStyle({
          position: 'fixed',
          left: (window.innerWidth - targetW) / 2,
          top: (window.innerHeight - targetH) / 2,
          width: targetW, height: targetH,
          zIndex: 9999,
          transition: 'all 450ms cubic-bezier(0.4,0,0.2,1)',
          opacity: 0,
          borderRadius: 12,
          pointerEvents: 'none',
        })

        setTimeout(() => {
          setAnimPhase('reading')
        }, 460)
      })
    })
  }, [])

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!fullscreen) {
      fullscreenRef.current?.requestFullscreen?.().catch(() => {})
      setFullscreen(true)
    } else {
      document.exitFullscreen?.().catch(() => {})
      setFullscreen(false)
    }
  }, [fullscreen])

  // Listen for fullscreen change (e.g. user presses Escape in fullscreen)
  useEffect(() => {
    function onFsChange() {
      if (!document.fullscreenElement) setFullscreen(false)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // Close book
  const handleClose = useCallback(() => {
    if (!openBook) return
    if (fullscreen) { document.exitFullscreen?.().catch(() => {}); setFullscreen(false) }

    const el = coverRefs.current.get(openBook.pageId)

    if (!el) {
      setAnimPhase('shelf')
      setOpenBook(null)
      setReadMode('book')
      return
    }

    setAnimPhase('closing')
    const rect = el.getBoundingClientRect()

    // Start from reader position
    const targetW = Math.min(window.innerWidth - 80, 900)
    const targetH = Math.min(window.innerHeight - 120, 640)
    setFlyStyle({
      position: 'fixed',
      left: (window.innerWidth - targetW) / 2,
      top: (window.innerHeight - targetH) / 2,
      width: targetW, height: targetH,
      zIndex: 9999,
      transition: 'none',
      opacity: 0,
      borderRadius: 12,
      pointerEvents: 'none',
    })

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setFlyStyle({
          position: 'fixed',
          left: rect.left, top: rect.top,
          width: rect.width, height: rect.height,
          zIndex: 9999,
          transition: 'all 400ms cubic-bezier(0.4,0,0.2,1)',
          opacity: 1,
          borderRadius: '3px 8px 8px 3px',
          pointerEvents: 'none',
        })

        setTimeout(() => {
          setAnimPhase('shelf')
          setOpenBook(null)
          setReadMode('book')
        }, 410)
      })
    })
  }, [openBook, fullscreen])

  // Keyboard: Escape to close (fullscreen exit is handled by browser natively)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && animPhase === 'reading' && !fullscreen) handleClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [animPhase, handleClose, fullscreen])

  // Split books into shelf rows (5 per row)
  const BOOKS_PER_ROW = 5
  const rows: BookInfo[][] = []
  for (let i = 0; i < books.length; i += BOOKS_PER_ROW) {
    rows.push(books.slice(i, i + BOOKS_PER_ROW))
  }

  if (loading) {
    return (
      <div style={{ background: '#f0ebe2', borderRadius: 12, padding: '32px 20px', minHeight: 300, border: '1px solid rgba(180,165,140,0.25)' }}>
        <ShelfRow>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              width: 140, height: 195, borderRadius: '3px 8px 8px 3px',
              background: 'linear-gradient(145deg, #d4c9b8, #c8bda8)',
              opacity: 0.5,
            }} />
          ))}
        </ShelfRow>
      </div>
    )
  }

  if (books.length === 0) {
    return (
      <div style={{ background: '#f0ebe2', borderRadius: 12, padding: '60px 20px', textAlign: 'center', border: '1px solid rgba(180,165,140,0.25)' }}>
        <div style={{ fontSize: 40, marginBottom: 16, opacity: 0.3 }}>📚</div>
        <p style={{ fontSize: 15, color: '#7a6e5e', fontWeight: 500, margin: '0 0 6px' }}>书架上还没有书</p>
        <p style={{ fontSize: 13, color: '#a09480', margin: 0 }}>在网页上划线后，点击「存为书页」将文章收入书架</p>
      </div>
    )
  }

  const shelfVisible = animPhase === 'shelf' || animPhase === 'opening' || animPhase === 'closing'
  const readerVisible = animPhase === 'reading'

  return (
    <div style={{ position: 'relative' }}>
      {/* Shelf */}
      <div style={{
        background: 'linear-gradient(180deg, #f0ebe2 0%, #e8e0d2 100%)',
        borderRadius: 12,
        padding: '16px 12px 4px',
        opacity: animPhase === 'opening' || animPhase === 'closing' ? 0.3 : 1,
        transition: 'opacity 300ms ease',
        display: shelfVisible ? 'block' : 'none',
        border: '1px solid rgba(180,165,140,0.25)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 2px 8px rgba(120,100,70,0.08)',
      }}>
        {/* Shelf header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 16px 16px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8a7e6e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span style={{ fontSize: 13, color: '#7a6e5e', fontWeight: 500, letterSpacing: '0.04em' }}>
            我的书架 · {books.length} 本
          </span>
        </div>

        {rows.map((row, ri) => (
          <ShelfRow key={ri}>
            {row.map(book => (
              <div key={book.pageId} ref={el => { if (el) coverRefs.current.set(book.pageId, el); else coverRefs.current.delete(book.pageId) }}>
                <BookCover book={book} onClick={() => handleOpen(book)} />
              </div>
            ))}
          </ShelfRow>
        ))}
      </div>

      {/* Flying cover (animation) */}
      {(animPhase === 'opening' || animPhase === 'closing') && openBook && (
        <div style={{
          ...flyStyle,
          background: `linear-gradient(145deg, ${getCoverColor(openBook.domain).bg}, ${getCoverColor(openBook.domain).bg}dd)`,
        }} />
      )}

      {/* Reader overlay */}
      {readerVisible && openBook && (
        <div
          ref={fullscreenRef}
          style={{
            background: fullscreen ? '#f9f9fb' : 'transparent',
            padding: fullscreen ? '20px 40px' : 0,
            height: fullscreen ? '100vh' : 'auto',
            overflow: fullscreen ? 'auto' : 'visible',
            boxSizing: 'border-box',
          }}
        >
          {/* Toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 16,
          }}>
            {/* Left: back button */}
            <button
              onClick={handleClose}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 13, color: '#9aa3ab', padding: '8px 0',
                fontFamily: 'inherit', transition: 'color 0.12s',
              }}
              onMouseEnter={e => (e.currentTarget.style.color = '#596065')}
              onMouseLeave={e => (e.currentTarget.style.color = '#9aa3ab')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
              </svg>
              返回书架
            </button>

            {/* Right: mode toggle + fullscreen */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {/* Mode toggle */}
              <div style={{
                display: 'flex', borderRadius: 6,
                border: '1px solid #e0ddd8',
                overflow: 'hidden',
              }}>
                <button
                  onClick={() => setReadMode('book')}
                  title="分页阅读"
                  style={{
                    ...toolBtnStyle,
                    background: readMode === 'book' ? '#e8e4de' : 'transparent',
                    color: readMode === 'book' ? '#4a4540' : '#b0a99e',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                </button>
                <button
                  onClick={() => setReadMode('scroll')}
                  title="滚动阅读"
                  style={{
                    ...toolBtnStyle,
                    background: readMode === 'scroll' ? '#e8e4de' : 'transparent',
                    color: readMode === 'scroll' ? '#4a4540' : '#b0a99e',
                    borderLeft: '1px solid #e0ddd8',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                  </svg>
                </button>
                <button
                  onClick={() => setReadMode('cards')}
                  title="精华卡片"
                  style={{
                    ...toolBtnStyle,
                    background: readMode === 'cards' ? '#e8e4de' : 'transparent',
                    color: readMode === 'cards' ? '#4a4540' : '#b0a99e',
                    borderLeft: '1px solid #e0ddd8',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
                  </svg>
                </button>
                <button
                  onClick={() => setReadMode('magazine')}
                  title="杂志模式"
                  style={{
                    ...toolBtnStyle,
                    background: readMode === 'magazine' ? '#e8e4de' : 'transparent',
                    color: readMode === 'magazine' ? '#4a4540' : '#b0a99e',
                    borderLeft: '1px solid #e0ddd8',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="12" y1="9" x2="12" y2="21" />
                  </svg>
                </button>
                <button
                  onClick={() => setReadMode('newspaper')}
                  title="报纸模式"
                  style={{
                    ...toolBtnStyle,
                    background: readMode === 'newspaper' ? '#e8e4de' : 'transparent',
                    color: readMode === 'newspaper' ? '#4a4540' : '#b0a99e',
                    borderLeft: '1px solid #e0ddd8',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
                    <line x1="10" y1="6" x2="18" y2="6" /><line x1="10" y1="10" x2="18" y2="10" /><line x1="10" y1="14" x2="14" y2="14" />
                  </svg>
                </button>
                <button
                  onClick={() => setReadMode('dynamic')}
                  title="动态排版"
                  style={{
                    ...toolBtnStyle,
                    background: readMode === 'dynamic' ? '#e8e4de' : 'transparent',
                    color: readMode === 'dynamic' ? '#4a4540' : '#b0a99e',
                    borderLeft: '1px solid #e0ddd8',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><line x1="21.17" y1="8" x2="12" y2="8" /><line x1="3.95" y1="6.06" x2="8.54" y2="14" /><line x1="10.88" y1="21.94" x2="15.46" y2="14" />
                  </svg>
                </button>
              </div>

              {/* Fullscreen toggle */}
              <button
                onClick={toggleFullscreen}
                title={fullscreen ? '退出全屏' : '全屏阅读'}
                style={{
                  ...toolBtnStyle,
                  borderRadius: 6,
                  border: '1px solid #e0ddd8',
                  color: fullscreen ? '#4a4540' : '#b0a99e',
                  background: fullscreen ? '#e8e4de' : 'transparent',
                }}
              >
                {fullscreen ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" y1="10" x2="21" y2="3" /><line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Reader content */}
          {readMode === 'book' ? (
            <BookReader
              pageId={openBook.pageId}
              mode={openBook.mode}
            />
          ) : readMode === 'scroll' ? (
            <ArticleView pageId={openBook.pageId} showFullContent />
          ) : readMode === 'cards' ? (
            <CardFeedView pageUrl={openBook.pageUrl} pageTitle={openBook.pageTitle} />
          ) : readMode === 'magazine' ? (
            <MagazineView pageId={openBook.pageId} />
          ) : readMode === 'newspaper' ? (
            <NewspaperView pageId={openBook.pageId} />
          ) : (
            <DynamicLayoutView pageId={openBook.pageId} />
          )}
        </div>
      )}
    </div>
  )
}

// ── Toolbar button style ──────────────────────────────────────────────────────

const toolBtnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 32, height: 28,
  background: 'none', border: 'none', cursor: 'pointer',
  padding: 0, fontFamily: 'inherit',
  transition: 'background 0.12s, color 0.12s',
}
