import { LogOut, User, Loader, ChevronLeft, ChevronRight, History, SunMoon } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function SettingsPage({
  user, setUser, openOnboarding, setShowAuth, setAuthMode, setSignOutLoading, signOutLoading,
  setRestoreArmed, setCustomCategories, setCustomCategoryDescriptions, setFontSize, fontSize,
  setFeedCategories, feedCategories, newsLanguage, theme, setTheme, setFollowing,
  setCircleSaves, setCirclePopular, navigate, location, myNewsCategories, MY_FEED_COLOR,
  saveFeedCategories, saveNewsLanguage, preferredReadMode,
}) {
  return (
    <main style={{ background: 'var(--paper)', minHeight: '100dvh', maxWidth: '680px', margin: '0 auto', padding: '0 0 4rem' }}>
      {/* Sticky header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--paper)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem' }}>
        <button onClick={() => {
          // Prefer real history back: it restores the full state (asPage, playlist,
          // returnTo…) of whatever screen we came from. navigate(back) only had the
          // path string, which meant returning from Swipe mode arrived with no state,
          // and StoryReader — reading state.asPage to decide page vs. sheet — rendered
          // the Summary sheet instead of the Swipe page.
          if (location.state?.from) { navigate(-1); return; }
          // No `from` meant "opened from outside the app", so this fell back to '/' —
          // which is Scroll. But most in-app routes here omitted `from` too, so leaving
          // Settings from Listen or Swipe always landed on Scroll. They all carry it now,
          // and the remaining fallback — a bookmark, a reload, a shared link — goes to
          // the remembered read mode rather than assuming one.
          const m = preferredReadMode();
          navigate(m === 'audio' ? '/listen' : '/');
        }} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.85rem', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '999px', color: 'var(--sub)', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', flexShrink: 0 }}>
          <ChevronLeft size={16} /> Back
        </button>
        <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '800', color: 'var(--ink)', flex: 1 }}>Settings</h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem 1rem 0' }}>
        <div style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--line)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.1rem' }}>
            <User size={18} color="#8a8a9a" />
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--ink)' }}>Account</h3>
          </div>
          {user ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {/* Avatar + email row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: user.avatar_color || '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: '800', color: '#fff', flexShrink: 0 }}>
                  {(user.display_name || user.email || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.display_name || user.email}</div>
                  {user.username && <div style={{ fontSize: '0.75rem', color: 'var(--sub)', marginTop: '1px' }}>@{user.username}</div>}
                </div>
              </div>
              {/* Reading history: the summaries you read and the ones you marked Interesting —
                  your own record, not a public profile (Roy, 2026-10-16). */}
              <button onClick={() => navigate('/history', { state: { from: location.pathname } })}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: 44, padding: '0.5rem 1rem', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '14px', color: 'var(--ink)', cursor: 'pointer', fontWeight: '700', fontSize: '0.88rem' }}>
                <History size={16} />
                <span style={{ flex: 1, textAlign: 'left' }}>Reading history</span>
                <ChevronRight size={15} color="var(--sub)" />
              </button>
              {/* Sign out */}
              <button onClick={async () => {
                setSignOutLoading(true);
                await supabase.auth.signOut();
                setUser(null); setFeedCategories([]); setCustomCategories([]);
                setCustomCategoryDescriptions({}); setFollowing([]); setCircleSaves([]); setCirclePopular([]);
                localStorage.removeItem('newsdigest_user');
                setSignOutLoading(false);
                navigate('/');
              }} disabled={signOutLoading}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '999px', color: '#dc2626', cursor: signOutLoading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.83rem', width: '100%', opacity: signOutLoading ? 0.7 : 1 }}>
                {signOutLoading
                  ? <><Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> Signing Out…</>
                  : <><LogOut size={14} /> Sign Out</>}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <button onClick={() => { setShowAuth(true); setAuthMode('signin'); }} style={{ flex: 1, minWidth: '120px', padding: '0.6rem 1.2rem', background: 'var(--play-bg)', color: 'var(--play-fg)', border: 'none', borderRadius: '14px', cursor: 'pointer', fontWeight: '700', fontSize: '0.88rem' }}>Sign In</button>
              <button onClick={() => { setShowAuth(true); setAuthMode('signup'); }} style={{ flex: 1, minWidth: '120px', padding: '0.6rem 1.2rem', background: 'none', border: '1.5px solid rgba(0,0,0,0.08)', color: 'var(--ink)', borderRadius: '999px', cursor: 'pointer', fontWeight: '600', fontSize: '0.88rem' }}>Create Account</button>
            </div>
          )}
        </div>
        <div style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--line)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🌐</span>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--ink)' }}>News Language</h3>
            </div>
            <div style={{ display: 'flex', background: 'var(--paper)', borderRadius: '999px', padding: '3px', gap: '2px' }}>
              {[['en', 'English'], ['ar', 'عربي']].map(([val, label]) => (
                <button key={val} onClick={() => saveNewsLanguage(val)} style={{ padding: '0.3rem 0.9rem', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', background: newsLanguage === val ? 'var(--ink)' : 'transparent', color: newsLanguage === val ? 'var(--paper)' : 'var(--sub)', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--line)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🔤</span>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--ink)' }}>Font Size</h3>
            </div>
            <div style={{ display: 'flex', background: 'var(--paper)', borderRadius: '999px', padding: '3px', gap: '2px' }}>
              {[['normal', 'Normal'], ['large', 'Large']].map(([val, label]) => (
                <button key={val} onClick={() => setFontSize(val)} style={{ padding: '0.3rem 0.9rem', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', background: fontSize === val ? 'var(--ink)' : 'transparent', color: fontSize === val ? 'var(--paper)' : 'var(--sub)', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--line)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span aria-hidden style={{ display: 'flex', color: 'var(--ink)' }}><SunMoon size={18} /></span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--ink)' }}>Appearance</h3>
                <p style={{ margin: '1px 0 0', fontSize: '0.72rem', color: 'var(--sub)' }}>System follows your phone's setting</p>
              </div>
            </div>
            <div role="group" aria-label="Appearance" style={{ display: 'flex', background: 'var(--paper)', borderRadius: '999px', padding: '3px', gap: '2px' }}>
              {[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']].map(([val, label]) => (
                <button key={val} aria-pressed={theme === val} onClick={() => setTheme(val)} style={{ padding: '0.3rem 0.8rem', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', background: theme === val ? 'var(--ink)' : 'transparent', color: theme === val ? 'var(--paper)' : 'var(--sub)', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--line)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>✨</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--ink)' }}>Intro Tour</h3>
                <p style={{ margin: '1px 0 0', fontSize: '0.72rem', color: 'var(--sub)' }}>Replay the walkthrough of the app's features</p>
              </div>
            </div>
            <button onClick={openOnboarding} style={{ flexShrink: 0, padding: '0.45rem 1.1rem', borderRadius: '999px', border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', cursor: 'pointer', fontWeight: '700', fontSize: '0.82rem' }}>
              Replay
            </button>
          </div>
        </div>

        </div>
    </main>
  );
}
