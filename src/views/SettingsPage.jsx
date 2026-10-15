import { LogOut, User, Star, Loader, ChevronLeft, ChevronRight } from 'lucide-react';
import FeedCategoryEditor from '../components/FeedCategoryEditor';
import { supabase } from '../lib/supabaseClient';

export default function SettingsPage({
  user, setUser, openOnboarding, setShowAuth, setAuthMode, setSignOutLoading, signOutLoading,
  setRestoreArmed, setCustomCategories, setCustomCategoryDescriptions, setFontSize, fontSize,
  setFeedCategories, feedCategories, newsLanguage, dailyGoal, handleSetDailyGoal, setFollowing,
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
              {/* My Interesting — the stories this user flagged. It used to hang off the
                  Interesting tab, which is the *shared* view of what readers found
                  interesting; a personal shortcut at the top of it put two scopes on one
                  screen. It belongs with the rest of "things that are mine". */}
              <button onClick={() => navigate('/saved')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.5rem 1rem', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '999px', color: 'var(--ink)', cursor: 'pointer', fontWeight: '700', fontSize: '0.83rem', width: '100%' }}>
                <Star size={15} color="#7c3aed" />
                <span style={{ flex: 1, textAlign: 'left' }}>My Interesting</span>
                <ChevronRight size={15} color="#8a8a9a" />
              </button>
              {/* View profile link */}
              {user.username && (
                <button onClick={() => navigate(`/profile/${user.username}`)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0.5rem 1rem', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '999px', color: 'var(--ink)', cursor: 'pointer', fontWeight: '700', fontSize: '0.83rem', width: '100%' }}>
                  View My Profile
                </button>
              )}
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
        {user && (
        <div style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--line)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>🎯</span>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--ink)' }}>Daily Goal</h3>
                <p style={{ margin: '1px 0 0', fontSize: '0.72rem', color: 'var(--sub)' }}>Stories to read or listen to each day</p>
              </div>
            </div>
            <div style={{ display: 'flex', background: 'var(--paper)', borderRadius: '999px', padding: '3px', gap: '2px' }}>
              {[5, 10, 15, 20].map(g => (
                <button key={g} onClick={() => handleSetDailyGoal(g)} style={{ padding: '0.3rem 0.7rem', borderRadius: '999px', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: '700', background: dailyGoal === g ? 'var(--ink)' : 'transparent', color: dailyGoal === g ? 'var(--paper)' : 'var(--sub)', transition: 'all 0.15s' }}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
        )}
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
        {user && (
        <div id="settings-myfeed" style={{ background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--line)', padding: '1.5rem', position: 'relative', overflow: 'hidden', scrollMarginTop: '72px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={MY_FEED_COLOR} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: 'var(--ink)' }}>My News</h3>
          </div>
          <p style={{ margin: '0.25rem 0 1rem', fontSize: '0.78rem', color: 'var(--sub)' }}>Add the categories you want, then drag to rank them — the order sets your story order.</p>
          <FeedCategoryEditor allCategories={myNewsCategories} selected={feedCategories} onChange={saveFeedCategories} />
          {/* The way back to the full set. Reading screens have no My/All switch any
              more — editing this list is what narrows them, so undoing that edit is what
              widens them again, and it belongs next to the edit rather than one tap away
              on the screen you are reading. */}
          <div style={{ marginTop: '1.1rem', paddingTop: '1.1rem', borderTop: '1px solid var(--line)' }}>
            <p style={{ margin: '0 0 0.6rem', fontSize: '0.78rem', color: 'var(--sub)' }}>
              Your reading screens show these news categories. Restore the defaults to see all of them again.
            </p>
            <button
              onClick={() => setRestoreArmed(true)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                padding: '0.5rem 1rem', borderRadius: '999px', width: '100%', cursor: 'pointer',
                fontWeight: '700', fontSize: '0.83rem', background: 'var(--paper)',
                border: '1px solid var(--line)', color: 'var(--ink)' }}>
              Restore default news categories
            </button>
          </div>
        </div>
        )}
        </div>
    </main>
  );
}
