import React from 'react';
import { Play } from 'lucide-react';
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

function BarChart({ bars }) {
  const max = Math.max(...bars.map(b => b.count), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '36px', marginBottom: '3px' }}>
      {bars.map((b, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
          <div style={{
            width: '100%', borderRadius: '3px 3px 0 0',
            height: `${Math.max(4, (b.count / max) * 32)}px`,
            background: i === bars.length - 1 ? '#6366f1' : `rgba(99,102,241,${0.15 + (b.count / max) * 0.55})`,
            transition: 'height 0.3s ease',
          }} />
          <span style={{ fontSize: '0.5rem', color: light.textMuted, fontWeight: '600' }}>{b.day}</span>
        </div>
      ))}
    </div>
  );
}

export default function RightPane({ stats = {}, history = [], onPlayStory }) {
  const {
    streak = 0, storiesThisWeek = 0, minutesThisWeek = 0,
    storiesThisMonth = 0, topCategory = null, topCategoryPct = 0, bars = [],
  } = stats;

  const topColor = topCategory ? (CATEGORY_COLORS[topCategory] || '#6366f1') : '#6366f1';

  return (
    <nav style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: '200px',
      background: light.bg, borderLeft: `1px solid ${light.border}`,
      display: 'flex', flexDirection: 'column', zIndex: 45,
      overflowY: 'auto',
    }}>

      {/* ── Your Stats ── */}
      <div style={{ padding: '1.4rem 0.85rem 0.9rem' }}>
        <p style={{ margin: '0 0 0.65rem', fontSize: '0.6rem', fontWeight: '800', color: light.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Your Stats
        </p>

        {/* Streak */}
        {streak > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.22)', borderRadius: '9px', padding: '0.4rem 0.55rem', marginBottom: '0.55rem' }}>
            <span style={{ fontSize: '0.9rem', lineHeight: 1 }}>🔥</span>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#c2410c', lineHeight: 1.2 }}>{streak}-day streak</div>
              <div style={{ fontSize: '0.58rem', color: light.textMuted, fontWeight: '500' }}>Keep it up!</div>
            </div>
          </div>
        )}

        {/* Bar chart */}
        {bars.length > 0 && (
          <>
            <div style={{ fontSize: '0.56rem', color: light.textMuted, fontWeight: '600', marginBottom: '3px' }}>This week</div>
            <BarChart bars={bars} />
          </>
        )}

        {/* Stat numbers */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', margin: '0.5rem 0 0.55rem' }}>
          {[
            { val: storiesThisWeek, lbl: 'stories / week' },
            { val: minutesThisWeek > 0 ? `${minutesThisWeek}m` : '0m', lbl: 'listened' },
            { val: storiesThisMonth, lbl: 'this month' },
            { val: streak > 0 ? `${streak}🔥` : '—', lbl: 'day streak' },
          ].map(({ val, lbl }) => (
            <div key={lbl} style={{ background: light.bgSub, borderRadius: '8px', padding: '0.45rem 0.4rem' }}>
              <div style={{ fontSize: '1.05rem', fontWeight: '900', color: light.text, letterSpacing: '-0.03em', lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: '0.56rem', fontWeight: '600', color: light.textMuted, marginTop: '2px' }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Top category */}
        {topCategory && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', background: light.bgSub, borderRadius: '8px', padding: '0.38rem 0.5rem' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: topColor, flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '0.7rem', fontWeight: '700', color: light.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{topCategory}</span>
            <span style={{ fontSize: '0.62rem', color: light.textMuted, flexShrink: 0 }}>{topCategoryPct}%</span>
          </div>
        )}

        {/* Empty state */}
        {storiesThisWeek === 0 && (
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.72rem', color: light.textMuted, lineHeight: 1.5 }}>
            Listen to stories to see your stats here.
          </p>
        )}
      </div>

      {/* ── Recently Played ── */}
      <div style={{ borderTop: `1px solid ${light.border}`, padding: '0.85rem 0.85rem 1rem', flex: 1 }}>
        <p style={{ margin: '0 0 0.6rem', fontSize: '0.6rem', fontWeight: '800', color: light.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Recently Played
        </p>

        {history.length === 0 ? (
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
                  {/* 2-letter badge */}
                  <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.58rem', fontWeight: '800', color, letterSpacing: '-0.01em' }}>{initials(item.category)}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: '600', color: light.text, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: '1px' }}>
                      {item.headline}
                    </div>
                    <div style={{ fontSize: '0.6rem', color: light.textMuted }}>{timeAgo(item.timestamp)}</div>
                  </div>
                  {/* Replay */}
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
