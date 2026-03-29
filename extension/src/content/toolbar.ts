const SERVER = 'http://localhost:7749'

let toolbarEl: HTMLElement | null = null
let outputEl: HTMLElement | null = null

export function showToolbar(x: number, y: number, onAction: (action: string) => void) {
  removeToolbar()
  toolbarEl = document.createElement('div')
  toolbarEl.className = 'wh-toolbar'
  toolbarEl.style.position = 'fixed'
  toolbarEl.style.left = `${x}px`
  toolbarEl.style.top = `${y - 48}px`

  const buttons = [
    { id: 'explain', label: '解释这段话' },
    { id: 'card', label: '生成知识卡片' },
    { id: 'note', label: '记录我的看法' },
    { id: 'save', label: '加入知识库' },
  ]

  // Stop mousedown from bubbling so the dismiss listener doesn't fire before click
  toolbarEl.addEventListener('mousedown', (e) => e.stopPropagation())

  for (const btn of buttons) {
    const el = document.createElement('button')
    el.className = 'wh-btn'
    el.textContent = btn.label
    el.addEventListener('mousedown', (e) => e.stopPropagation())
    el.addEventListener('click', (e) => { e.stopPropagation(); onAction(btn.id) })
    toolbarEl.appendChild(el)
  }

  document.body.appendChild(toolbarEl)
}

export function showOutput(x: number, y: number, content: string) {
  removeOutput()
  outputEl = document.createElement('div')
  outputEl.className = 'wh-output'
  outputEl.style.position = 'fixed'
  outputEl.style.left = `${x}px`
  outputEl.style.top = `${y - 48}px`
  outputEl.textContent = content
  document.body.appendChild(outputEl)
}

export function showNoteInput(x: number, y: number, onSubmit: (note: string) => void) {
  removeOutput()
  outputEl = document.createElement('div')
  outputEl.className = 'wh-output'
  outputEl.style.position = 'fixed'
  outputEl.style.left = `${x}px`
  outputEl.style.top = `${y - 48}px`

  const label = document.createElement('div')
  label.textContent = '记录你的看法'
  label.style.marginBottom = '4px'
  label.style.fontWeight = '600'

  const textarea = document.createElement('textarea')
  textarea.className = 'wh-note-input'
  textarea.placeholder = 'Enter 提交，Esc 取消'

  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSubmit(textarea.value.trim())
    } else if (e.key === 'Escape') {
      removeOutput()
    }
  })

  outputEl.appendChild(label)
  outputEl.appendChild(textarea)
  document.body.appendChild(outputEl)
  setTimeout(() => textarea.focus(), 50)
}

export function removeToolbar() {
  toolbarEl?.remove(); toolbarEl = null
}

export function removeOutput() {
  outputEl?.remove(); outputEl = null
}

export async function streamExplain(
  highlight: string,
  pageId: string,
  x: number,
  y: number
) {
  removeOutput()
  outputEl = document.createElement('div')
  outputEl.className = 'wh-output'
  outputEl.style.position = 'fixed'
  outputEl.style.left = `${x}px`
  outputEl.style.top = `${y - 48}px`
  outputEl.textContent = '思考中...'
  document.body.appendChild(outputEl)

  const url = `${SERVER}/ai/explain?highlight=${encodeURIComponent(highlight)}&page_id=${encodeURIComponent(pageId)}`
  const response = await fetch(url)
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let text = ''
  outputEl.textContent = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const lines = decoder.decode(value).split('\n')
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') return
      try {
        const { delta } = JSON.parse(data)
        if (delta) { text += delta; outputEl.textContent = text }
      } catch {}
    }
  }
}
