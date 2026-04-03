import { useEffect, useState } from 'react'
import { getSettings, updateSettings } from '../api'

const MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']

export function SettingsPage() {
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState('gpt-4o')
  const [baseUrl, setBaseUrl] = useState('')
  const [saved, setSaved] = useState(false)
  const [apiKeyFocused, setApiKeyFocused] = useState(false)
  const [baseUrlFocused, setBaseUrlFocused] = useState(false)

  useEffect(() => {
    getSettings().then((s: Record<string, string>) => {
      setApiKey(s['openai_api_key'] ?? '')
      setModel(s['openai_model'] ?? 'gpt-4o')
      setBaseUrl(s['openai_base_url'] ?? '')
    })
  }, [])

  async function save() {
    await updateSettings({ openai_api_key: apiKey, openai_model: model, openai_base_url: baseUrl })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const inputStyle = (focused: boolean): React.CSSProperties => ({
    width: '100%', padding: '10px 13px',
    borderRadius: 10,
    background: focused ? '#ffffff' : '#f2f4f6',
    border: `1px solid ${focused ? 'rgba(95,94,96,0.2)' : 'transparent'}`,
    fontSize: 14, outline: 'none', color: '#2d3338',
    fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 40px 80px' }}>

      {/* Page header */}
      <h1 style={{ fontSize: 32, fontWeight: 600, color: '#2d3338', letterSpacing: '-0.6px', margin: '0 0 6px' }}>设置</h1>
      <p style={{ fontSize: 14, color: '#9aa3ab', margin: '0 0 44px' }}>配置 AI 模型和 API 密钥</p>

      {/* API Key */}
      <section style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9aa3ab', marginBottom: 12 }}>
          API 密钥
        </div>
        <input
          type="password"
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          onFocus={() => setApiKeyFocused(true)}
          onBlur={() => setApiKeyFocused(false)}
          placeholder="sk-..."
          style={inputStyle(apiKeyFocused)}
        />
        <p style={{ fontSize: 12, color: '#9aa3ab', marginTop: 8 }}>
          存储在本地 SQLite，不会上传到任何服务器。
        </p>
      </section>

      {/* Base URL */}
      <section style={{ marginBottom: 36 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9aa3ab', marginBottom: 12 }}>
          API Base URL <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(可选，留空使用 OpenAI 默认)</span>
        </div>
        <input
          type="text"
          value={baseUrl}
          onChange={e => setBaseUrl(e.target.value)}
          onFocus={() => setBaseUrlFocused(true)}
          onBlur={() => setBaseUrlFocused(false)}
          placeholder="https://api.openai.com/v1"
          style={inputStyle(baseUrlFocused)}
        />
      </section>

      {/* Model */}
      <section style={{ marginBottom: 44 }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9aa3ab', marginBottom: 12 }}>
          模型
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {MODELS.map(m => (
            <label key={m} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '11px 14px', borderRadius: 10, cursor: 'pointer',
              background: model === m ? '#ffffff' : 'transparent',
              border: `1px solid ${model === m ? 'rgba(45,51,56,0.15)' : 'transparent'}`,
              transition: 'all 0.12s',
            }}>
              <div style={{
                width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                border: `2px solid ${model === m ? '#5f5e60' : '#d4d9de'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'border-color 0.12s',
              }}>
                {model === m && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#5f5e60' }} />}
              </div>
              <input type="radio" value={m} checked={model === m} onChange={() => setModel(m)} style={{ display: 'none' }} />
              <span style={{ fontSize: 14, color: '#2d3338', fontWeight: model === m ? 500 : 400 }}>{m}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Save */}
      <button
        onClick={save}
        style={{
          padding: '11px 28px',
          background: saved
            ? 'linear-gradient(135deg, #3d7a5a, #2f6348)'
            : 'linear-gradient(135deg, #5f5e60, #535254)',
          color: '#fff', border: 'none', borderRadius: 10,
          fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
          transition: 'background 0.25s',
          boxShadow: '0 2px 8px rgba(45,51,56,0.15)',
        }}
      >
        {saved ? '已保存' : '保存设置'}
      </button>
    </div>
  )
}
