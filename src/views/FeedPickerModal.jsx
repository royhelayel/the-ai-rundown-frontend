import { X } from 'lucide-react';
import { CATEGORY_COLORS } from '../theme';

export default function FeedPickerModal({
  setShowFeedPicker, feedPickerDraft, setFeedPickerDraft, defaultCategories, handleSelectCategory,
  saveFeedCategories, toggleFeedPickerCat,
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowFeedPicker(false)}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#18181f', borderRadius: '20px 20px 0 0', padding: '1.5rem 1.5rem calc(1.5rem + env(safe-area-inset-bottom, 0px))', width: '100%', maxWidth: '540px', maxHeight: '82vh', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ width: '36px', height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '99px', margin: '0 auto 1.25rem' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '900', color: 'white' }}>Customise my topics</h3>
          <button onClick={() => setShowFeedPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', padding: '0.25rem' }}><X size={18} /></button>
        </div>
        <p style={{ margin: '0 0 1.25rem', fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)' }}>Tap to select. Numbers show the order stories appear.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
          {defaultCategories.map(cat => {
            const pos = feedPickerDraft.indexOf(cat); const isSel = pos !== -1; const color = CATEGORY_COLORS[cat] || '#6366f1';
            return (
              <button key={cat} onClick={() => toggleFeedPickerCat(cat)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: isSel ? '0.38rem 0.75rem 0.38rem 0.45rem' : '0.38rem 0.85rem', borderRadius: '999px', background: isSel ? color : 'transparent', color: isSel ? 'white' : 'rgba(255,255,255,0.7)', border: `1.5px solid ${isSel ? color : 'rgba(255,255,255,0.15)'}`, cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>
                {isSel && <span style={{ background: 'rgba(255,255,255,0.28)', borderRadius: '999px', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.63rem', fontWeight: '900', flexShrink: 0 }}>{pos + 1}</span>}
                {cat}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.4)' }}>{feedPickerDraft.length} {feedPickerDraft.length === 1 ? 'category' : 'categories'} selected</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {feedPickerDraft.length > 0 && <button onClick={() => setFeedPickerDraft([])} style={{ padding: '0.55rem 1rem', background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '999px', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem', fontWeight: '600' }}>Clear</button>}
            <button disabled={feedPickerDraft.length === 0} onClick={() => { saveFeedCategories(feedPickerDraft); setShowFeedPicker(false); handleSelectCategory(feedPickerDraft[0]); }}
              style={{ padding: '0.55rem 1.4rem', background: feedPickerDraft.length === 0 ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: feedPickerDraft.length === 0 ? 'rgba(255,255,255,0.25)' : 'white', border: 'none', borderRadius: '999px', cursor: feedPickerDraft.length === 0 ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.88rem' }}>Save Feed</button>
          </div>
        </div>
      </div>
    </div>
  );
}
