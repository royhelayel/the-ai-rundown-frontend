import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, User, Play, ChevronRight, ChevronLeft, Loader } from 'lucide-react';
import { colors, CATEGORY_COLORS, CATEGORY_IMAGES } from '../theme';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' });
}

function isToday(dateStr) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(new Date());
  return dateStr === today;
}

// ── CategoryRow ───────────────────────────────────────────────────────────────

function CategoryRow({ cat, catData, onOpen, onPlay, isNarrating, isCurrentCat }) {
  const navigate = useNavigate();
  const color = CATEGORY_COLORS[cat] || colors.accent;
  const image = CATEGORY_IMAGES[cat];
  const info = catData || null;

  const handleOpen = () => {
    onOpen(cat);
    navigate(`/category/${encodeURIComponent(cat)}`);
  };

  return (
    <div style={{ marginBottom: '2rem' }}>
      {/* Category header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', padding: '0 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.1em', color: colors.text, textTransform: 'uppercase' }}>{cat}</span>
          {info && (
            <span style={{ fontSize: '0.72rem', color: colors.textMuted, fontWeight: '500' }}>
              {info.storyCount} {info.storyCount === 1 ? 'story' : 'stories'} · ~{info.estimatedMin} min
            </span>
          )}
        </div>
        <button onClick={handleOpen} style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', background: 'none', border: 'none', color: colors.textSub, cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', padding: '0.25rem 0' }}>
          See all <ChevronRight size={14} />
        </button>
      </div>

      {/* Story preview cards */}
      {info && info.previewStories?.length > 0 ? (
        <div style={{ display: 'flex', gap: '0.65rem', overflowX: 'auto', scrollbarWidth: 'none', padding: '0 1rem', paddingBottom: '0.25rem' }}>
          {info.previewStories.map((story, i) => (
            <button key={i} onClick={() => { onOpen(cat); navigate(`/category/${encodeURIComponent(cat)}/story/${i}`); }}
              style={{ flexShrink: 0, width: '140px', background: colors.bgCard, borderRadius: '12px', border: `1px solid ${colors.border}`, overflow: 'hidden', cursor: 'pointer', textAlign: 'left', transition: 'transform 0.15s', padding: 0 }}>
              {/* Thumbnail */}
              <div style={{ width: '100%', height: '90px', position: 'relative', overflow: 'hidden' }}>
                <img src={image} alt={cat} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', filter: 'brightness(0.75)' }} loading="lazy" />
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.7))` }} />
              </div>
              {/* Headline */}
              <div style={{ padding: '0.55rem 0.6rem 0.65rem' }}>
                <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: '700', color: colors.text, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {story.headline}
                </p>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.65rem', color: colors.textMuted, fontWeight: '500' }}>2 min read</p>
              </div>
            </button>
          ))}

          {/* Play category button as last card */}
          <button onClick={() => onPlay(cat)}
            style={{ flexShrink: 0, width: '80px', background: `${color}18`, border: `1px solid ${color}44`, borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: color, transition: 'all 0.15s' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Play size={16} fill="white" color="white" style={{ marginLeft: '2px' }} />
            </div>
            <span style={{ fontSize: '0.65rem', fontWeight: '700', textAlign: 'center', lineHeight: 1.2 }}>Play</span>
          </button>
        </div>
      ) : (
        <div style={{ padding: '0 1rem' }}>
          <div style={{ height: '130px', background: colors.bgCard, borderRadius: '12px', border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: colors.textMuted }}>
              {catData === undefined ? 'Loading…' : 'Not available'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
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
  const totalCats = Object.values(briefingData).filter(d => d?.storyCount > 0).length;
  const totalMin = Object.values(briefingData).reduce((s, d) => s + (d?.estimatedMin || 0), 0);

  const timeLabel = availableTimes?.find(t => t.value === selectedTime)?.label || 'Briefing';
  const greeting = timeLabel === 'Morning' ? 'Morning Briefing' : timeLabel === 'Evening' ? 'Evening Briefing' : 'Your Briefing';

  const dayIndex = availableDays?.findIndex(d => d.fullDate === selectedDay) ?? -1;
  const canPrevDay = dayIndex > 0;
  const canNextDay = dayIndex < (availableDays?.length ?? 0) - 1;

  return (
    <div style={{ background: colors.bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        * { box-sizing: border-box; }
        body { background: ${colors.bg}; margin: 0; }
        ::-webkit-scrollbar { display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Header ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: `${colors.bg}ee`, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: `1px solid ${colors.border}`, padding: '0.9rem 1.25rem' }}>
        <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: '900', color: colors.text, letterSpacing: '-0.02em' }}>The Rundown</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button onClick={() => navigate('/settings')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', color: colors.textSub, display: 'flex', alignItems: 'center' }}>
              <Menu size={22} />
            </button>
            <button onClick={user ? () => navigate('/settings') : onShowAuth} style={{ width: '32px', height: '32px', borderRadius: '50%', background: colors.bgCard, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: colors.textSub, flexShrink: 0 }}>
              <User size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Briefing hero ── */}
      <div style={{ padding: '1.5rem 1.25rem 1rem', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        <p style={{ margin: '0 0 0.2rem', fontSize: '0.72rem', fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {isToday(selectedDay) ? 'Today' : formatDate(selectedDay)}
        </p>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.65rem', fontWeight: '900', color: colors.text, letterSpacing: '-0.03em', lineHeight: 1.15 }}>
          Your {greeting}
        </h1>
        {totalStories > 0 && (
          <p style={{ margin: '0 0 1.25rem', fontSize: '0.82rem', color: colors.textSub, fontWeight: '500' }}>
            {totalStories} {totalStories === 1 ? 'story' : 'stories'} · {totalCats} {totalCats === 1 ? 'category' : 'categories'} · ~{totalMin} min
          </p>
        )}

        {/* Date nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <button onClick={() => canPrevDay && onSelectDay(availableDays[dayIndex - 1].fullDate)}
            disabled={!canPrevDay}
            style={{ width: '30px', height: '30px', borderRadius: '50%', background: canPrevDay ? colors.bgCard : 'transparent', border: `1px solid ${canPrevDay ? colors.border : 'transparent'}`, color: canPrevDay ? colors.textSub : colors.textMuted, cursor: canPrevDay ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ChevronLeft size={14} />
          </button>
          <div style={{ flex: 1, overflowX: 'auto', scrollbarWidth: 'none', display: 'flex', gap: '0.35rem' }}>
            {availableDays?.map(day => (
              <button key={day.fullDate} onClick={() => onSelectDay(day.fullDate)}
                style={{ flexShrink: 0, padding: '0.35rem 0.75rem', borderRadius: '999px', border: `1px solid ${day.fullDate === selectedDay ? colors.accent : colors.border}`, background: day.fullDate === selectedDay ? `${colors.accent}22` : 'transparent', color: day.fullDate === selectedDay ? colors.accent : colors.textSub, fontSize: '0.78rem', fontWeight: day.fullDate === selectedDay ? '700' : '500', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
                {isToday(day.fullDate) ? 'Today' : `${day.label} ${day.date}`}
              </button>
            ))}
          </div>
          <button onClick={() => canNextDay && onSelectDay(availableDays[dayIndex + 1].fullDate)}
            disabled={!canNextDay}
            style={{ width: '30px', height: '30px', borderRadius: '50%', background: canNextDay ? colors.bgCard : 'transparent', border: `1px solid ${canNextDay ? colors.border : 'transparent'}`, color: canNextDay ? colors.textSub : colors.textMuted, cursor: canNextDay ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Time pills */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {availableTimes?.map(t => (
            <button key={t.value} onClick={() => onSelectTime(t.value)}
              style={{ padding: '0.35rem 0.9rem', borderRadius: '999px', border: `1px solid ${t.value === selectedTime ? colors.accent : colors.border}`, background: t.value === selectedTime ? `${colors.accent}22` : 'transparent', color: t.value === selectedTime ? colors.accent : colors.textSub, fontSize: '0.78rem', fontWeight: t.value === selectedTime ? '700' : '500', cursor: 'pointer', transition: 'all 0.15s' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Play Briefing CTA */}
        <button onClick={onPlayBriefing}
          style={{ width: '100%', padding: '0.9rem 1.5rem', borderRadius: '14px', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', border: 'none', color: 'white', fontSize: '1rem', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', letterSpacing: '-0.01em', transition: 'opacity 0.15s', boxShadow: '0 4px 24px rgba(99,102,241,0.35)' }}>
          <Play size={18} fill="white" style={{ marginLeft: '2px', flexShrink: 0 }} />
          {isNarrating ? 'Now Playing…' : 'Play Briefing'}
        </button>
      </div>

      {/* ── Category sections ── */}
      <div style={{ flex: 1, paddingTop: '0.5rem', paddingBottom: '6rem', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
        {briefingLoading && totalStories === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '0.75rem', color: colors.textMuted }}>
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
              isNarrating={isNarrating}
              isCurrentCat={selectedCategory === cat}
            />
          ))
        )}
      </div>
    </div>
  );
}
