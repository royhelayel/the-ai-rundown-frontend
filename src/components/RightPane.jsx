import React from 'react';
import { Play, CheckCircle2 } from 'lucide-react';
import { CATEGORY_COLORS } from '../theme';
import { timeAgo } from '../hooks/useListenHistory';

const light = {
  bg:        '#ffffff',
  bgSub:     '#f5f5f7',
  border:    'rgba(0,0,0,0.08)',
  text:      '#0a0a0f',
  textMuted: '#8a8a9a',
};

function initials(cat) { return (cat || '').slice(0, 2).toUpperCase(); }

// ── Weekly grid ──────────────────────────────────────────────────────────────
function WeeklyGrid({ weeklyGrid = [], selectedDay = null, onSelectDay }) {
  return (
    <div style={{ display: 'flex', gap: '3px', marginBottom: '2px' }}>
      {weeklyGrid.map(day => {
        const isSelected = selectedDay ? day.key === selectedDay : day.isToday;
        const bg = day.status === 2 ? '#16a34a' : day.status === 1 ? '#d97706' : light.bgSub;
        const border = isSelected ? '2px solid #6366f1' : `1px solid ${light.border}`;
        return (
          <button
            key={day.key}
            title={day.key}
            onClick={() => onSelectDay?.(isSelected && !day.isToday ? null : day.key)}
            style={{
              flex: 1, height: '28px', borderRadius: '5px',
              background: bg, border,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', padding: 0,
              outline: 'none', transition: 'opacity 0.1s',
              opacity: isSelected ? 1 : 0.75,
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = isSelected ? '1' : '0.75'; }}
          >
            <span style={{ fontSize: '0.5rem', fontWeight: '700', color: day.status > 0 ? '#fff' : light.textMuted }}>
              {day.day}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Badge chip ───────────────────────────────────────────────────────────────
function BadgeChip({ tier, streak }) {
  if (!tier) return null;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '2px',
      background: `${tier.color}18`, border: `1px solid ${tier.color}44`,
      borderRadius: '5px', padding: '1px 5px',
      fontSize: '0.52rem', fontWeight: '800', color: tier.color,
      letterSpacing: '0.03em',
    }}>
      {tier.label}
    </span>
  );
}

export default function RightPane({ stats = {}, history = [], onPlayStory, user = null, onShowAuth, selectedProgressDay = null, onSelectProgressDay }) {
  const {
    todayProgress = {},
    allCaughtUp = false,
    weeklyGrid = [],
    perfectStreak = 0,
    categoryBadges = {},
  } = stats;

  const cats = Object.keys(todayProgress);

  // Label for the selected day (e.g. "Thu 28" or "Today")
  const today = new Date().toISOString().slice(0, 10);
  const progressDayLabel = (() => {
    if (!selectedProgressDay || selectedProgressDay === today) return null;
    const d = new Date(selectedProgressDay + 'T12:00:00'); // noon avoids DST shifts
    return new Intl.DateTimeFormat('en', { weekday: 'short', day: 'numeric' }).format(d);
  })();

  return (
    <nav style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '260px',
      background: light.bg, borderLeft: `1px solid ${light.border}`,
      display: 'flex', flexDirection: 'column', zIndex: 45,
      overflowY: 'auto',
    }}>

      {/* ── Your Progress ── */}
      {!user && (
        <div style={{ padding: '1.4rem 0.85rem 0.9rem' }}>
          <p style={{ margin: '0 0 0.65rem', fontSize: '0.6rem', fontWeight: '800', color: light.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Reading Progress
          </p>
          <button onClick={onShowAuth}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', background: light.bgSub, border: `1px solid ${light.border}`, borderRadius: '10px', padding: '10px 11px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = light.border}
          >
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>🔒</span>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '700', color: light.text, marginBottom: '2px' }}>Sign in to track your reading progress</div>
              <div style={{ fontSize: '0.6rem', color: light.textMuted, fontWeight: '500', lineHeight: 1.4 }}>See how many stories you've read across all your feeds.</div>
            </div>
          </button>
        </div>
      )}
      {user && <div style={{ padding: '1.4rem 0.85rem 0.9rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.65rem' }}>
          <p style={{ margin: 0, fontSize: '0.6rem', fontWeight: '800', color: light.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em', flex: 1 }}>
            Reading Progress
          </p>
          {progressDayLabel && (
            <button
              onClick={() => onSelectProgressDay?.(null)}
              style={{ display: 'flex', alignItems: 'center', gap: '3px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '99px', padding: '2px 7px', cursor: 'pointer', fontSize: '0.55rem', fontWeight: '700', color: '#6366f1' }}
              title="Back to today"
            >
              {progressDayLabel} ✕
            </button>
          )}
        </div>

        {/* Caught-up banner — only for today */}
        {allCaughtUp && !selectedProgressDay && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            background: 'rgba(22,163,74,0.1)', border: '1px solid rgba(22,163,74,0.28)',
            borderRadius: '9px', padding: '0.42rem 0.55rem', marginBottom: '0.6rem',
          }}>
            <CheckCircle2 size={14} color="#16a34a" strokeWidth={2.5} />
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: '800', color: '#15803d', lineHeight: 1.2 }}>All Caught Up!</div>
              <div style={{ fontSize: '0.56rem', color: light.textMuted, fontWeight: '500' }}>Perfect day!</div>
            </div>
          </div>
        )}

        {/* Perfect streak */}
        {perfectStreak > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.22)',
            borderRadius: '9px', padding: '0.4rem 0.55rem', marginBottom: '0.55rem',
          }}>
            <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>🔥</span>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#c2410c', lineHeight: 1.2 }}>{perfectStreak}-day streak</div>
              <div style={{ fontSize: '0.56rem', color: light.textMuted, fontWeight: '500' }}>Perfect days</div>
            </div>
          </div>
        )}

        {/* Weekly calendar */}
        {weeklyGrid.length > 0 && (
          <>
            <div style={{ fontSize: '0.56rem', color: light.textMuted, fontWeight: '600', marginBottom: '4px' }}>This week · tap a day</div>
            <WeeklyGrid weeklyGrid={weeklyGrid} selectedDay={selectedProgressDay} onSelectDay={onSelectProgressDay} />
            <div style={{ display: 'flex', gap: '8px', marginBottom: '0.6rem', marginTop: '3px' }}>
              {[{color:'#16a34a',label:'All done'},{color:'#d97706',label:'Partial'},{color:light.bgSub,label:'None',dark:true}].map(l => (
                <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '2px', background: l.color, border: l.dark ? `1px solid ${light.border}` : 'none' }} />
                  <span style={{ fontSize: '0.48rem', color: light.textMuted, fontWeight: '600' }}>{l.label}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Per-category progress */}
        {cats.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {cats.map(cat => {
              const p = todayProgress[cat] || {};
              const color = CATEGORY_COLORS[cat] || '#6366f1';
              const badge = categoryBadges[cat];
              return (
                <div key={cat} style={{ background: light.bgSub, borderRadius: '8px', padding: '0.38rem 0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: p.total > 0 ? '4px' : 0 }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.62rem', fontWeight: '800', color, lineHeight: 1 }}>{initials(cat)}</span>
                    </div>
                    <span style={{ flex: 1, fontSize: '0.85rem', fontWeight: '600', color: light.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat}</span>
                    {p.done ? (
                      <CheckCircle2 size={12} color="#16a34a" strokeWidth={2.5} />
                    ) : p.total > 0 ? (
                      <span style={{ fontSize: '0.65rem', color: light.textMuted, fontWeight: '600', flexShrink: 0 }}>{p.listened}/{p.total}</span>
                    ) : null}
                  </div>
                  {/* Progress bar */}
                  {p.total > 0 && (
                    <div style={{ height: '3px', borderRadius: '99px', background: `${color}22`, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${p.pct * 100}%`, background: p.done ? '#16a34a' : color, borderRadius: '99px', transition: 'width 0.4s ease' }} />
                    </div>
                  )}
                  {/* Category badge */}
                  {badge?.tier && (
                    <div style={{ marginTop: '3px' }}>
                      <BadgeChip tier={badge.tier} streak={badge.streak} />
                      <span style={{ fontSize: '0.5rem', color: light.textMuted, marginLeft: '4px' }}>{badge.streak}d streak</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem', color: light.textMuted, lineHeight: 1.5 }}>
            Add categories to a feed to track your progress.
          </p>
        )}
      </div>}

      {/* ── Recently Played ── */}
      <div style={{ borderTop: `1px solid ${light.border}`, padding: '0.85rem 0.85rem 1rem', flex: 1 }}>
        <p style={{ margin: '0 0 0.6rem', fontSize: '0.6rem', fontWeight: '800', color: light.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Recently Played
        </p>

        {!user ? (
          <button onClick={onShowAuth}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', background: light.bgSub, border: `1px solid ${light.border}`, borderRadius: '10px', padding: '10px 11px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', transition: 'border-color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = light.border}
          >
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>🔒</span>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '700', color: light.text, marginBottom: '2px' }}>Sign in to see history</div>
              <div style={{ fontSize: '0.6rem', color: light.textMuted, fontWeight: '500', lineHeight: 1.4 }}>Your recently played stories will appear here.</div>
            </div>
          </button>
        ) : history.length === 0 ? (
          <p style={{ margin: 0, fontSize: '0.72rem', color: light.textMuted, lineHeight: 1.5 }}>
            Stories you listen to will appear here.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
            {history.slice(0, 8).map((item, i) => {
              const color = CATEGORY_COLORS[item.category] || '#6366f1';
              return (
                <div key={item.id}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0', borderBottom: i < Math.min(history.length, 8) - 1 ? `1px solid ${light.border}` : 'none' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: '800', color, lineHeight: 1 }}>{initials(item.category)}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: '600', color: light.text, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '1px' }}>
                      {item.headline}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: light.textMuted }}>{timeAgo(item.timestamp)}</div>
                  </div>
                  <button
                    onClick={() => onPlayStory?.(item.category, item.storyIndex)}
                    style={{ width: '22px', height: '22px', borderRadius: '50%', border: `1px solid ${light.border}`, background: light.bg, color: light.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Play size={8} fill="currentColor" style={{ marginLeft: '1px' }} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}
