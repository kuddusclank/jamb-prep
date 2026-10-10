export default function StudyLoading() {
  return <div role="status" aria-live="polite" style={{ width: 'min(960px, calc(100% - 32px))', margin: '40px auto', padding: 24, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 20 }}>
    <p style={{ fontWeight: 600, color: '#116149', marginBottom: 24 }}>Loading your study space…</p>
    <div aria-hidden="true" style={{ display: 'grid', gap: 16 }}>
      {[55, 100, 100].map((width, i) => <div key={i} style={{ width: `${width}%`, height: i ? 96 : 24, borderRadius: 12, background: '#f1f5f9' }} />)}
    </div>
  </div>;
}
