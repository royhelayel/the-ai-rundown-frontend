import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BookOpen, TrendingUp, PlusCircle, LayoutGrid, BarChart2, Play, X } from 'lucide-react';
import { CATEGORY_COLORS } from '../theme';
import { timeAgo } from '../hooks/useListenHistory';

const light = {
  bg:        '#ffffff',
  border:    'rgba(0,0,0,0.08)',
  bgSub:     '#f5f5f7',
  text:      '#0a0a0f',
  textMuted: '#8a8a9a',
};

const FEED_COLOR = '#7c3aed';

function initials(cat) { return (cat || '').slice(0, 2).toUpperCase(); }

function BarChartMini({ bars }) {
  const max = Math.max(...bars.map(b => b.count), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '44px' }}>
      {bars.map((b, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
          <div style={{
            width: '100%', borderRadius: '4px 4px 0 0',
            height: `${Math.max(4, (b.count / max) * 40)}px`,
            background: i === bars.length - 1
              ? 'rgba(255,255,255,0.85)'
              : `rgba(255,255,255,${0.12 + (b.count / max) * 0.45})`,
          }} />
          <span style={{ fontSize: '0.52rem', color: 'rgba(255,255,255,0.35)', fontWeight: '600' }}>{b.day}</span>
        </div>
      ))}
    </div>
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
    streak = 0, storiesThisWeek = 0, minutesThisWeek = 0,
    storiesThisMonth = 0, topCategory = null, topCategoryPct = 0, bars = [],
  } = stats;
  const topColor = topCategory ? (CATEGORY_COLORS[topCategory] || '#6366f1') : '#6366f1';

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
              {/* ── Dark stats card ── */}
              <div style={{ background: 'linear-gradient(135deg, #18182a 0%, #1e1b35 100%)', borderRadius: '18px', padding: '1.1rem 1.1rem 1rem', marginBottom: '1.25rem' }}>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.4)' }}>
                  Your Listening Stats
                </p>

                {/* Streak */}
                {streak > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(251,146,60,0.15)', border: '1px solid rgba(251,146,60,0.3)', borderRadius: '12px', padding: '0.55rem 0.8rem', marginBottom: '0.9rem' }}>
                    <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🔥</span>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#fb923c' }}>{streak}-day streak</div>
                      <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.4)', fontWeight: '500' }}>Listen today to keep it going</div>
                    </div>
                  </div>
                )}

                {/* Numbers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.5rem', marginBottom: '0.9rem' }}>
                  {[
                    { val: storiesThisWeek, lbl: 'this week' },
                    { val: minutesThisWeek > 0 ? `${minutesThisWeek}m` : '0m', lbl: 'listened' },
                    { val: storiesThisMonth, lbl: 'this month' },
                    { val: streak > 0 ? streak : '—', lbl: 'day streak' },
                  ].map(({ val, lbl }) => (
                    <div key={lbl} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: '11px', padding: '0.6rem 0.4rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: '900', color: '#fff', letterSpacing: '-0.03em', lineHeight: 1 }}>{val}</div>
                      <div style={{ fontSize: '0.56rem', fontWeight: '600', color: 'rgba(255,255,255,0.4)', marginTop: '3px' }}>{lbl}</div>
                    </div>
                  ))}
                </div>

                {/* Bar chart */}
                {bars.length > 0 && (
                  <>
                    <p style={{ margin: '0 0 5px', fontSize: '0.58rem', color: 'rgba(255,255,255,0.35)', fontWeight: '600' }}>Listening this week</p>
                    <BarChartMini bars={bars} />
                  </>
                )}

                {/* Top category */}
                {topCategory && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.07)', borderRadius: '10px', padding: '0.5rem 0.65rem', marginTop: '0.75rem' }}>
                    <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)', fontWeight: '600', marginRight: 'auto' }}>Top category</span>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: topColor, flexShrink: 0 }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#fff' }}>{topCategory}</span>
                    <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.45)' }}>{topCategoryPct}%</span>
                  </div>
                )}

                {storiesThisWeek === 0 && (
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                    Listen to stories to start tracking your stats.
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
                        {/* 2-letter badge */}
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
