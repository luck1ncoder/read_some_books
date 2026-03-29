import { serializeSelection, restoreHighlight, Anchor } from './anchor'

const SERVER = 'http://localhost:7749'
let currentPageId: string | null = null
let highlightModeActive = false

// Proxy all JSON requests through the background service worker to bypass
// page CSP restrictions (content scripts are subject to the page's CSP,
// but background service workers are not).
async function bgFetch(url: string, options?: RequestInit): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'FETCH', url, options },
      (resp) => {
        if (chrome.runtime.lastError) { reject(new Error(chrome.runtime.lastError.message)); return }
        if (resp?.ok) resolve(resp.data)
        else reject(new Error(resp?.error ?? 'bgFetch failed'))
      }
    )
  })
}

// Only called when user actively highlights (saves full_text on demand, not on every page load)
async function ensurePageId(): Promise<string> {
  if (currentPageId) return currentPageId
  try {
    const d = await bgFetch(`${SERVER}/pages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: location.href, title: document.title, full_text: document.body.innerText }),
    })
    currentPageId = d.id
    return d.id as string
  } catch { return '' }
}

// ── Toolbar (normal mode) ─────────────────────────────────────────────────────

function showBar(x: number, y: number, text: string, anchor: Anchor) {
  document.getElementById('__wh_bar__')?.remove()

  const bar = document.createElement('div')
  bar.id = '__wh_bar__'
  bar.style.cssText = `
    position:fixed;left:${x}px;top:${Math.max(10, y - 52)}px;
    z-index:2147483647;
    background:#ffffff;
    border:1px solid rgba(45,51,56,0.12);
    border-radius:10px;
    padding:5px 6px;display:flex;gap:4px;
    box-shadow:0 4px 16px rgba(45,51,56,0.12);
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
  `

  const btns = [
    { id: 'highlight', label: '划线', primary: false },
    { id: 'annotate',  label: '批注', primary: true  },
  ]

  for (const b of btns) {
    const btn = document.createElement('button')
    btn.textContent = b.label
    btn.style.cssText = `
      border:none;border-radius:7px;
      font-size:12.5px;padding:5px 14px;
      cursor:pointer;white-space:nowrap;
      font-family:inherit;font-weight:${b.primary ? 600 : 400};
      background:${b.primary ? 'linear-gradient(135deg,#5f5e60,#535254)' : 'transparent'};
      color:${b.primary ? '#ffffff' : '#596065'};
      transition:opacity 0.1s;
    `
    btn.onmouseenter = () => { btn.style.opacity = '0.85' }
    btn.onmouseleave = () => { btn.style.opacity = '1' }
    btn.onmousedown = (e) => {
      e.stopPropagation()
      e.preventDefault()
      bar.remove()
      // For 'annotate': send OPEN_SIDEPANEL_NOW immediately, synchronously,
      // BEFORE any await. Chrome's user gesture token is still live here.
      // handleAction() is async and will lose the gesture context on its
      // first await — so sidePanel.open() cannot be called from inside it.
      if (b.id === 'annotate') {
        chrome.runtime.sendMessage({ type: 'OPEN_SIDEPANEL_NOW' })
      }
      handleAction(b.id, text, anchor)
    }
    bar.appendChild(btn)
  }

  bar.onmousedown = (e) => e.stopPropagation()
  document.body.appendChild(bar)
}

// ── Toast notification ────────────────────────────────────────────────────────

function showToast(msg: string, durationMs = 2000) {
  document.getElementById('__wh_toast__')?.remove()
  const el = document.createElement('div')
  el.id = '__wh_toast__'
  el.textContent = msg
  el.style.cssText = `
    position:fixed;bottom:24px;right:24px;
    z-index:2147483647;
    background:#2d3338;color:#ffffff;
    border-radius:10px;padding:10px 16px;
    font-size:13px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;
    box-shadow:0 4px 16px rgba(45,51,56,0.18);
    opacity:0;transition:opacity 0.2s;
    pointer-events:none;
  `
  document.body.appendChild(el)
  requestAnimationFrame(() => { el.style.opacity = '1' })
  setTimeout(() => {
    el.style.opacity = '0'
    setTimeout(() => el.remove(), 200)
  }, durationMs)
}

function hideBar() {
  document.getElementById('__wh_bar__')?.remove()
}

// ── Background card generation ────────────────────────────────────────────────

async function generateCardInBackground(pageId: string, hlId: string, text: string) {
  try {
    const expRes = await fetch(
      `${SERVER}/ai/explain?highlight=${encodeURIComponent(text)}&page_id=${encodeURIComponent(pageId)}`
    )
    const reader = expRes.body!.getReader()
    const dec = new TextDecoder()
    const sections = ['', '', '']
    let currentSection = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      for (const line of dec.decode(value).split('\n')) {
        if (!line.startsWith('data: ')) continue
        const d = line.slice(6)
        if (d === '[DONE]') break
        try {
          const parsed = JSON.parse(d)
          if (parsed.section !== undefined) { currentSection = parsed.section }
          else if (parsed.delta) { sections[currentSection] += parsed.delta }
        } catch {}
      }
    }
    const cardRes = await fetch(`${SERVER}/cards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page_id: pageId,
        highlight_id: hlId,
        title: text.slice(0, 60),
        ai_explanation: sections[0],
        context_interpretation: sections[1],
        inferred_intent: sections[2],
        my_note: '',
        tags: [],
      }),
    })
    const { id: cardId } = await cardRes.json()
    if (cardId) {
      fetch(`${SERVER}/cards/${cardId}/assign-topic`, { method: 'POST' }).catch(() => {})
    }
  } catch {}
}

// ── Save highlight (shared logic) ─────────────────────────────────────────────

async function saveHighlight(text: string, anchor: Anchor): Promise<string | null> {
  const pageId = await ensurePageId()
  if (!pageId) return null
  try {
    const { id: hlId } = await bgFetch(`${SERVER}/highlights`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page_id: pageId, text, color: 'yellow', position: JSON.stringify(anchor) }),
    })
    renderHighlightMark(anchor)
    generateCardInBackground(pageId, hlId, text)
    return hlId
  } catch { return null }
}

// ── Action handlers (toolbar mode) ────────────────────────────────────────────

async function handleAction(action: string, text: string, anchor: Anchor) {
  if (action === 'highlight') {
    const hlId = await saveHighlight(text, anchor)
    if (hlId) showToast('已划线，知识卡片生成中...')
    else showToast('保存失败，请重试')
    return
  }

  if (action === 'annotate') {
    // Note: OPEN_SIDEPANEL_NOW was already sent synchronously in onmousedown,
    // before this async function was called. Gesture context is gone by now.
    const hlId = await saveHighlight(text, anchor)
    if (hlId) chrome.runtime.sendMessage({ type: 'FOCUS_HIGHLIGHT', highlightId: hlId })
    else showToast('保存失败，请重试')
  }
}

// ── Highlight mark rendering ──────────────────────────────────────────────────

function renderHighlightMark(anchor: Anchor) {
  try {
    const range = restoreHighlight(anchor)
    if (!range) return
    const mark = document.createElement('mark')
    mark.style.cssText = 'background:rgba(255,220,0,0.35);border-bottom:2px solid rgba(255,180,0,0.8);border-radius:2px;cursor:pointer;'
    range.surroundContents(mark)
  } catch {}
}

// ── Restore all highlights on load ───────────────────────────────────────────

async function restoreAll() {
  try {
    const list = await bgFetch(`${SERVER}/highlights?url=${encodeURIComponent(location.href)}`)
    for (const hl of list) {
      try {
        const anchor: Anchor = JSON.parse(hl.position)
        renderHighlightMark(anchor)
      } catch {}
    }
  } catch {}
}

// ── Highlight Mode (pen cursor) ───────────────────────────────────────────────

const PEN_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
  <rect x="8" y="2" width="12" height="20" rx="3" fill="#a78bfa"/>
  <path d="M10 22 L14 31 L18 22 Z" fill="#7c3aed"/>
  <rect x="17" y="4" width="2.5" height="14" rx="1.2" fill="#7c3aed"/>
  <rect x="8" y="14" width="12" height="5" fill="rgba(251,211,62,0.85)"/>
  <rect x="8" y="2" width="12" height="4" rx="3" fill="#6d28d9"/>
</svg>
`

let penCursor: HTMLDivElement | null = null
let modeBanner: HTMLDivElement | null = null
let penStyleEl: HTMLStyleElement | null = null

function onPenMouseMove(e: MouseEvent) {
  if (!penCursor) return
  penCursor.style.left = e.clientX + 'px'
  penCursor.style.top = e.clientY + 'px'
}

function onPenMouseUp() {
  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || sel.toString().trim().length < 2) return
  const text = sel.toString().trim()
  let anchor = serializeSelection(sel)
  if (!anchor) anchor = { v: 1, text, prefix: '', suffix: '' }

  // Flash the pen cursor
  if (penCursor) {
    penCursor.style.filter = 'drop-shadow(0 0 10px rgba(251,211,62,0.9)) drop-shadow(0 2px 8px rgba(139,92,246,0.6))'
    setTimeout(() => {
      if (penCursor) penCursor.style.filter = 'drop-shadow(0 2px 6px rgba(139,92,246,0.4))'
    }, 350)
  }

  saveHighlight(text, anchor).then(hlId => {
    if (hlId) showToast('已划线 ✓')
    else showToast('保存失败，请重试')
  })

  // Clear selection
  sel.removeAllRanges()
}

function enterHighlightMode() {
  if (highlightModeActive) return
  highlightModeActive = true

  // Inject cursor-none style on everything
  penStyleEl = document.createElement('style')
  penStyleEl.id = '__wh_pen_style__'
  penStyleEl.textContent = '* { cursor: none !important; }'
  document.head.appendChild(penStyleEl)

  // Pen cursor element
  penCursor = document.createElement('div')
  penCursor.id = '__wh_pen__'
  penCursor.innerHTML = PEN_SVG
  penCursor.style.cssText = `
    position:fixed;
    pointer-events:none;
    z-index:2147483647;
    transform:translate(-4px,-32px);
    filter:drop-shadow(0 2px 6px rgba(139,92,246,0.4));
    transition:filter 0.2s;
    line-height:0;
  `
  document.body.appendChild(penCursor)

  // Mode banner
  modeBanner = document.createElement('div')
  modeBanner.id = '__wh_banner__'
  modeBanner.innerHTML = `
    <span style="width:6px;height:6px;border-radius:50%;background:#a78bfa;flex-shrink:0;animation:__wh_blink__ 1.2s ease-in-out infinite;"></span>
    划线模式 · 选中文字即保存 · 按 Esc 退出
  `
  modeBanner.style.cssText = `
    position:fixed;top:16px;left:50%;transform:translateX(-50%);
    z-index:2147483647;
    display:flex;align-items:center;gap:8px;
    background:rgba(79,59,138,0.95);
    color:#e9d8fd;
    font-size:12px;font-weight:600;
    padding:8px 18px;border-radius:20px;
    box-shadow:0 4px 20px rgba(139,92,246,0.4);
    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
    white-space:nowrap;pointer-events:none;
    backdrop-filter:blur(8px);
  `

  // Inject blink keyframe once
  if (!document.getElementById('__wh_keyframes__')) {
    const kf = document.createElement('style')
    kf.id = '__wh_keyframes__'
    kf.textContent = '@keyframes __wh_blink__ { 0%,100%{opacity:1} 50%{opacity:0.25} }'
    document.head.appendChild(kf)
  }

  document.body.appendChild(modeBanner)

  document.addEventListener('mousemove', onPenMouseMove)
  document.addEventListener('mouseup', onPenMouseUp)
}

function exitHighlightMode() {
  if (!highlightModeActive) return
  highlightModeActive = false

  penStyleEl?.remove(); penStyleEl = null
  penCursor?.remove(); penCursor = null
  modeBanner?.remove(); modeBanner = null

  document.removeEventListener('mousemove', onPenMouseMove)
  document.removeEventListener('mouseup', onPenMouseUp)
}

// ── Doc structure extraction ──────────────────────────────────────────────────

interface DocNode {
  type: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'blockquote' | 'img' | 'li' | 'pre' | 'table' | 'hr'
  text?: string
  src?: string
  alt?: string
}

function extractDocStructure(): DocNode[] {
  const nodes: DocNode[] = []

  // Selectors to skip — noise elements
  const SKIP_SELECTOR = 'nav, footer, aside, header, [role="navigation"], [role="banner"], [role="complementary"], [role="dialog"], script, style, noscript, iframe, .sidebar, .menu, .ad, .cookie, .popup, .modal, .overlay, .toc, .table-of-contents, .share, .social, .related, .comments'

  // Find best root: prefer article > [role=main] > main > body
  const root: Element =
    document.querySelector('article') ??
    document.querySelector('[role="main"]') ??
    document.querySelector('main') ??
    document.querySelector('.content, .article, .post, .entry, .post-content, .article-content, .entry-content, .markdown-body, #content, #main, #article') ??
    document.body

  const els = root.querySelectorAll('h1, h2, h3, h4, h5, h6, p, blockquote, img, li, pre, table, hr')

  // Track text seen to deduplicate (parent text often contains child text)
  const seenTexts = new Set<string>()

  for (const el of Array.from(els)) {
    let tag = el.tagName.toLowerCase()

    // Skip noise containers
    if (el.closest(SKIP_SELECTOR)) continue

    // Skip elements hidden via CSS
    const style = window.getComputedStyle(el)
    if (style.display === 'none' || style.visibility === 'hidden') continue

    // Horizontal rule — visual separator
    if (tag === 'hr') {
      nodes.push({ type: 'hr' })
      continue
    }

    if (tag === 'img') {
      const img = el as HTMLImageElement
      const src = img.src || img.dataset.src || img.getAttribute('data-lazy-src') || img.getAttribute('data-original') || img.getAttribute('data-lazy') || ''
      const alt = img.alt ?? ''
      if (src && !src.startsWith('data:') && src.length < 600) {
        nodes.push({ type: 'img', src, alt })
      }
      continue
    }

    // Table — extract as formatted text
    if (tag === 'table') {
      const rows = el.querySelectorAll('tr')
      const lines: string[] = []
      rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('th, td')).map(c => (c.textContent ?? '').replace(/\s+/g, ' ').trim())
        if (cells.some(c => c.length > 0)) lines.push(cells.join(' | '))
      })
      const text = lines.join('\n')
      if (text.length > 10 && !seenTexts.has(text)) {
        seenTexts.add(text)
        nodes.push({ type: 'table', text })
      }
      continue
    }

    // Code blocks — preserve formatting
    if (tag === 'pre') {
      const text = (el.textContent ?? '').trim()
      if (text.length >= 5 && !seenTexts.has(text)) {
        seenTexts.add(text)
        nodes.push({ type: 'pre', text })
      }
      continue
    }

    const text = (el.textContent ?? '').replace(/\s+/g, ' ').trim()
    if (!text || text.length < 5) continue

    // Skip nested li: only take direct-child li of ol/ul, not deeply nested ones
    if (tag === 'li') {
      const parentList = el.parentElement
      if (parentList && parentList.closest('li')) continue  // nested list item
      if (text.length > 300) continue  // likely nav menu
    }

    // Skip if exact duplicate (p and blockquote especially prone)
    if (tag === 'p' || tag === 'blockquote' || tag === 'li') {
      if (seenTexts.has(text)) continue
    }

    seenTexts.add(text)
    nodes.push({ type: tag as DocNode['type'], text })
  }

  // If we got almost nothing from the structured approach,
  // fall back to splitting full_text by lines
  if (nodes.filter(n => n.type !== 'img' && n.type !== 'hr').length < 3) {
    const lines = document.body.innerText
      .split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 20)
      .slice(0, 200)
    return lines.map(text => ({ type: 'p' as const, text }))
  }

  return nodes
}

// ── Message listener (from popup / background) ────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TOGGLE_HIGHLIGHT_MODE') {
    if (message.active) enterHighlightMode()
    else exitHighlightMode()
    return false
  }

  if (message.type === 'SAVE_AS_BOOK') {
    ;(async () => {
      try {
        const pageId = await ensurePageId()
        if (!pageId) { sendResponse({ ok: false, error: 'no page id — server may be offline' }); return }
        const structure = extractDocStructure()
        if (structure.length === 0) { sendResponse({ ok: false, error: 'no content extracted from page' }); return }
        await bgFetch(`${SERVER}/pages/${pageId}/structure`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ doc_structure: JSON.stringify(structure) }),
        })
        sendResponse({ ok: true, count: structure.length })
      } catch (e: any) {
        sendResponse({ ok: false, error: e.message ?? 'unknown error' })
      }
    })()
    return true // keep channel open for async sendResponse
  }
})

// Esc key exits highlight mode
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && highlightModeActive) {
    exitHighlightMode()
    // Sync popup state via storage
    chrome.tabs.getCurrent?.(() => {})
    chrome.storage.session.get(null, (items) => {
      const key = Object.keys(items).find(k => k.startsWith('hlMode_'))
      if (key) chrome.storage.session.set({ [key]: false })
    })
  }
})

// ── Normal mode event listeners ───────────────────────────────────────────────

document.addEventListener('mouseup', (e) => {
  // In pen mode, mouseup is handled by onPenMouseUp
  if (highlightModeActive) return

  const sel = window.getSelection()
  if (!sel || sel.isCollapsed || !sel.toString().trim()) return
  const text = sel.toString().trim()
  if (text.length < 2) return

  let anchor = serializeSelection(sel)
  if (!anchor) anchor = { v: 1, text, prefix: '', suffix: '' }

  const rect = sel.getRangeAt(0).getBoundingClientRect()
  showBar(rect.left, rect.top, text, anchor)
})

document.addEventListener('mousedown', (e) => {
  if (highlightModeActive) return
  const t = e.target as HTMLElement
  if (t.id === '__wh_bar__' || t.closest('#__wh_bar__')) return
  hideBar()
})

restoreAll()
