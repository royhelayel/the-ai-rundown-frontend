import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, User, Loader, Plus } from 'lucide-react';
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

function SharedHeader({ user, onShowAuth }) {
  const navigate = useNavigate();
  return (
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: `${light.bg}f0`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: `1px solid ${light.border}`, padding: '0.75rem 1.25rem' }}>
      <div style={{ maxWidth: 'var(--body-max)', margin: '0 auto', display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: '900', color: light.text, letterSpacing: '-0.02em' }}>The Rundown</span>
        <div style={{ flex: 1 }} />
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
  userFeeds, onPlayFeed,
  selectedDay, selectedTime,
  availableDays, availableTimes,
  onSelectDay, onSelectTime,
  onPlayMyFeed, onPlayCategory, onSelectCategory, onPlayStory,
  isNarrating, selectedCategory, currentStoryIndex,
  user, onShowAuth,
  playerVisible,
}) {
  const navigate = useNavigate();

  // Union of all categories across all feeds (for loading check)
  const allFeedCats = [...new Set((userFeeds || []).flatMap(f => f.categories))];
  const totalStories = allFeedCats.reduce((s, c) => s + (briefingData[c]?.storyCount || 0), 0);
  const isLoading = briefingLoading && totalStories === 0;

  // Not logged in
  if (!user) {
    return (
      <div style={{ background: light.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <style>{`* { box-sizing: border-box; } body { background: ${light.bg}; margin: 0; } ::-webkit-scrollbar { display: none; }`}</style>
        <SharedHeader user={user} onShowAuth={onShowAuth} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', paddingBottom: '6rem', gap: '1rem', maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
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
  if (!userFeeds?.length) {
    return (
      <div style={{ background: light.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <style>{`* { box-sizing: border-box; } body { background: ${light.bg}; margin: 0; } ::-webkit-scrollbar { display: none; }`}</style>
        <SharedHeader user={user} onShowAuth={onShowAuth} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem', paddingBottom: '6rem', gap: '1rem', maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
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
      <SharedHeader user={user} onShowAuth={onShowAuth} />

      {/* Hero row — mirrors Briefing layout */}
      <div style={{ padding: '1.5rem 1.25rem 1rem', maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: '900', color: light.text, letterSpacing: '-0.03em', lineHeight: 1.15 }}>My Feed</h1>
          <DateTimePill
            selectedDay={selectedDay} selectedTime={selectedTime}
            availableDays={availableDays} availableTimes={availableTimes}
            onSelectDay={onSelectDay} onSelectTime={onSelectTime}
          />
          <div style={{ flex: 1 }} />
          <button
            onClick={() => navigate('/customize')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.38rem 0.85rem', borderRadius: '999px', background: light.bgSub, border: `1px solid ${light.border}`, color: light.textSub, fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', flexShrink: 0 }}>
            <Plus size={12} /> New feed
          </button>
        </div>
      </div>

      {/* Named feed sections */}
      <div style={{ flex: 1, paddingTop: '0.25rem', paddingBottom: playerVisible ? '8rem' : '3.5rem', maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '0.75rem', color: light.textMuted }}>
            <Loader size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: '0.88rem' }}>Loading your feed…</span>
          </div>
        ) : (
          (userFeeds || []).map(feed => {
            const feedTotal = feed.categories.reduce((s, c) => s + (briefingData[c]?.storyCount || 0), 0);
            const feedMin   = feed.categories.reduce((s, c) => s + (briefingData[c]?.estimatedMin || 0), 0);
            return (
              <div key={feed.id} style={{ marginBottom: '1rem' }}>
                {/* Feed section header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 1.25rem', marginBottom: '0.5rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#7c3aed', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: '800', color: light.text }}>{feed.name}</span>
                  {feedTotal > 0 && <span style={{ fontSize: '0.72rem', color: light.textMuted }}>{feedTotal} {feedTotal === 1 ? 'story' : 'stories'} · ~{feedMin} min</span>}
                  <button
                    onClick={() => onPlayFeed(feed.categories)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.28rem 0.65rem', borderRadius: '999px', background: `rgba(124,58,237,0.12)`, border: `1px solid rgba(124,58,237,0.3)`, color: '#7c3aed', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}>
                    <Play size={9} fill="#7c3aed" color="#7c3aed" />
                    Play
                  </button>
                </div>
                {/* Categories */}
                {feed.categories.map(cat => (
                  <CategoryRow
                    key={cat}
                    cat={cat}
                    catData={briefingData[cat]}
                    onOpen={c => onSelectCategory(c)}
                    onPlay={c => { onSelectCategory(c); onPlayCategory(c); }}
                    onPlayStory={onPlayStory}
                    isNarrating={isNarrating}
                    activeCategory={selectedCategory}
                    activeStoryIndex={currentStoryIndex}
                    fromPath="/my-feed"
                  />
                ))}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
