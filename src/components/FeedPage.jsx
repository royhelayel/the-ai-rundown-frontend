import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Play, User, CheckCircle2 } from 'lucide-react';
import CategoryRow from './CategoryRow';
import DateTimePill from './DateTimePill';
import { SkeletonCategoryRows } from './SkeletonScreens';
import { CATEGORY_COLORS } from '../theme';

function initials(cat) { return (cat || '').slice(0, 2).toUpperCase(); }

const light = {
  bg:        '#ffffff',
  bgSub:     '#f5f5f7',
  border:    'rgba(0,0,0,0.08)',
  text:      '#0a0a0f',
  textSub:   '#3a3a4a',
  textMuted: '#8a8a9a',
};

export default function FeedPage({
  feed,
  briefingData, briefingLoading,
  selectedDay, selectedTime,
  availableDays, availableTimes,
  onSelectDay, onSelectTime,
  onPlayFeed, onPlayCategory, onSelectCategory, onPlayStory, onMarkRead,
  isNarrating, selectedCategory, currentStoryIndex,
  user, onShowAuth,
  playerVisible,
  todayProgress = {}, allCaughtUp = false, caughtUpCount = 0,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  if (!feed) {
    return (
      <div style={{ background: light.bg, minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: light.textMuted, fontSize: '0.9rem' }}>Feed not found.</p>
      </div>
    );
  }

  const totalStories = feed.categories.reduce((s, c) => s + (briefingData[c]?.storyCount || 0), 0);
  const totalMin     = feed.categories.reduce((s, c) => s + (briefingData[c]?.estimatedMin || 0), 0);
  const isLoading    = briefingLoading;

  return (
    <div style={{ background: light.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`* { box-sizing: border-box; } body { background: ${light.bg}; margin: 0; } ::-webkit-scrollbar { display: none; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
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

      {/* Hero */}
      <div style={{ padding: '1.5rem 1.25rem 1rem', maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
        <div className="hero-row">
          <div className="hero-title-row">
            <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: '900', color: light.text, letterSpacing: '-0.03em', lineHeight: 1.15, flexShrink: 0 }}>
              {feed.name}
            </h1>
            <DateTimePill
              selectedDay={selectedDay} selectedTime={selectedTime}
              availableDays={availableDays} availableTimes={availableTimes}
              onSelectDay={onSelectDay} onSelectTime={onSelectTime}
            />
          </div>
          <div className="hero-play-row">
            <div className="ai-btn-wrap">
              <button className="ai-btn-inner" onClick={() => onPlayFeed(feed.categories)}>
                <Play size={14} fill="white" style={{ marginLeft: '1px', flexShrink: 0 }} />
                {isNarrating ? 'Now Playing…' : `Play ${feed.name}`}
              </button>
            </div>
          </div>
        </div>
        {totalStories > 0 && (
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: light.textMuted }}>
            {totalStories} {totalStories === 1 ? 'story' : 'stories'} · ~{totalMin} min
          </p>
        )}
      </div>

      {/* ── Today's Progress ── */}
      {!briefingLoading && feed.categories.length > 0 && !user && (
        <div style={{ padding: '0 1.25rem 1rem', maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
          <button onClick={onShowAuth}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: light.bgSub, border: `1px solid ${light.border}`, borderRadius: '99px', padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = light.border}
          >
            <span style={{ fontSize: '0.75rem' }}>🔒</span>
            <span style={{ fontSize: '0.75rem', fontWeight: '600', color: light.textMuted }}>Sign in to track your reading progress</span>
          </button>
        </div>
      )}
      {!briefingLoading && feed.categories.length > 0 && user && (() => {
        const totalListened = feed.categories.reduce((s, c) => s + (todayProgress[c]?.listened || 0), 0);
        const totalStories  = feed.categories.reduce((s, c) => s + (todayProgress[c]?.total   || 0), 0);
        const msg = allCaughtUp
          ? { icon: '✅', text: `${totalListened} out of ${totalStories} stories read. You are fully caught up!`, color: '#15803d', bg: 'rgba(22,163,74,0.07)', border: 'rgba(22,163,74,0.2)' }
          : totalStories > 0
            ? { icon: totalListened > 0 ? '🔥' : '👇', text: `${totalListened} out of ${totalStories} stories read. ${totalListened > 0 ? 'You are almost there, continue reading!' : 'Continue reading to be fully caught up!'}`, color: totalListened > 0 ? '#92400e' : light.textMuted, bg: totalListened > 0 ? 'rgba(251,146,60,0.07)' : 'transparent', border: totalListened > 0 ? 'rgba(251,146,60,0.2)' : 'transparent' }
            : { icon: '👇', text: 'No stories available yet.', color: light.textMuted, bg: 'transparent', border: 'transparent' };
        return (
          <div style={{ padding: '0 1.25rem 1rem', maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
            {/* Pills + message row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Per-category progress pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', flex: '1 1 auto' }}>
            {feed.categories.map(cat => {
              const p = todayProgress[cat] || {};
              const color = CATEGORY_COLORS[cat] || '#6366f1';
              const done = p.done;
              const total = p.total || 0;
              return (
                <button key={cat}
                  onClick={() => { onSelectCategory(cat); navigate(`/category/${encodeURIComponent(cat)}`, { state: { from: location.pathname } }); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    background: done ? 'rgba(22,163,74,0.08)' : light.bgSub,
                    border: done ? '1px solid rgba(22,163,74,0.3)' : `1px solid ${light.border}`,
                    borderRadius: '99px', padding: '5px 10px 5px 6px',
                    cursor: 'pointer', transition: 'background 0.15s, border-color 0.15s',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => { if (!done) { e.currentTarget.style.background = `${color}12`; e.currentTarget.style.borderColor = `${color}55`; } }}
                  onMouseLeave={e => { e.currentTarget.style.background = done ? 'rgba(22,163,74,0.08)' : light.bgSub; e.currentTarget.style.borderColor = done ? 'rgba(22,163,74,0.3)' : light.border; }}
                >
                  {/* 2-letter badge */}
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.52rem', fontWeight: '800', color }}>{initials(cat)}</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: done ? '#15803d' : light.text, whiteSpace: 'nowrap' }}>{cat}</span>
                  {done ? (
                    <CheckCircle2 size={13} color="#16a34a" strokeWidth={2.5} />
                  ) : total > 0 ? (
                    <>
                      <div style={{ height: '4px', width: '36px', borderRadius: '99px', background: `${color}22`, overflow: 'hidden', flexShrink: 0 }}>
                        <div style={{ height: '100%', width: `${(p.pct || 0) * 100}%`, background: color, borderRadius: '99px', transition: 'width 0.4s ease' }} />
                      </div>
                      <span style={{ fontSize: '0.65rem', color: light.textMuted, fontWeight: '600', flexShrink: 0 }}>{p.listened}/{total}</span>
                    </>
                  ) : (
                    <span style={{ fontSize: '0.65rem', color: light.textMuted, fontWeight: '500', flexShrink: 0 }}>0 stories</span>
                  )}
                </button>
              );
              })}
              </div>

              {/* Contextual message */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                background: msg.bg, border: `1px solid ${msg.border}`,
                borderRadius: '99px', padding: '5px 12px',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: '0.78rem', lineHeight: 1 }}>{msg.icon}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: '600', color: msg.color, whiteSpace: 'nowrap' }}>{msg.text}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Category rows */}
      <div style={{ flex: 1, paddingTop: '0.25rem', paddingBottom: playerVisible ? '8rem' : '3.5rem', maxWidth: 'var(--body-max)', margin: '0 auto', width: '100%' }}>
        {isLoading ? (
          <SkeletonCategoryRows count={3} />
        ) : (
          feed.categories.map(cat => (
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
              fromPath={`/feed/${feed.id}`}
            />
          ))
        )}
      </div>
    </div>
  );
}
