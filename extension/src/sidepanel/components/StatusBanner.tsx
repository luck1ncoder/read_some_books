export function StatusBanner({ online }: { online: boolean }) {
  if (online) return null
  return (
    <div style={{
      background: '#fef2f2', color: '#b91c1c',
      borderBottom: '1px solid #fecaca',
      padding: '8px 14px', fontSize: 12,
      display: 'flex', alignItems: 'center', gap: 7,
    }}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>
        本地服务未运行。请在 <code style={{ background: '#fee2e2', padding: '1px 4px', borderRadius: 3, fontSize: 11 }}>server/</code> 目录执行 <code style={{ background: '#fee2e2', padding: '1px 4px', borderRadius: 3, fontSize: 11 }}>npm start</code>
      </span>
    </div>
  )
}
