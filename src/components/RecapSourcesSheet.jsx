import { HOME_TYPE } from './homeTypography';
import React, { useEffect, useRef } from 'react';
import useSheetMotion from './useSheetMotion';
import { X } from 'lucide-react';

export default function RecapSourcesSheet({ snapshot, onClose }) {
  const { closing, dismiss } = useSheetMotion(onClose);
  const panel = useRef(null);
  const close = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    close.current?.focus();
    const key = e => {
      if (e.key === 'Escape') { e.preventDefault(); dismiss(); }
      if (e.key !== 'Tab') return;
      const nodes = panel.current?.querySelectorAll('button, a[href]');
      if (!nodes?.length) return;
      const first = nodes[0], last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', key);
      previous?.focus?.();
    };
  }, [dismiss]);
  return <div className="rn-motion-overlay" data-closing={closing} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.48)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={dismiss}>
    <section className="rn-motion-panel" data-closing={closing} ref={panel} role="dialog" aria-modal="true" aria-labelledby="recap-sources-title" onClick={e => e.stopPropagation()}
      style={{ width: '100%', maxWidth: 560, maxHeight: '80dvh', display: 'flex', flexDirection: 'column', background: 'var(--surface)', color: 'var(--ink)', borderRadius: '24px 24px 0 0', boxShadow: '0 -12px 48px rgba(0,0,0,.15)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div aria-hidden="true" style={{ width: 34, height: 4, background: 'var(--line)', borderRadius: 4, margin: '10px auto 0' }} />
      <header style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--line)' }}>
        <div style={{ flex: 1 }}>
          <h2 id="recap-sources-title" style={{ fontSize: HOME_TYPE.section, fontWeight: 650, lineHeight: 1.3, margin: '0 0 4px' }}>{snapshot.title || 'Stories & sources'}</h2>
          <p style={{ fontSize: HOME_TYPE.meta, color: 'var(--sub)', margin: 0 }}>{snapshot.label}</p>
        </div>
        <button ref={close} className="rn-btn" aria-label="Close stories and sources" onClick={dismiss} style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', flexShrink: 0 }}><X size={20} /></button>
      </header>
      <div style={{ overflowY: 'auto', overscrollBehavior: 'contain', padding: '0 20px 20px' }}>
        {snapshot.items.map((item, i) => <article key={i} style={{ padding: '18px 0', borderBottom: i < snapshot.items.length - 1 ? '1px solid var(--line)' : undefined }}>
          <h3 dir="auto" style={{ margin: '0 0 12px', fontSize: HOME_TYPE.title, fontWeight: 700, lineHeight: 1.25, letterSpacing: '-.02em' }}>{item.headline}</h3>
          {item.summary && <p dir="auto" style={{ margin: '0 0 16px', color: 'var(--sub)', fontSize: HOME_TYPE.reading, lineHeight: 1.5 }}>{item.summary}</p>}
          <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 18, rowGap: 4, color: 'var(--sub)', fontSize: HOME_TYPE.ui }}>
            {(item.sources || []).map((src, j) => /^https?:\/\//.test(src.url || '')
              ? <a key={j} href={src.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>{src.outlet || src.name || 'Source'} <span aria-hidden="true">↗</span></a>
              : <span key={j} style={{ padding: '12px 0' }}>{src.outlet || src.name || 'Source'}</span>)}
          </div>
        </article>)}
      </div>
    </section>
  </div>;
}
