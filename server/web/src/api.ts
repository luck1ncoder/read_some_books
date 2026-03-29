const BASE = 'http://localhost:7749'

export async function getCards(filters: Record<string, string> = {}) {
  const params = new URLSearchParams(filters).toString()
  const res = await fetch(`${BASE}/cards${params ? '?' + params : ''}`)
  return res.json()
}

export async function getCard(id: string) {
  const res = await fetch(`${BASE}/cards/${id}`)
  return res.json()
}

export async function updateCard(id: string, data: Record<string, any>) {
  await fetch(`${BASE}/cards/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
}

export async function getSettings() {
  const res = await fetch(`${BASE}/settings`)
  return res.json()
}

export async function updateSettings(data: Record<string, string>) {
  await fetch(`${BASE}/settings`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
}

export async function getTopicGroups() {
  const res = await fetch(`${BASE}/cards/topics`)
  return res.json()
}

export async function reclusterCards() {
  const res = await fetch(`${BASE}/cards/cluster`, { method: 'POST' })
  return res.json()
}

export async function getPageDetail(id: string) {
  const res = await fetch(`${BASE}/pages/${id}`)
  return res.json()
}

export async function savePageStructure(id: string, doc_structure: string) {
  await fetch(`${BASE}/pages/${id}/structure`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ doc_structure }),
  })
}

export async function getHighlightMessages(highlightId: string) {
  const res = await fetch(`${BASE}/highlights/${highlightId}/messages`)
  return res.json()
}

export function exportCardUrl(id: string) { return `${BASE}/cards/${id}/export` }
export function exportAllUrl() { return `${BASE}/export` }
