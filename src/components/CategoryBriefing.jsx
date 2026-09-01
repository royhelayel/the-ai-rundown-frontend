import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Play, FileText, ChevronLeft, ChevronRight, User, Calendar } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_IMAGES, CATEGORY_SHORT } from '../theme';
import CategoryIcon from './CategoryIcon';
import BottomNav from './BottomNav';

// Lift a category colour toward white so it stays legible on the dark ground — the same
// helper Swipe and the player use, so all three tint identically.
function tintForDark(hex, amount = 0.45) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return '#ffffff';
  const n = parseInt(m[1], 16);
  const mix = (ch) => Math.round(ch + (255 - ch) * amount);
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}

function formatHeaderDate(dateStr) {
  if (!dateStr) return '';
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date  = new Date(y, m - 1, d);
    const today = new Date();
    if (y === today.getFullYear() && m === today.getMonth() + 1 && d === today.getDate()) return 'Today';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

/**
 * CategoryBriefing — the category-level "summary of the stories" view.
 * Visually differentiated from a story (gradient header chip, "Briefing" label,
 * single flowing summary) so users understand it's an overview, not one article.
 */
export default function CategoryBriefing({
  category,
  briefing,
  feedName,
  cats = [],
  onSelectCat,
  onListen,
  onReadStories,
  onClose,
  asPage = false,
  onExitToFeed,
  onExitToStories,
  onBack,
  onSwitchTab,
  activeTabPath = '/',
  user,
  onShowAuth,
  selectedDay,
  availableDays = [],
  onSelectDay,
  challengeStats,
}) {
  const navigate = useNavigate();
  const color = CATEGORY_COLORS[category] || '#6366f1';
  const image = CATEGORY_IMAGES[category];
  // Existing rows carry a markdown title the prompt asked the model not to write — the
  // backend only stripped it from period recaps, so it was rendering literally as
  // "# Technology Briefing" at the top of the prose. Dropped here as well as at generation,
  // because the rows already in the database will not regenerate.
  const paragraphs = (briefing || '')
    .split(/\n{2,}/).map(p => p.trim())
    .filter(p => p && !/^#{1,6}\s/.test(p))
    .map(p => p.replace(/^\s*[-*•]\s+/, ''));

  const idx = cats.indexOf(category);
  const total = cats.length;
  const goPrev = () => { if (idx > 0) onSelectCat?.(cats[idx - 1]); };
  const goNext = () => { if (idx >= 0 && idx < total - 1) onSelectCat?.(cats[idx + 1]); };

  const [dayPickerOpen, setDayPickerOpen] = useState(false);
  const dayPickerRef = useRef(null);
  useEffect(() => {
    if (!dayPickerOpen) return;
    const handler = (e) => { if (dayPickerRef.current && !dayPickerRef.current.contains(e.target)) setDayPickerOpen(false); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [dayPickerOpen]);
  const effectiveDay = selectedDay || new Date().toISOString().split('T')[0];
  const canPickDay = availableDays.length > 0;

  // Swipe between sibling category briefings (handlers attached to the hero)
  const touchStartX = useRef(null);
  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx < -50) goNext(); else if (dx > 50) goPrev();
    touchStartX.current = null;
  };

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%',
      // The app's ground, not white. This was the one screen still in light mode, so opening
      // a recap from any of the three dark modes flashed the whole display from near-black
      // to white.
      background: `radial-gradient(ellipse at 50% 0%, ${color}1f 0%, transparent 62%), #0a0a14`, color: '#fff' }}>
      {asPage && (
        <div style={{ flexShrink: 0 }}>
          {/* ── Identity strip: avatar · feed name · Today ── */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', padding: '14px 16px 12px', gap: 10 }}>
            <button onClick={() => navigate('/settings', { state: { from: window.location.pathname } })} style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.10)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} aria-label="Settings">
              {user
                ? <span style={{ fontSize: '0.65rem', fontWeight: 800 }}>{(user.display_name || user.email || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}</span>
                : <User size={14} />}
            </button>
            <div style={{ position: 'absolute', left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
              <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}>{feedName || 'All News'}</p>
            </div>
            <div style={{ flex: 1 }} />
            <div style={{ position: 'relative' }} ref={dayPickerRef}>
              <button onClick={() => canPickDay && setDayPickerOpen(o => !o)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 999, background: 'rgba(255,255,255,0.08)', border: 'none', cursor: canPickDay ? 'pointer' : 'default' }}>
                <Calendar size={13} color="rgba(255,255,255,0.6)" />
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)' }}>{formatHeaderDate(effectiveDay)}</span>
              </button>
              {dayPickerOpen && canPickDay && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 20, width: 160, background: '#fff', borderRadius: 14, boxShadow: '0 12px 36px rgba(0,0,0,0.16)', border: '1px solid rgba(0,0,0,0.08)', padding: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {availableDays.map(day => {
                    const isActive = day.fullDate === selectedDay;
                    return (
                      <button key={day.fullDate} onClick={() => { onSelectDay?.(day.fullDate); setDayPickerOpen(false); }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: 9, border: 'none', background: isActive ? 'rgba(124,58,237,0.1)' : 'transparent', color: isActive ? '#7c3aed' : '#374151', fontSize: '0.78rem', fontWeight: isActive ? 800 : 500, cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                        {formatHeaderDate(day.fullDate)}
                        {isActive && <span style={{ fontSize: '0.6rem', color: '#7c3aed' }}>✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Progress pills, matching Scroll and Swipe mode — one per category recap,
                 filled through the one being read. ── */}
          <div style={{ padding: '0 16px 14px' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {(total > 0 ? cats : [category]).map((c, i) => (
                <button key={c} onClick={() => c !== category && onSelectCat?.(c)} aria-label={CATEGORY_SHORT[c] || c}
                  style={{ flex: 1, height: 3, border: 'none', borderRadius: 99, padding: 0, cursor: c === category ? 'default' : 'pointer', background: i <= idx ? '#fff' : 'rgba(255,255,255,0.22)', transition: 'background 0.2s' }} />
              ))}
            </div>
          </div>

          {/* ── Category strip — jump to any sibling briefing ── */}
          {total > 1 && (
            <div style={{ flexShrink: 0, display: 'flex', gap: 8, padding: '0 16px 22px', overflowX: 'auto', scrollbarWidth: 'none' }}>
              <style>{`.cb-strip::-webkit-scrollbar{display:none}`}</style>
              <div className="cb-strip" style={{ display: 'flex', gap: 8 }}>
                {cats.map(c => {
                  const active = c === category;
                  return (
                    <button key={c} onClick={() => onSelectCat?.(c)} style={{
                      display: 'flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 8, border: 'none',
                      background: active ? '#0a0a0f' : 'rgba(0,0,0,0.06)', color: active ? '#fff' : '#6b7280',
                      fontSize: '0.76rem', fontWeight: active ? 800 : 600, whiteSpace: 'nowrap', flexShrink: 0, cursor: active ? 'default' : 'pointer',
                    }}>
                      <CategoryIcon category={c} size={13} color={active ? '#fff' : '#6b7280'} />
                      {CATEGORY_SHORT[c] || c}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Single way out — returns to the exact mode the recap was opened from ── */}
          <div style={{ display: 'flex', justifyContent: 'center', padding: '0 16px 22px' }}>
            <button onClick={() => onBack?.()} style={{ padding: '2px 8px', border: 'none', background: 'transparent', color: '#9ca3af', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
              Back to stories
            </button>
          </div>
        </div>
      )}

      {/* ── Hero — sheet mode only; the page shows a plain title in the body instead, which
             frees the height the docked Play recap bar needs. ── */}
      {!asPage && (
      <div style={{ position: 'relative', height: 196, flexShrink: 0 }} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: image ? `url(${image})` : 'none',
          backgroundColor: image ? 'transparent' : color,
          backgroundSize: 'cover', backgroundPosition: 'center',
        }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(165deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.85) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: color, opacity: 0.16 }} />

        {/* Close — sheet mode only; the toggle handles exiting the full page */}
        {!asPage && (
          <button onClick={onClose} style={{ position: 'absolute', top: 14, left: 14, width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.35)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
            <ChevronDown size={20} />
          </button>
        )}

        {/* Breadcrumb + position — sheet mode only; asPage shows this in the identity strip above */}
        {!asPage && (
          <div style={{ position: 'absolute', top: 18, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
            <p style={{ margin: 0, fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              {feedName || 'All News'} · Recap{total > 1 && idx >= 0 ? ` · ${idx + 1} of ${total}` : ''}
            </p>
          </div>
        )}

        {/* Prev / Next chevrons */}
        {total > 1 && (
          <>
            {idx > 0 && (
              <button onClick={goPrev} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
                <ChevronLeft size={20} />
              </button>
            )}
            {idx < total - 1 && (
              <button onClick={goNext} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 34, height: 34, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
                <ChevronRight size={20} />
              </button>
            )}
          </>
        )}

        {/* Title block pinned bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 1.25rem 1rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: color, marginBottom: 8 }}>
            <FileText size={12} color="#fff" />
            <span style={{ fontSize: '0.64rem', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category Recap</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CategoryIcon category={category} size={20} color="#fff" />
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.025em', lineHeight: 1.15 }}>{category}</h2>
          </div>
        </div>
      </div>
      )}

      {/* ── Category strip — sheet mode only; asPage shows this in the identity block above ── */}
      {!asPage && total > 1 && (
        <div style={{ flexShrink: 0, display: 'flex', gap: 6, padding: '10px 12px', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.10)', scrollbarWidth: 'none' }}>
          <style>{`.cb-strip::-webkit-scrollbar{display:none}`}</style>
          <div className="cb-strip" style={{ display: 'flex', gap: 6 }}>
            {cats.map(c => {
              const cc = CATEGORY_COLORS[c] || '#6366f1';
              const active = c === category;
              return (
                <button key={c} onClick={() => onSelectCat?.(c)} style={{
                  display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8,
                  fontSize: '0.78rem', fontWeight: active ? 800 : 600, whiteSpace: 'nowrap', cursor: 'pointer', flexShrink: 0,
                  background: active ? 'rgba(255,255,255,0.20)' : 'transparent', border: 'none',
                  color: active ? tintForDark(cc) : 'rgba(255,255,255,0.55)',
                }}>
                  <CategoryIcon category={c} size={14} color={active ? tintForDark(cc) : 'rgba(255,255,255,0.55)'} />
                  {CATEGORY_SHORT[c] || c}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: asPage ? '1.25rem 1.25rem 1rem' : '1.25rem 1.25rem 7.5rem' }}>
        {asPage && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <CategoryIcon category={category} size={19} color={tintForDark(color)} />
            <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.025em', lineHeight: 1.15 }}>{category}</h2>
          </div>
        )}
        <p style={{ margin: '0 0 1rem', fontSize: '0.72rem', fontWeight: 700, color: tintForDark(color), textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          A 60-second recap of the top stories
        </p>

        {paragraphs.length > 0 ? (
          paragraphs.map((p, i) => (
            <p key={i} style={{ margin: '0 0 1rem', fontSize: '0.95rem', lineHeight: 1.8, color: 'rgba(255,255,255,0.78)' }}>{p}</p>
          ))
        ) : (
          <div style={{ padding: '2.5rem 0', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
            <FileText size={32} color="rgba(255,255,255,0.3)" style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, fontSize: '0.95rem' }}>No briefing available for this category yet.</p>
            <p style={{ margin: '6px 0 0', fontSize: '0.8rem' }}>Briefings are generated with each day's news.</p>
          </div>
        )}

      </div>

      {/* ── Docked Play recap — always visible above the nav, soft-tinted rather than the
             gradient so it reads as available without dominating the page. ── */}
      {asPage && paragraphs.length > 0 && (
        <div style={{ flexShrink: 0, marginTop: -26, paddingTop: 26, background: 'linear-gradient(to top, #0a0a14 55%, rgba(10,10,20,0))' }}>
          {/* Opaque strip behind the button — the tint is translucent, so text would
              otherwise read straight through it. */}
          <div style={{ background: '#0a0a14', padding: '0 1.25rem 0.7rem' }}>
            <button onClick={onListen} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', padding: '12px', borderRadius: 12, border: 'none', background: `${color}18`, color, fontSize: '0.9rem', fontWeight: 800, cursor: 'pointer' }}>
              <Play size={16} fill={color} color={color} />
              Play recap
            </button>
          </div>
        </div>
      )}

      {/* ── Sticky Listen bar — sheet mode only ── */}
      {!asPage && paragraphs.length > 0 && (
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '1rem 1.25rem calc(1rem + env(safe-area-inset-bottom,0px))', background: 'linear-gradient(to top, #0a0a14 70%, rgba(10,10,20,0))' }}>
          <button onClick={onListen} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, width: '100%', padding: '15px', borderRadius: 999, border: 'none', background: color, color: '#fff', fontSize: '1rem', fontWeight: 800, cursor: 'pointer' }}>
            <Play size={18} fill="#fff" color="#fff" />
            Play recap
          </button>
        </div>
      )}

      {/* ── Light bottom nav — page mode only, matches Swipe mode ── */}
      {asPage && (
        <BottomNav theme="dark" fixed={false} mode="scroll" challengeStats={challengeStats} user={user} onShowAuth={onShowAuth} />
      )}
    </div>
  );
}
