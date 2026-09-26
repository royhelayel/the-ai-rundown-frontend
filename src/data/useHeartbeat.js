import { useEffect } from 'react';
import { BACKEND_URL } from '../lib/backend';

export default function useHeartbeat({
  user,
}) {
  // ── Heartbeat — "on the website right now" counter ───────────────────────
  // Fires immediately on every page load (guest or signed-in) and every 60s.
  // localStorage, not sessionStorage: on mobile Safari (and PWA/home-screen launches
  // especially), reopening the app often starts a fresh browsing context with empty
  // sessionStorage, so a sessionStorage id looked like a brand-new visitor on every
  // reopen — one real person double- or triple-counted within the 2-minute expiry
  // window. localStorage survives that, so one device stays one counted session.
  // The backend stores this in an in-memory map (no DB writes).
  useEffect(() => {
    let sid = localStorage.getItem('_hb_sid');
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('_hb_sid', sid);
    }
    const ping = () => fetch(`${BACKEND_URL}/api/metrics/heartbeat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sid, userId: user?.id || null }),
    }).catch(() => {});
    ping();
    const t = setInterval(ping, 60_000);
    return () => clearInterval(t);
  }, [user?.id]); // re-fires when auth state changes so userId is always current
}
