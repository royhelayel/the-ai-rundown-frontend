import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, User } from 'lucide-react';
import { CATEGORY_COLORS } from '../theme';

const light = {
  bg:        '#ffffff',
  bgSub:     '#f5f5f7',
  border:    'rgba(0,0,0,0.08)',
  text:      '#0a0a0f',
  textSub:   '#3a3a4a',
  textMuted: '#8a8a9a',
};

const MY_FEED_COLOR = '#7c3aed';

export default function CustomizeTab({
  feedCategories, onSaveFeedCategories,
  defaultCategories,
  user, onShowAuth,
  playerVisible,
}) {
  const navigate = useNavigate();

  const toggle = (cat) => {
    const next = feedCategories.includes(cat)
      ? feedCategories.filter(c => c !== cat)
      : [...feedCategories, cat];
    onSaveFeedCategories(next);
  };

  return (
    <div style={{ background: light.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`* { box-sizing: border-box; } body { background: ${light.bg}; margin: 0; } ::-webkit-scrollbar { display: none; }`}</style>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: `${light.bg}f0`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: `1px solid ${light.border}`, padding: '0.9rem 1.25rem' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '1.15rem', fontWeight: '900', color: light.text, letterSpacing: '-0.02em' }}>The Rundown</span>
        </div>
      </header>

      {/* Content */}
      <div style={{ flex: 1, maxWidth: '600px', margin: '0 auto', width: '100%', padding: '1.5rem 1.25rem', paddingBottom: playerVisible ? '9rem' : '5rem' }}>

        <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.5rem', fontWeight: '900', color: light.text, letterSpacing: '-0.03em' }}>Customize</h1>
        <p style={{ margin: '0 0 1.75rem', fontSize: '0.85rem', color: light.textMuted }}>Choose what appears in your My Feed tab.</p>

        {/* Not logged in */}
        {!user ? (
          <div style={{ padding: '1.5rem', background: light.bgSub, borderRadius: '16px', border: `1px solid ${light.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.85rem', textAlign: 'center' }}>
            <User size={28} color={light.textMuted} />
            <div>
              <p style={{ margin: '0 0 0.3rem', fontSize: '0.95rem', fontWeight: '700', color: light.text }}>Sign in to customise your feed</p>
              <p style={{ margin: 0, fontSize: '0.82rem', color: light.textMuted }}>Your feed settings are saved to your account.</p>
            </div>
            <button
              onClick={onShowAuth}
              style={{ padding: '0.6rem 1.5rem', background: light.text, color: 'white', border: 'none', borderRadius: '999px', fontWeight: '800', fontSize: '0.88rem', cursor: 'pointer' }}>
              Sign In
            </button>
          </div>
        ) : (
          <>
            {/* My Feed section */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: MY_FEED_COLOR, flexShrink: 0 }} />
                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: MY_FEED_COLOR, textTransform: 'uppercase', letterSpacing: '0.08em' }}>My Feed</span>
                {feedCategories.length > 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: light.textMuted, fontWeight: '500' }}>
                    {feedCategories.length} selected
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {defaultCategories.map(cat => {
                  const isOn  = feedCategories.includes(cat);
                  const color = CATEGORY_COLORS[cat] || '#6366f1';
                  return (
                    <button
                      key={cat}
                      onClick={() => toggle(cat)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.75rem',
                        padding: '0.75rem 1rem',
                        background: isOn ? `${color}08` : light.bgSub,
                        border: `1px solid ${isOn ? color + '30' : light.border}`,
                        borderRadius: '12px', cursor: 'pointer',
                        transition: 'all 0.15s', textAlign: 'left',
                        width: '100%',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = isOn ? `${color}12` : 'rgba(0,0,0,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = isOn ? `${color}08` : light.bgSub}
                    >
                      {/* Category dot */}
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />

                      {/* Label */}
                      <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: isOn ? '700' : '500', color: isOn ? light.text : light.textSub }}>
                        {cat}
                      </span>

                      {/* Toggle */}
                      <div style={{
                        width: '40px', height: '22px', borderRadius: '999px', flexShrink: 0,
                        background: isOn ? color : light.border,
                        position: 'relative', transition: 'background 0.2s',
                      }}>
                        <div style={{
                          position: 'absolute', top: '3px',
                          left: isOn ? 'calc(100% - 19px)' : '3px',
                          width: '16px', height: '16px', borderRadius: '50%',
                          background: 'white',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                          transition: 'left 0.2s',
                        }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {feedCategories.length === 0 && (
              <p style={{ fontSize: '0.82rem', color: light.textMuted, textAlign: 'center', padding: '0.5rem 0' }}>
                Toggle categories above to build your feed.
              </p>
            )}

            {feedCategories.length > 0 && (
              <button
                onClick={() => navigate('/my-feed')}
                style={{ width: '100%', padding: '0.78rem', background: light.text, color: 'white', border: 'none', borderRadius: '999px', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                <Check size={16} />
                Go to My Feed
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
