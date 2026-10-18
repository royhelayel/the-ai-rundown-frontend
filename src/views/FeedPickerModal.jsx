import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, UserRound } from 'lucide-react';
import useSheetMotion from '../components/useSheetMotion';
import FeedCategoryEditor from '../components/FeedCategoryEditor';

export default function FeedPickerModal({ setShowFeedPicker, feedPickerDraft, setFeedPickerDraft,
  defaultCategories, saveFeedCategories, user, onSignIn, restoreCategories }) {
  const { closing, dismiss } = useSheetMotion(() => setShowFeedPicker(false));
  const dialog = useRef(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const node = dialog.current, focus = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (node.showModal) node.showModal(); else node.setAttribute('open', '');
    return () => { document.body.style.overflow = overflow; node.close?.(); if (focus?.isConnected) focus.focus?.(); };
  }, []);
  const close = () => { if (!saving) dismiss(); };
  const save = async () => {
    if (!user || !feedPickerDraft.length || saving) return;
    setSaving(true); setError('');
    try { await saveFeedCategories(feedPickerDraft); dismiss(); }
    catch { setError('Your categories couldn’t be saved. Please try again.'); setSaving(false); }
  };
  return createPortal(<dialog className="rn-motion-dialog" data-closing={closing} ref={dialog} aria-labelledby="topics-title" onCancel={e => { e.preventDefault(); close(); }}
    onClick={e => { if (e.target === e.currentTarget) close(); }}
    style={{ border: 0, padding: 0, margin: 0, background: 'transparent', width: '100%', maxWidth: 'none', height: '100dvh', maxHeight: 'none', color: 'var(--ink)' }}>
    <style>{`dialog[aria-labelledby="topics-title"]::backdrop { background: var(--overlay); } .topic-sheet button { min-height: 44px; }`}</style>
    <div className="topic-sheet rn-motion-panel" data-closing={closing} style={{ '--sheet-x': '-50%', position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 560, maxHeight: '88dvh', display: 'flex', flexDirection: 'column', background: 'var(--paper)', borderRadius: '24px 24px 0 0', padding: '12px 20px 0' }}>
      <div aria-hidden="true" style={{ width: 36, height: 4, borderRadius: 4, background: 'var(--line)', margin: '0 auto 10px' }} />
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <h2 id="topics-title" style={{ fontSize: 22, margin: 0 }}>Your news categories</h2>
        <button className="rn-btn" aria-label="Close categories" disabled={saving} onClick={close} style={{ width: 44, flexShrink: 0 }}><X size={18} /></button>
      </header>
      {user ? <>
        <p style={{ fontSize: 13, color: 'var(--sub)', margin: '8px 0 16px' }}>Choose what you follow. Drag or use the arrows to set your news order.</p>
        <div style={{ overflowY: 'auto', overscrollBehavior: 'contain', paddingBottom: 16, pointerEvents: saving ? 'none' : undefined }}>
          <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0 }}><FeedCategoryEditor allCategories={defaultCategories} selected={feedPickerDraft} onChange={setFeedPickerDraft} /></fieldset>
          <button className="rn-btn" onClick={() => setFeedPickerDraft([...restoreCategories])} disabled={saving} style={{ fontSize: 13, color: 'var(--sub)', marginTop: 16 }}>Restore default categories</button>
        </div>
        <footer style={{ borderTop: '1px solid var(--line)', padding: '12px 0 calc(16px + env(safe-area-inset-bottom, 0px))', flexShrink: 0 }}>
          <p aria-live="polite" style={{ fontSize: 12, margin: '0 0 10px', color: 'var(--sub)' }}>{feedPickerDraft.length ? `${feedPickerDraft.length} categories selected` : 'Choose at least one category to save.'}</p>
          {error && <p role="alert" style={{ fontSize: 13, color: 'var(--ink)' }}>{error}</p>}
          <button className="rn-btn" disabled={!feedPickerDraft.length || saving} onClick={save} style={{ width: '100%', background: 'var(--ink)', color: 'var(--paper)', borderRadius: 12, fontWeight: 700, opacity: !feedPickerDraft.length || saving ? .5 : 1 }}>{saving ? 'Saving…' : 'Save categories'}</button>
        </footer>
      </> : <div style={{ padding: '22px 0 calc(22px + env(safe-area-inset-bottom, 0px))' }}>
        <UserRound size={28} color="var(--sub)" />
        <h3 style={{ fontSize: 20, margin: '14px 0 10px' }}>Make your news mix yours.</h3>
        <p style={{ fontSize: 14, color: 'var(--sub)', lineHeight: 1.6 }}>Sign in to choose your categories and keep your preferences across devices.</p>
        <button className="rn-btn" onClick={() => dismiss(onSignIn)} style={{ width: '100%', background: 'var(--ink)', color: 'var(--paper)', borderRadius: 12, fontWeight: 700 }}>Sign in to choose categories</button>
      </div>}
    </div>
  </dialog>, document.body);
}
