import OpenAI from 'openai'
import { getSettings } from '../db/queries'

export function getOpenAIClient(): OpenAI {
  const settings = getSettings()
  const apiKey = settings['openai_api_key']
  if (!apiKey) throw new Error('OpenAI API key not configured. Go to Settings.')
  // Support MiniMax and other OpenAI-compatible providers via configurable baseURL
  const baseURL = settings['openai_base_url'] || undefined
  return new OpenAI({ apiKey, baseURL })
}

export function getOpenAIModel(): string {
  const settings = getSettings()
  return settings['openai_model'] ?? 'gpt-4o'
}
