import React from 'react';
import { Play, CheckCircle2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
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

export default function RightPane({ stats = {}, history = [], onPlayStory, user = null, onShowAuth, selectedProgressDay = null, onSelectProgressDay, onGoToCategory }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const {
    todayProgress = {},
    allCaughtUp = false,
    weeklyGrid = [],
    perfectStreak = 0,
    categoryBadges = {},
    morningAllDone = false,
    eveningAllDone = false,
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
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '300px',
      background: light.bg, borderLeft: `1px solid ${light.border}`,
      display: 'flex', flexDirection: 'column', zIndex: 45,
      overflowY: 'auto',
    }}>

      {/* ── Reading Challenge ── */}
      {!user && (
        <div style={{ padding: '1.4rem 0.85rem 0.9rem' }}>
          <p style={{ margin: '0 0 0.65rem', fontSize: '0.6rem', fontWeight: '800', color: light.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Reading Challenge
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
            Reading Challenge
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

        {/* ── Reading Challenge banner (today only) ── */}
        {!selectedProgressDay && (() => {
          const bothDone = morningAllDone && eveningAllDone;
          const morningOnly = morningAllDone && !eveningAllDone;
          const eveningOnly = !morningAllDone && eveningAllDone;
          if (bothDone) return (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.22)', borderRadius: '9px', padding: '0.5rem 0.6rem', marginBottom: '0.65rem' }}>
              <span style={{ fontSize: '1rem', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>✅</span>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: '800', color: '#15803d', lineHeight: 1.2, marginBottom: '2px' }}>All Caught Up!</div>
                <div style={{ fontSize: '0.57rem', color: light.textMuted, fontWeight: '500', lineHeight: 1.4 }}>You've caught up on all stories!</div>
              </div>
            </div>
          );
          if (morningOnly) return (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.22)', borderRadius: '9px', padding: '0.5rem 0.6rem', marginBottom: '0.65rem' }}>
              <span style={{ fontSize: '1rem', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>🔥</span>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: '800', color: '#c2410c', lineHeight: 1.2, marginBottom: '2px' }}>Morning Complete!</div>
                <div style={{ fontSize: '0.57rem', color: light.textMuted, fontWeight: '500', lineHeight: 1.4 }}>Catch up on Evening stories.</div>
              </div>
            </div>
          );
          if (eveningOnly) return (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.22)', borderRadius: '9px', padding: '0.5rem 0.6rem', marginBottom: '0.65rem' }}>
              <span style={{ fontSize: '1rem', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>🔥</span>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: '800', color: '#c2410c', lineHeight: 1.2, marginBottom: '2px' }}>Evening Complete!</div>
                <div style={{ fontSize: '0.57rem', color: light.textMuted, fontWeight: '500', lineHeight: 1.4 }}>Catch up on Morning stories.</div>
              </div>
            </div>
          );
          return (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', background: light.bgSub, border: `1px solid ${light.border}`, borderRadius: '9px', padding: '0.5rem 0.6rem', marginBottom: '0.65rem' }}>
              <span style={{ fontSize: '1rem', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>📖</span>
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: '800', color: light.text, lineHeight: 1.2, marginBottom: '2px' }}>Start Today's Challenge</div>
                <div style={{ fontSize: '0.57rem', color: light.textMuted, fontWeight: '500', lineHeight: 1.4 }}>Catch up on your daily stories.</div>
              </div>
            </div>
          );
        })()}

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

        {/* Two-row weekly grid — shared day header + Morning + Evening */}
        {weeklyGrid.length > 0 && (
          <>
            {/* Day header — the only row that carries the selection indicator */}
            <div style={{ display: 'flex', gap: '3px', marginBottom: '3px' }}>
              {weeklyGrid.map(day => {
                const isSelected = selectedProgressDay ? day.key === selectedProgressDay : day.isToday;
                return (
                  <button key={day.key} title={day.key}
                    onClick={() => onSelectProgressDay?.(isSelected && !day.isToday ? null : day.key)}
                    style={{ flex: 1, height: '18px', borderRadius: '4px', background: isSelected ? '#6366f1' : 'transparent', border: isSelected ? '1px solid #6366f1' : '1px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, outline: 'none', transition: 'background 0.12s' }}
                  >
                    <span style={{ fontSize: '0.46rem', fontWeight: '800', color: isSelected ? '#fff' : light.textMuted }}>{day.day}</span>
                  </button>
                );
              })}
            </div>
            {/* Morning row — status colours only, no selection outline */}
            <div style={{ fontSize: '0.48rem', color: light.textMuted, fontWeight: '700', marginBottom: '2px', marginTop: '4px' }}>☀️ Morning</div>
            <div style={{ display: 'flex', gap: '3px', marginBottom: '5px' }}>
              {weeklyGrid.map(day => {
                const bg = day.morningStatus === 2 ? '#16a34a' : day.morningStatus === 1 ? '#d97706' : light.bgSub;
                return (
                  <button key={day.key} title={day.key}
                    onClick={() => onSelectProgressDay?.(selectedProgressDay === day.key && !day.isToday ? null : day.key)}
                    style={{ flex: 1, height: '22px', borderRadius: '4px', background: bg, border: `1px solid ${light.border}`, cursor: 'pointer', padding: 0, outline: 'none' }}
                  />
                );
              })}
            </div>
            {/* Evening row */}
            <div style={{ fontSize: '0.48rem', color: light.textMuted, fontWeight: '700', marginBottom: '2px' }}>🌙 Evening</div>
            <div style={{ display: 'flex', gap: '3px', marginBottom: '4px' }}>
              {weeklyGrid.map(day => {
                const bg = day.eveningStatus === 2 ? '#16a34a' : day.eveningStatus === 1 ? '#d97706' : light.bgSub;
                return (
                  <button key={day.key} title={day.key}
                    onClick={() => onSelectProgressDay?.(selectedProgressDay === day.key && !day.isToday ? null : day.key)}
                    style={{ flex: 1, height: '22px', borderRadius: '4px', background: bg, border: `1px solid ${light.border}`, cursor: 'pointer', padding: 0, outline: 'none' }}
                  />
                );
              })}
            </div>
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
                <button
                  key={cat}
                  onClick={() => {
                    onGoToCategory?.(cat);
                    navigate(`/category/${encodeURIComponent(cat)}`, { state: { from: pathname } });
                  }}
                  style={{ background: light.bgSub, borderRadius: '8px', padding: '0.38rem 0.5rem', border: '1px solid transparent', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: 'inherit', transition: 'border-color 0.12s, background 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}40`; e.currentTarget.style.background = `${color}0a`; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = light.bgSub; }}
                >
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
                </button>
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
