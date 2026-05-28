import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, TrendingUp, PlusCircle, LayoutGrid, BarChart2, Play, X, CheckCircle2 } from 'lucide-react';
import { CATEGORY_COLORS } from '../theme';
import { timeAgo, BADGE_TIERS } from '../hooks/useListenHistory';

const light = {
  bg:        '#ffffff',
  border:    'rgba(0,0,0,0.08)',
  bgSub:     '#f5f5f7',
  text:      '#0a0a0f',
  textMuted: '#8a8a9a',
};

const FEED_COLOR = '#7c3aed';

function initials(cat) { return (cat || '').slice(0, 2).toUpperCase(); }

// ── Weekly grid ──────────────────────────────────────────────────────────────
function WeeklyGrid({ weeklyGrid = [] }) {
  return (
    <div style={{ display: 'flex', gap: '5px', marginBottom: '8px' }}>
      {weeklyGrid.map(day => {
        const bg = day.status === 2 ? '#16a34a' : day.status === 1 ? '#d97706' : 'rgba(255,255,255,0.1)';
        const border = day.isToday ? '2px solid rgba(255,255,255,0.7)' : '1px solid rgba(255,255,255,0.12)';
        return (
          <div key={day.key} title={day.key} style={{
            flex: 1, height: '36px', borderRadius: '7px',
            background: bg, border,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '0.58rem', fontWeight: '700', color: day.status > 0 ? '#fff' : 'rgba(255,255,255,0.35)' }}>
              {day.day}
            </span>
          </div>
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
      background: `${tier.color}28`, border: `1px solid ${tier.color}55`,
      borderRadius: '5px', padding: '2px 6px',
      fontSize: '0.58rem', fontWeight: '800', color: tier.color,
    }}>
      {tier.label} · {streak}d
    </span>
  );
}

export default function BottomNav({
  userFeeds = [], categories = [], briefingData = {}, onSelectCategory,
  stats = {}, history = [], onPlayStory,
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [showFeedsSheet, setShowFeedsSheet] = useState(false);
  const [showStatsSheet, setShowStatsSheet] = useState(false);

  const hasFeedActive = userFeeds.some(f => pathname === `/feed/${f.id}`);
  const closeAll = () => { setShowFeedsSheet(false); setShowStatsSheet(false); };

  const {
    todayProgress = {},
    allCaughtUp = false,
    weeklyGrid = [],
    perfectStreak = 0,
    categoryBadges = {},
  } = stats;

  const cats = Object.keys(todayProgress);

  return (
    <>
      {/* ── My Feeds sheet ── */}
      {showFeedsSheet && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 200 }} onClick={closeAll} />
          <div style={{
            position: 'fixed', left: 0, right: 0, bottom: '56px', zIndex: 201,
            background: light.bg, borderTop: `1px solid ${light.border}`,
            borderRadius: '16px 16px 0 0', padding: '1rem 1.25rem 0.75rem',
            boxShadow: '0 -4px 24px rgba(0,0,0,0.12)', maxHeight: '55vh', overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', color: FEED_COLOR, textTransform: 'uppercase', letterSpacing: '0.08em' }}>My Feeds</span>
              <button onClick={closeAll} style={{ border: 'none', background: 'none', cursor: 'pointer', color: light.textMuted, padding: '2px' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {userFeeds.map(feed => {
                const active = pathname === `/feed/${feed.id}`;
                return (
                  <button key={feed.id}
                    onClick={() => { navigate(`/feed/${feed.id}`); closeAll(); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 0.85rem', borderRadius: '10px', border: 'none', textAlign: 'left', background: active ? `${FEED_COLOR}10` : 'transparent', cursor: 'pointer' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: FEED_COLOR, flexShrink: 0, opacity: active ? 1 : 0.5 }} />
                    <span style={{ fontSize: '0.92rem', fontWeight: active ? '700' : '500', color: active ? light.text : light.textMuted }}>{feed.name}</span>
                  </button>
                );
              })}
              <button
                onClick={() => { navigate('/customize'); closeAll(); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 0.85rem', borderRadius: '10px', border: 'none', textAlign: 'left', background: pathname === '/customize' ? `rgba(99,102,241,0.08)` : 'transparent', cursor: 'pointer', width: '100%', marginTop: userFeeds.length > 0 ? '0.25rem' : 0 }}>
                <PlusCircle size={15} color="#6366f1" strokeWidth={2} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: '0.92rem', fontWeight: pathname === '/customize' ? '700' : '500', color: pathname === '/customize' ? '#6366f1' : light.textMuted }}>Create Feed</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Stats sheet ── */}
      {showStatsSheet && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 200 }} onClick={closeAll} />
          <div style={{
            position: 'fixed', left: 0, right: 0, bottom: '56px', zIndex: 201,
            background: light.bg, borderTop: `1px solid ${light.border}`,
            borderRadius: '20px 20px 0 0',
            boxShadow: '0 -6px 32px rgba(0,0,0,0.15)',
            maxHeight: '82vh', overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}>
            {/* Handle + title */}
            <div style={{ padding: '0.65rem 1.25rem 0', position: 'sticky', top: 0, background: light.bg, zIndex: 1 }}>
              <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'rgba(0,0,0,0.12)', margin: '0 auto 0.8rem' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: '900', color: light.text, letterSpacing: '-0.025em' }}>Stats</span>
                <button onClick={closeAll} style={{ border: 'none', background: 'none', cursor: 'pointer', color: light.textMuted, padding: '2px' }}>
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ padding: '0 1.25rem 1.5rem' }}>
              {/* ── Dark progress card ── */}
              <div style={{ background: 'linear-gradient(135deg, #18182a 0%, #1e1b35 100%)', borderRadius: '18px', padding: '1.1rem 1.1rem 1rem', marginBottom: '1.25rem' }}>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)' }}>
                  Today's Progress
                </p>

                {/* Caught-up banner */}
                {allCaughtUp && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(22,163,74,0.2)', border: '1px solid rgba(22,163,74,0.4)', borderRadius: '12px', padding: '0.55rem 0.8rem', marginBottom: '0.9rem' }}>
                    <CheckCircle2 size={16} color="#4ade80" strokeWidth={2.5} />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#4ade80' }}>All Caught Up! 🎉</div>
                      <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>Perfect day — keep the streak going</div>
                    </div>
                  </div>
                )}

                {/* Perfect streak */}
                {perfectStreak > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: '12px', padding: '0.55rem 0.8rem', marginBottom: '0.9rem' }}>
                    <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🔥</span>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#fb923c' }}>{perfectStreak}-day perfect streak</div>
                      <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>Catch up on all categories today</div>
                    </div>
                  </div>
                )}

                {/* Weekly grid */}
                {weeklyGrid.length > 0 && (
                  <>
                    <p style={{ margin: '0 0 6px', fontSize: '0.58rem', color: 'rgba(255,255,255,0.35)', fontWeight: '600' }}>This week</p>
                    <WeeklyGrid weeklyGrid={weeklyGrid} />
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '0.9rem' }}>
                      {[{color:'#16a34a',label:'All done'},{color:'#d97706',label:'Partial'},{color:'rgba(255,255,255,0.15)',label:'None'}].map(l => (
                        <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: l.color }} />
                          <span style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.35)', fontWeight: '600' }}>{l.label}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Per-category rows */}
                {cats.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {cats.map(cat => {
                      const p = todayProgress[cat] || {};
                      const color = CATEGORY_COLORS[cat] || '#6366f1';
                      const badge = categoryBadges[cat];
                      return (
                        <div key={cat} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '10px', padding: '0.55rem 0.7rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: p.total > 0 ? '5px' : 0 }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '7px', background: `${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <span style={{ fontSize: '0.58rem', fontWeight: '800', color }}>{initials(cat)}</span>
                            </div>
                            <span style={{ flex: 1, fontSize: '0.8rem', fontWeight: '600', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat}</span>
                            {p.done ? (
                              <CheckCircle2 size={14} color="#4ade80" strokeWidth={2.5} />
                            ) : p.total > 0 ? (
                              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)', fontWeight: '600', flexShrink: 0 }}>{p.listened}/{p.total}</span>
                            ) : null}
                          </div>
                          {p.total > 0 && (
                            <div style={{ height: '3px', borderRadius: '99px', background: 'rgba(255,255,255,0.12)', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${p.pct * 100}%`, background: p.done ? '#4ade80' : color, borderRadius: '99px', transition: 'width 0.4s ease' }} />
                            </div>
                          )}
                          {badge?.tier && (
                            <div style={{ marginTop: '4px' }}>
                              <BadgeChip tier={badge.tier} streak={badge.streak} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                    Add categories to a feed to track your progress here.
                  </p>
                )}
              </div>

              {/* ── Recently Played ── */}
              <p style={{ margin: '0 0 0.7rem', fontSize: '0.65rem', fontWeight: '800', color: light.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Recently Played
              </p>

              {history.length === 0 ? (
                <p style={{ margin: 0, fontSize: '0.85rem', color: light.textMuted, lineHeight: 1.55 }}>
                  Stories you listen to will appear here.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {history.map((item, i) => {
                    const color = CATEGORY_COLORS[item.category] || '#6366f1';
                    return (
                      <div key={item.id}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.72rem 0', borderBottom: i < history.length - 1 ? `1px solid ${light.border}` : 'none' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: '800', color, letterSpacing: '-0.01em' }}>{initials(item.category)}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: '700', color: light.text, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '2px' }}>
                            {item.headline}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: light.textMuted }}>{item.category} · {timeAgo(item.timestamp)}</div>
                        </div>
                        <button
                          onClick={() => { onPlayStory?.(item.category, item.storyIndex); closeAll(); }}
                          style={{ width: '32px', height: '32px', borderRadius: '50%', border: `1px solid rgba(0,0,0,0.1)`, background: light.bgSub, color: light.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Play size={10} fill="currentColor" style={{ marginLeft: '1px' }} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Bottom bar ── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 45,
        background: `${light.bg}f2`, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${light.border}`,
        display: 'flex', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        boxShadow: '0 -1px 12px rgba(0,0,0,0.05)',
      }}>
        {/* My Feeds tab */}
        <button
          onClick={() => { setShowStatsSheet(false); setShowFeedsSheet(v => !v); }}
          style={{ flex: 1, padding: '0.55rem 0.25rem 0.6rem', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
          <LayoutGrid size={21} strokeWidth={hasFeedActive || showFeedsSheet ? 2.5 : 1.7}
            color={hasFeedActive || showFeedsSheet ? light.text : light.textMuted} />
          <span style={{ fontSize: '0.65rem', fontWeight: hasFeedActive || showFeedsSheet ? '800' : '500', color: hasFeedActive || showFeedsSheet ? light.text : light.textMuted }}>
            My Feed
          </span>
        </button>

        {/* All Feed + Popular tabs */}
        {[
          { path: '/', label: 'All Feed', Icon: BookOpen, matchFn: p => p === '/' || p.startsWith('/category/') },
          { path: '/popular', label: 'Popular', Icon: TrendingUp, matchFn: p => p === '/popular' },
        ].map(({ path, label, Icon, matchFn }) => {
          const active = matchFn(pathname);
          return (
            <button key={path} onClick={() => { closeAll(); navigate(path); }}
              style={{ flex: 1, padding: '0.55rem 0.25rem 0.6rem', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
              <Icon size={21} strokeWidth={active ? 2.5 : 1.7} color={active ? light.text : light.textMuted} />
              <span style={{ fontSize: '0.65rem', fontWeight: active ? '800' : '500', color: active ? light.text : light.textMuted }}>{label}</span>
            </button>
          );
        })}

        {/* Stats tab */}
        <button
          onClick={() => { setShowFeedsSheet(false); setShowStatsSheet(v => !v); }}
          style={{ flex: 1, padding: '0.55rem 0.25rem 0.6rem', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
          <BarChart2 size={21} strokeWidth={showStatsSheet ? 2.5 : 1.7}
            color={showStatsSheet ? light.text : light.textMuted} />
          <span style={{ fontSize: '0.65rem', fontWeight: showStatsSheet ? '800' : '500', color: showStatsSheet ? light.text : light.textMuted }}>
            Stats
          </span>
        </button>
      </nav>
    </>
  );
}
