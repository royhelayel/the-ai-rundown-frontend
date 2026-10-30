import { LogOut, User, Loader, ChevronLeft, ChevronRight, History, SunMoon, Globe2, Type, Sparkles, Video } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Logo from '../components/Logo';
import Wordmark from '../components/Wordmark';
import useAnimationPreference from '../hooks/useAnimationPreference';

export default function SettingsPage({
  user, setUser, openOnboarding, setShowAuth, setAuthMode, setSignOutLoading, signOutLoading,
  setRestoreArmed, setCustomCategories, setCustomCategoryDescriptions, setFontSize, fontSize,
  setFeedCategories, feedCategories, newsLanguage, theme, setTheme, setFollowing,
  setCircleSaves, setCirclePopular, navigate, location, myNewsCategories, MY_FEED_COLOR,
  saveFeedCategories, saveNewsLanguage, preferredReadMode,
}) {
  const [animations, setAnimations] = useAnimationPreference();
  const panel = { background: 'var(--surface)', borderRadius: 20, padding: '4px 20px' };
  const row = { display: 'flex', alignItems: 'center', gap: 12, minHeight: 76, padding: '14px 0', flexWrap: 'wrap' };
  const label = { flex: '1 1 130px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 600 };
  const action = { display: 'flex', alignItems: 'center', gap: 12, width: '100%', minHeight: 60, padding: '12px 0', background: 'none', border: 0, color: 'var(--ink)', textAlign: 'left', cursor: 'pointer', fontSize: 14, fontWeight: 600 };
  const segment = (name, value, choices, change) => <div role="group" aria-label={name} style={{ display: 'flex', background: 'var(--paper)', borderRadius: 12, padding: 3, gap: 2 }}>
    {choices.map(([key, text]) => <button key={key} aria-pressed={value === key} onClick={() => change(key)} style={{ minHeight: 38, padding: '6px 12px', borderRadius: 9, border: 0, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: value === key ? 'var(--ink)' : 'transparent', color: value === key ? 'var(--paper)' : 'var(--sub)', transition: 'background-color .15s, color .15s' }}>{text}</button>)}
  </div>;
  return <main style={{ background: 'var(--paper)', color: 'var(--ink)', minHeight: '100dvh', maxWidth: 680, margin: '0 auto', paddingBottom: 'calc(32px + env(safe-area-inset-bottom, 0px))' }}>
    <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--paper)', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px' }}>
      <button aria-label="Back" className="rn-btn" onClick={() => {
        if (location.state?.from) { navigate(-1); return; }
        navigate(preferredReadMode() === 'audio' ? '/listen' : '/');
      }} style={{ width: 44, height: 44, display: 'grid', placeItems: 'center', color: 'var(--ink)' }}><ChevronLeft size={22} /></button>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 750 }}>Settings</h1>
    </header>
    <div style={{ padding: '8px 20px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {user ? <section aria-label="Your account" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 4px 4px' }}>
        <div aria-hidden="true" style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--panel)', color: 'var(--sub)', display: 'grid', placeItems: 'center', fontSize: 17, fontWeight: 700, flexShrink: 0 }}>
          {(user.display_name || user.email || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontSize: 18, overflowWrap: 'anywhere' }}>{user.display_name || user.email}</h2>
          {(user.username || (user.display_name && user.email)) && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--sub)', overflowWrap: 'anywhere' }}>{user.username ? `@${user.username}` : user.email}</p>}
        </div>
      </section> : <section aria-label="Your account" style={{ ...panel, padding: 20 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}><User size={22} color="var(--sub)" /><h2 style={{ margin: 0, fontSize: 18 }}>Make RadioNews yours</h2></div>
        <p style={{ fontSize: 14, color: 'var(--sub)', lineHeight: 1.5, margin: '10px 0 16px' }}>Sign in to keep your preferences and reading history across devices.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <button className="rn-btn" onClick={() => { setShowAuth(true); setAuthMode('signin'); }} style={{ minHeight: 44, padding: '8px 20px', background: 'var(--ink)', color: 'var(--paper)', borderRadius: 12, fontWeight: 650 }}>Sign in</button>
          <button className="rn-btn" onClick={() => { setShowAuth(true); setAuthMode('signup'); }} style={{ minHeight: 44, padding: '8px 4px', color: 'var(--sub)', fontWeight: 600 }}>Create account</button>
        </div>
      </section>}
      <section aria-labelledby="preferences-title">
        <h2 id="preferences-title" style={{ fontSize: 12, fontWeight: 650, color: 'var(--sub)', margin: '0 0 10px 4px', letterSpacing: '.06em', textTransform: 'uppercase' }}>Preferences</h2>
        <div style={panel}>
          <div style={row}><div style={label}><Globe2 size={18} color="var(--sub)" />News language</div>{segment('News language', newsLanguage, [['en', 'English'], ['ar', 'عربي']], saveNewsLanguage)}</div>
          <div style={row}><div style={label}><Video size={18} color="var(--sub)" /><div>Animations<p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 400, color: 'var(--sub)' }}>Moving illustrations while you listen</p></div></div>{segment('Animations', animations ? 'on' : 'off', [['on', 'On'], ['off', 'Off']], value => setAnimations(value === 'on'))}</div>
          <div style={row}><div style={label}><Type size={18} color="var(--sub)" />Text size</div>{segment('Text size', fontSize, [['normal', 'Normal'], ['large', 'Large']], setFontSize)}</div>
          <div style={row}>
            <div style={label}><SunMoon size={18} color="var(--sub)" /><div>Appearance<p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 400, color: 'var(--sub)' }}>System follows your device</p></div></div>
            {segment('Appearance', theme, [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']], setTheme)}
          </div>
        </div>
      </section>
      <section aria-label="Activity and help" style={panel}>
        {user && <button style={action} onClick={() => navigate('/history', { state: { from: location.pathname } })}><History size={18} color="var(--sub)" /><span style={{ flex: 1 }}>Reading history</span><ChevronRight size={18} color="var(--sub)" /></button>}
        <button style={action} onClick={openOnboarding}><Sparkles size={18} color="var(--sub)" /><span style={{ flex: 1 }}>Intro tour</span><span style={{ fontSize: 12, color: 'var(--sub)', fontWeight: 400 }}>Replay</span><ChevronRight size={18} color="var(--sub)" /></button>
      </section>
      {user && <button disabled={signOutLoading} onClick={async () => {
                setSignOutLoading(true);
                await supabase.auth.signOut();
                setUser(null); setFeedCategories([]); setCustomCategories([]);
                setCustomCategoryDescriptions({}); setFollowing([]); setCircleSaves([]); setCirclePopular([]);
                localStorage.removeItem('newsdigest_user');
                setSignOutLoading(false);
                navigate('/');

      }} style={{ ...action, width: 'auto', alignSelf: 'flex-start', color: 'var(--sub)', padding: '0 4px', minHeight: 44, opacity: signOutLoading ? .6 : 1 }}>
        {signOutLoading ? <Loader size={18} style={{ animation: 'spin .8s linear infinite' }} /> : <LogOut size={18} />}{signOutLoading ? 'Signing out…' : 'Sign out'}
      </button>}
      <footer style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '8px 0', color: 'var(--sub)' }}>
        <Logo size={36} decorative /><Wordmark />
      </footer>
    </div>
  </main>;
}
