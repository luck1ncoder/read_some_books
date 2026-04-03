import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'

const NAV_ITEMS = [
  {
    to: '/', label: '全部卡片',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
  },
  {
    to: '/?filter=topic', label: '按话题',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3m-3.3-6.7-2.1 2.1M8.4 15.6l-2.1 2.1m0-11.4 2.1 2.1m7.2 7.2 2.1 2.1"/></svg>
  },
  {
    to: '/?filter=site', label: '按来源',
    icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
  },
]

export function Sidebar() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)

  return (
    /* surface_container_low — tonal separation from main, no border needed */
    <aside style={{
      width: 232,
      background: '#f2f4f6',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      flexShrink: 0,
    }}>
      {/* Workspace header */}
      <div style={{ padding: '20px 18px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7,
            background: 'linear-gradient(135deg, #5f5e60, #535254)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#2d3338', letterSpacing: '0.02em' }}>知识库</div>
            <div style={{ fontSize: 10, color: '#596065', letterSpacing: '0.01em' }}>Personal Workspace</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '0 12px 12px' }}>
        <div style={{ position: 'relative' }}>
          <svg style={{
            position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: '#9aa3ab', pointerEvents: 'none',
          }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && navigate(`/?q=${encodeURIComponent(q)}`)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="搜索..."
            style={{
              width: '100%', padding: '7px 10px 7px 28px',
              background: searchFocused ? '#ffffff' : '#ebeef2',
              border: `1px solid ${searchFocused ? 'rgba(95,94,96,0.2)' : 'transparent'}`,
              borderRadius: 10, color: '#2d3338', fontSize: 12.5,
              outline: 'none', boxSizing: 'border-box',
              fontFamily: 'inherit',
              transition: 'all 0.15s',
            }}
          />
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '4px 8px' }}>
        {NAV_ITEMS.map(item => (
          <NavLink key={item.to} to={item.to} end={item.to === '/'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '7px 10px', fontSize: 13.5, borderRadius: 8,
              color: isActive ? '#2d3338' : '#596065',
              background: isActive ? '#e4e9ee' : 'transparent',
              textDecoration: 'none', marginBottom: 1,
              fontWeight: isActive ? 500 : 400,
              transition: 'all 0.1s',
            })}>
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '8px 8px 20px' }}>
        <NavLink to="/settings"
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '7px 10px', fontSize: 13.5, borderRadius: 8,
            color: isActive ? '#2d3338' : '#9aa3ab',
            background: isActive ? '#e4e9ee' : 'transparent',
            textDecoration: 'none',
            fontWeight: isActive ? 500 : 400,
            transition: 'all 0.1s',
          })}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
            <path d="M12 2v2m0 16v2M2 12h2m16 0h2"/>
          </svg>
          设置
        </NavLink>
      </div>
    </aside>
  )
}
