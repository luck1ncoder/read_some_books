export interface Anchor {
  v: 1
  text: string
  prefix: string
  suffix: string
}

const CONTEXT_LENGTH = 50

// Build a flat text string from DOM text nodes using TreeWalker.
// This is used consistently in both serialize and restore to avoid
// mismatches between innerText normalization and raw textContent offsets.
function getBodyTextAndOffsets(): { text: string; nodes: Array<{ node: Text; start: number }> } {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  let text = ''
  const nodes: Array<{ node: Text; start: number }> = []
  let node: Text | null
  while ((node = walker.nextNode() as Text)) {
    nodes.push({ node, start: text.length })
    text += node.textContent ?? ''
  }
  return { text, nodes }
}

export function serializeSelection(selection: Selection): Anchor | null {
  if (selection.rangeCount === 0) return null
  const text = selection.toString().trim()
  if (!text) return null

  // Use TreeWalker-based flat text (consistent with restoreHighlight)
  const { text: bodyText } = getBodyTextAndOffsets()
  const startOffset = bodyText.indexOf(text)
  if (startOffset === -1) return null

  const prefix = bodyText.slice(Math.max(0, startOffset - CONTEXT_LENGTH), startOffset)
  const suffix = bodyText.slice(startOffset + text.length, startOffset + text.length + CONTEXT_LENGTH)

  return { v: 1, text, prefix, suffix }
}

export function restoreHighlight(anchor: Anchor): Range | null {
  const { text: bodyText, nodes } = getBodyTextAndOffsets()

  // Use prefix+text for more accurate disambiguation
  const searchStr = anchor.prefix + anchor.text
  const idx = bodyText.indexOf(searchStr)
  if (idx === -1) return null

  const textStart = idx + anchor.prefix.length
  const textEnd = textStart + anchor.text.length

  // Find start node
  let startNode: Text | null = null
  let startOffset = 0
  let endNode: Text | null = null
  let endOffset = 0

  for (const { node, start } of nodes) {
    const nodeEnd = start + (node.textContent?.length ?? 0)
    if (startNode === null && nodeEnd > textStart) {
      startNode = node
      startOffset = textStart - start
    }
    if (endNode === null && nodeEnd >= textEnd) {
      endNode = node
      endOffset = textEnd - start
      break
    }
  }

  if (!startNode || !endNode) return null

  try {
    const range = document.createRange()
    range.setStart(startNode, startOffset)
    range.setEnd(endNode, endOffset)
    return range
  } catch {
    return null  // surroundContents can throw on cross-node boundaries; handled by caller
  }
}
