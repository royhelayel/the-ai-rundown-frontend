import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, User } from 'lucide-react';
import CategoryRow from './CategoryRow';
import DateTimePill from './DateTimePill';
import { SkeletonCategoryRows } from './SkeletonScreens';
import { formatDuration } from '../utils';

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
        <span className="header-brand" style={{ fontSize: '1.1rem', fontWeight: '900', color: light.text, letterSpacing: '-0.02em' }}>The Rundown</span>
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
  onPlayMyFeed, onPlayCategory, onSelectCategory, onPlayStory, onMarkRead,
  isNarrating, selectedCategory, currentStoryIndex,
  user, onShowAuth,
  playerVisible,
}) {
  const navigate = useNavigate();

  // Union of all categories across all feeds (for loading check)
  const allFeedCats = [...new Set((userFeeds || []).flatMap(f => f.categories))];
  const totalStories = allFeedCats.reduce((s, c) => s + (briefingData[c]?.storyCount || 0), 0);
  const isLoading = briefingLoading;

  // Not logged in
  if (!user) {
    return (
      <div style={{ background: light.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
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
      <div style={{ background: light.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
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
    <div style={{ background: light.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { background: ${light.bg}; margin: 0; }
        ::-webkit-scrollbar { display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <SharedHeader user={user} onShowAuth={onShowAuth} />

      {/* Hero row */}
      <div style={{ padding: '1.5rem 1.25rem 1rem', maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
        <div className="hero-row">
          <div className="hero-title-row">
            <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: '900', color: light.text, letterSpacing: '-0.03em', lineHeight: 1.15, flexShrink: 0 }}>My Feed</h1>
            <DateTimePill
              selectedDay={selectedDay} selectedTime={selectedTime}
              availableDays={availableDays} availableTimes={availableTimes}
              onSelectDay={onSelectDay} onSelectTime={onSelectTime}
            />
          </div>
          <div className="hero-play-row">
            <div className="ai-btn-wrap">
              <button className="ai-btn-inner" onClick={onPlayMyFeed}>
                <Play size={14} fill="white" style={{ marginLeft: '1px', flexShrink: 0 }} />
                {isNarrating ? 'Now Playing…' : 'Play My Feed'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Named feed sections */}
      <div style={{ flex: 1, paddingTop: '0.25rem', paddingBottom: playerVisible ? '8rem' : '3.5rem', maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
        {isLoading ? (
          <SkeletonCategoryRows count={3} />
        ) : (
          (userFeeds || []).map((feed, idx) => {
            const feedTotal = feed.categories.reduce((s, c) => s + (briefingData[c]?.storyCount || 0), 0);
            const feedSec   = feed.categories.reduce((s, c) => s + (briefingData[c]?.estimatedSec || 0), 0);
            return (
              <div key={feed.id} style={{ marginBottom: '0.5rem' }}>
                {/* Lean divider with stats — no dot/name label */}
                {(userFeeds.length > 1) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.6rem 1.25rem 0.35rem', borderTop: idx > 0 ? `1px solid ${light.border}` : 'none', marginTop: idx > 0 ? '0.75rem' : 0 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: '700', color: light.text }}>{feed.name}</span>
                    {feedTotal > 0 && <span style={{ fontSize: '0.72rem', color: light.textMuted }}>{feedTotal} {feedTotal === 1 ? 'story' : 'stories'} · ~{formatDuration(feedSec)}</span>}
                  </div>
                )}
                {/* Categories */}
                {feed.categories.map(cat => (
                  <CategoryRow
                    key={cat}
                    cat={cat}
                    catData={briefingData[cat]}
                    onOpen={c => onSelectCategory(c)}
                    onPlay={c => { onSelectCategory(c); onPlayCategory(c); }}
                    onPlayStory={onPlayStory}
                    onMarkRead={onMarkRead}
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
