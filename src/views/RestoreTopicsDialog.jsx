export default function RestoreTopicsDialog({
  setRestoreArmed, defaultCategories, saveFeedCategories,
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1.25rem' }}
      onClick={() => setRestoreArmed(false)}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="restore-title"
        style={{ background: '#fff', borderRadius: '18px', padding: '1.5rem', maxWidth: '380px', width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' }}>
        <h3 id="restore-title" style={{ margin: '0 0 0.6rem', fontSize: '1.05rem', fontWeight: 800, color: '#0a0a0f' }}>
          Restore default news categories?
        </h3>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.88rem', lineHeight: 1.55, color: '#6b7280' }}>
          Your custom list and the order you put it in will be replaced by the {defaultCategories.length} default
          news categories. You can customise them again at any time.
        </p>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button onClick={() => setRestoreArmed(false)}
            style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: '999px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
              background: '#f5f5f7', border: '1px solid rgba(0,0,0,0.08)', color: '#0a0a0f' }}>
            Cancel
          </button>
          <button onClick={() => { saveFeedCategories(defaultCategories); setRestoreArmed(false); }}
            style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: '999px', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem',
              background: '#dc2626', border: '1px solid #dc2626', color: '#fff' }}>
            Restore
          </button>
        </div>
      </div>
    </div>
  );
}
