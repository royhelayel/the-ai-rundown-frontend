import React from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Play, Loader } from 'lucide-react';
import CategoryRow from './CategoryRow';
import DateTimePill from './DateTimePill';

// Light-mode tokens
const light = {
  bg:        '#ffffff',
  bgSub:     '#f5f5f7',
  border:    'rgba(0,0,0,0.08)',
  text:      '#0a0a0f',
  textSub:   '#3a3a4a',
  textMuted: '#8a8a9a',
  accent:    '#6366f1',
};

function isToday(dateStr) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(new Date());
  return dateStr === today;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

// ── BriefingFeed ──────────────────────────────────────────────────────────────

export default function BriefingFeed({
  briefingData, briefingLoading,
  selectedDay, selectedTime,
  availableDays, availableTimes,
  onSelectDay, onSelectTime,
  defaultCategories, customCategories,
  onPlayBriefing, onPlayCategory, onSelectCategory,
  isNarrating, isPaused, selectedCategory,
  user, onShowAuth, onShowSettings,
  playerVisible,
  newsLanguage,
}) {
  const navigate = useNavigate();

  const allCats = [...defaultCategories, ...(customCategories || [])];

  const totalStories = Object.values(briefingData).reduce((s, d) => s + (d?.storyCount || 0), 0);
  const totalCats    = Object.values(briefingData).filter(d => d?.storyCount > 0).length;
  const totalMin     = Object.values(briefingData).reduce((s, d) => s + (d?.estimatedMin || 0), 0);

  const timeLabel = availableTimes?.find(t => t.value === selectedTime)?.label || '';
  const greeting  = timeLabel === 'Morning' ? 'Morning Briefing' : timeLabel === 'Evening' ? 'Evening Briefing' : 'Your Briefing';
  const dayLabel  = isToday(selectedDay) ? 'Today' : formatDate(selectedDay);

  return (
    <div style={{ background: light.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { background: ${light.bg}; margin: 0; }
        ::-webkit-scrollbar { display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes border-flow {
          0%   { background-position: 0% 50%; }
          30%  { background-position: 100% 50%; }
          55%  { background-position: 100% 50%; }
          85%  { background-position: 0% 50%; }
          100% { background-position: 0% 50%; }
        }
        .ai-btn-wrap {
          position: relative; border-radius: 14px; padding: 3px;
          background: linear-gradient(90deg,
            #6366f1, #0891b2, #16a34a, #d97706,
            #e11d48, #9333ea, #db2777, #2563eb, #6366f1
          );
          background-size: 300% 100%;
          animation: border-flow 10s ease-in-out infinite;
        }
        .ai-btn-inner {
          width: 100%; padding: 0.88rem 1.5rem;
          border-radius: 11px;
          background: linear-gradient(135deg, #18182a 0%, #1e1b35 100%);
          border: none; color: white;
          font-size: 1rem; font-weight: 800; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          gap: 0.6rem; letter-spacing: -0.01em;
          transition: opacity 0.15s;
          font-family: inherit;
        }
        .ai-btn-inner:hover { opacity: 0.9; }
      `}</style>

      {/* ── Header ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: `${light.bg}f0`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: `1px solid ${light.border}`, padding: '0.75rem 1.25rem' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: '900', color: light.text, letterSpacing: '-0.02em', flexShrink: 0 }}>The Rundown</span>
          <div style={{ flex: 1 }} />
          {/* Global date/time picker pill */}
          <DateTimePill
            selectedDay={selectedDay}
            selectedTime={selectedTime}
            availableDays={availableDays}
            availableTimes={availableTimes}
            onSelectDay={onSelectDay}
            onSelectTime={onSelectTime}
          />
          <button
            onClick={user ? () => navigate('/settings') : onShowAuth}
            style={{ width: '32px', height: '32px', borderRadius: '50%', background: light.bgSub, border: `1px solid ${light.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: light.textMuted, flexShrink: 0 }}>
            <User size={16} />
          </button>
        </div>
      </header>

      {/* ── Briefing hero ── */}
      <div style={{ padding: '1.5rem 1.25rem 1rem', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        <p style={{ margin: '0 0 0.2rem', fontSize: '0.72rem', fontWeight: '700', color: light.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {dayLabel}
        </p>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.65rem', fontWeight: '900', color: light.text, letterSpacing: '-0.03em', lineHeight: 1.15 }}>
          {greeting}
        </h1>
        {totalStories > 0 && (
          <p style={{ margin: '0 0 1.25rem', fontSize: '0.82rem', color: light.textSub, fontWeight: '500' }}>
            {totalStories} {totalStories === 1 ? 'story' : 'stories'} · {totalCats} {totalCats === 1 ? 'category' : 'categories'} · ~{totalMin} min
          </p>
        )}

        {/* Play Briefing CTA — animated AI gradient border */}
        <div className="ai-btn-wrap" style={{ width: '100%' }}>
          <button className="ai-btn-inner" onClick={onPlayBriefing}>
            <Play size={18} fill="white" style={{ marginLeft: '2px', flexShrink: 0 }} />
            {isNarrating ? 'Now Playing…' : 'Play Briefing'}
          </button>
        </div>
      </div>

      {/* ── Category sections ── */}
      <div style={{ flex: 1, paddingTop: '0.5rem', paddingBottom: playerVisible ? '8rem' : '3.5rem', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        {briefingLoading && totalStories === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '0.75rem', color: light.textMuted }}>
            <Loader size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: '0.88rem' }}>Loading briefing…</span>
          </div>
        ) : (
          allCats.map(cat => (
            <CategoryRow
              key={cat}
              cat={cat}
              catData={briefingData[cat]}
              onOpen={(c) => { onSelectCategory(c); }}
              onPlay={(c) => { onSelectCategory(c); onPlayCategory(c); }}
              fromPath="/"
            />
          ))
        )}
      </div>
    </div>
  );
}
