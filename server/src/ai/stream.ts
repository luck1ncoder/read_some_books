import { Response } from 'express'
import OpenAI from 'openai'

/** Set standard SSE headers on the response */
export function initSSE(res: Response) {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
}

/** Strip <think>...</think> blocks from a streaming buffer.
 *  Returns the cleaned text to emit and the remaining buffer state. */
export function stripThinkTags(
  buffer: string,
  inThink: boolean,
): { emit: string; buffer: string; inThink: boolean } {
  let emit = ''
  while (buffer.length > 0) {
    if (inThink) {
      const endIdx = buffer.indexOf('</think>')
      if (endIdx === -1) return { emit, buffer, inThink }
      buffer = buffer.slice(endIdx + 8)
      inThink = false
    } else {
      const startIdx = buffer.indexOf('<think>')
      if (startIdx === -1) {
        emit += buffer
        buffer = ''
      } else {
        if (startIdx > 0) emit += buffer.slice(0, startIdx)
        buffer = buffer.slice(startIdx + 7)
        inThink = true
      }
    }
  }
  return { emit, buffer, inThink }
}

/** Stream an OpenAI chat completion, stripping think tags and writing SSE events.
 *  Returns the full concatenated response text (with think blocks removed). */
export async function streamCompletion(
  res: Response,
  stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
): Promise<string> {
  let buffer = ''
  let inThink = false
  let full = ''

  for await (const chunk of stream) {
    const raw = chunk.choices[0]?.delta?.content ?? ''
    if (!raw) continue
    buffer += raw
    const result = stripThinkTags(buffer, inThink)
    buffer = result.buffer
    inThink = result.inThink
    if (result.emit) {
      full += result.emit
      res.write(`data: ${JSON.stringify({ delta: result.emit })}\n\n`)
    }
  }

  // Flush remaining buffer
  if (buffer && !inThink) {
    full += buffer
    res.write(`data: ${JSON.stringify({ delta: buffer })}\n\n`)
  }

  return full
}

/** Strip think tags from a non-streaming response string */
export function stripThinkTagsFromString(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}
