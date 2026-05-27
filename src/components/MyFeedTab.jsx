import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, ChevronDown, User, Loader } from 'lucide-react';
import CategoryRow from './CategoryRow';
import DateTimePill from './DateTimePill';

const light = {
  bg:        '#ffffff',
  bgSub:     '#f5f5f7',
  border:    'rgba(0,0,0,0.08)',
  text:      '#0a0a0f',
  textSub:   '#3a3a4a',
  textMuted: '#8a8a9a',
  accent:    '#6366f1',
};

function SharedHeader({ user, onShowAuth, selectedDay, selectedTime, availableDays, availableTimes, onSelectDay, onSelectTime }) {
  const navigate = useNavigate();
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: `${light.bg}f0`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: `1px solid ${light.border}`, padding: '0.75rem 1.25rem' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: '900', color: light.text, letterSpacing: '-0.02em', flexShrink: 0 }}>The Rundown</span>
        <div style={{ flex: 1 }} />
        <DateTimePill
          selectedDay={selectedDay} selectedTime={selectedTime}
          availableDays={availableDays} availableTimes={availableTimes}
          onSelectDay={onSelectDay} onSelectTime={onSelectTime}
        />
        <button
          onClick={user ? () => navigate('/settings') : onShowAuth}
          style={{ width: '32px', height: '32px', borderRadius: '50%', background: light.bgSub, border: `1px solid ${light.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: light.textMuted, flexShrink: 0 }}>
          <User size={16} />
        </button>
      </div>
    </header>
  );
}

export default function MyFeedTab({
  briefingData, briefingLoading,
  feedCategories,
  selectedDay, selectedTime,
  availableDays, availableTimes,
  onSelectDay, onSelectTime,
  onPlayMyFeed, onPlayCategory, onSelectCategory,
  isNarrating,
  user, onShowAuth,
  playerVisible,
}) {
  const navigate = useNavigate();
  const [showFeedMenu, setShowFeedMenu] = useState(false);

  const feedCatData = feedCategories.reduce((acc, cat) => {
    if (briefingData[cat]) acc[cat] = briefingData[cat];
    return acc;
  }, {});

  const totalStories = feedCategories.reduce((s, c) => s + (briefingData[c]?.storyCount || 0), 0);
  const totalMin     = feedCategories.reduce((s, c) => s + (briefingData[c]?.estimatedMin || 0), 0);

  const isLoading = briefingLoading && totalStories === 0;

  // Not logged in
  if (!user) {
    return (
      <div style={{ background: light.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <style>{`* { box-sizing: border-box; } body { background: ${light.bg}; margin: 0; } ::-webkit-scrollbar { display: none; }`}</style>
        <SharedHeader user={user} onShowAuth={onShowAuth} selectedDay={selectedDay} selectedTime={selectedTime} availableDays={availableDays} availableTimes={availableTimes} onSelectDay={onSelectDay} onSelectTime={onSelectTime} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', paddingBottom: '6rem', gap: '1rem', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: light.bgSub, border: `1px solid ${light.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={24} color={light.textMuted} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.3rem', fontWeight: '900', color: light.text, letterSpacing: '-0.02em' }}>Your Personalised Feed</h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: light.textMuted, lineHeight: 1.55 }}>Sign in to create your own feed and listen to only the categories you care about.</p>
          </div>
          <button
            onClick={onShowAuth}
            style={{ padding: '0.7rem 1.8rem', background: light.text, color: 'white', border: 'none', borderRadius: '999px', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer' }}>
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Logged in but no feed set up
  if (feedCategories.length === 0) {
    return (
      <div style={{ background: light.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <style>{`* { box-sizing: border-box; } body { background: ${light.bg}; margin: 0; } ::-webkit-scrollbar { display: none; }`}</style>
        <SharedHeader user={user} onShowAuth={onShowAuth} selectedDay={selectedDay} selectedTime={selectedTime} availableDays={availableDays} availableTimes={availableTimes} onSelectDay={onSelectDay} onSelectTime={onSelectTime} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', paddingBottom: '6rem', gap: '1rem', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          <div style={{ fontSize: '2.5rem', lineHeight: 1 }}>⭐</div>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.3rem', fontWeight: '900', color: light.text, letterSpacing: '-0.02em' }}>Set Up My Feed</h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: light.textMuted, lineHeight: 1.55 }}>Choose the categories you want in your feed and we'll keep it personalised for you.</p>
          </div>
          <button
            onClick={() => navigate('/customize')}
            style={{ padding: '0.7rem 1.8rem', background: light.text, color: 'white', border: 'none', borderRadius: '999px', fontWeight: '800', fontSize: '0.9rem', cursor: 'pointer' }}>
            Set Up My Feed
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: light.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { background: ${light.bg}; margin: 0; }
        ::-webkit-scrollbar { display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <SharedHeader user={user} onShowAuth={onShowAuth} selectedDay={selectedDay} selectedTime={selectedTime} availableDays={availableDays} availableTimes={availableTimes} onSelectDay={onSelectDay} onSelectTime={onSelectTime} />

      {/* Hero */}
      <div style={{ padding: '1.5rem 1.25rem 1rem', maxWidth: '600px', margin: '0 auto', width: '100%' }}>

        {/* Feed picker pill */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.6rem' }}>
          <button
            onClick={() => setShowFeedMenu(v => !v)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.3rem 0.75rem 0.3rem 0.65rem', background: light.bgSub, border: `1px solid ${light.border}`, borderRadius: '999px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '700', color: light.textSub }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#7c3aed', flexShrink: 0 }} />
            My Feed
            <ChevronDown size={12} color={light.textMuted} />
          </button>

          {showFeedMenu && (
            <>
              <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowFeedMenu(false)} />
              <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100, background: light.bg, border: `1px solid ${light.border}`, borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: '180px', overflow: 'hidden' }}>
                <div style={{ padding: '0.55rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: `rgba(124,58,237,0.06)` }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7c3aed', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: '700', color: light.text }}>My Feed</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.65rem', fontWeight: '800', color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active</span>
                </div>
                <div style={{ height: '1px', background: light.border }} />
                <button
                  onClick={() => { setShowFeedMenu(false); navigate('/customize'); }}
                  style={{ width: '100%', padding: '0.55rem 0.9rem', background: 'none', border: 'none', textAlign: 'left', fontSize: '0.82rem', color: light.textMuted, cursor: 'pointer', fontWeight: '500' }}
                  onMouseEnter={e => e.currentTarget.style.background = light.bgSub}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  + Create new feed
                </button>
              </div>
            </>
          )}
        </div>

        <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.65rem', fontWeight: '900', color: light.text, letterSpacing: '-0.03em', lineHeight: 1.15 }}>
          My Feed
        </h1>
        {totalStories > 0 && (
          <p style={{ margin: '0 0 1.25rem', fontSize: '0.82rem', color: light.textSub, fontWeight: '500' }}>
            {totalStories} {totalStories === 1 ? 'story' : 'stories'} · {feedCategories.length} {feedCategories.length === 1 ? 'category' : 'categories'} · ~{totalMin} min
          </p>
        )}

        {/* Play My Feed button */}
        <button
          onClick={onPlayMyFeed}
          style={{ width: '100%', padding: '0.88rem 1.5rem', background: 'linear-gradient(135deg, #18182a 0%, #1e1b35 100%)', border: '2px solid #7c3aed', borderRadius: '12px', color: 'white', fontSize: '1rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', letterSpacing: '-0.01em', marginBottom: '0.5rem' }}>
          <Play size={18} fill="white" style={{ marginLeft: '2px', flexShrink: 0 }} />
          {isNarrating ? 'Now Playing…' : 'Play My Feed'}
        </button>
      </div>

      {/* Category rows */}
      <div style={{ flex: 1, paddingTop: '0.5rem', paddingBottom: playerVisible ? '9rem' : '5rem', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '0.75rem', color: light.textMuted }}>
            <Loader size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: '0.88rem' }}>Loading your feed…</span>
          </div>
        ) : (
          feedCategories.map(cat => (
            <CategoryRow
              key={cat}
              cat={cat}
              catData={feedCatData[cat]}
              onOpen={c => onSelectCategory(c)}
              onPlay={c => { onSelectCategory(c); onPlayCategory(c); }}
              fromPath="/my-feed"
            />
          ))
        )}
      </div>
    </div>
  );
}
