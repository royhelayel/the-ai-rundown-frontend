/**
 * Sign in or sign up — a bottom sheet in the app's own look, like the challenge and sources
 * sheets: paper, the wordmark, the app's inputs and its one strong colour on the main action
 * (Roy, 2026-10-18). It was a dark box with an indigo-to-pink gradient that matched nothing
 * else and ignored light and dark mode. Sign-in itself is unchanged: an emailed 6-digit code.
 */
import React from 'react';
import { Loader, X } from 'lucide-react';
import Wordmark from '../components/Wordmark';

const field = {
  width: '100%', minHeight: 50, padding: '0 16px', boxSizing: 'border-box', borderRadius: 14,
  border: '1px solid var(--line)', background: 'var(--story-panel)', color: 'var(--ink)',
  fontSize: 16, fontFamily: 'inherit', outline: 'none',
};
const primary = (busy) => ({
  width: '100%', minHeight: 50, borderRadius: 14, border: 'none', background: 'var(--play-bg)', color: 'var(--play-fg)',
  fontSize: 15, fontWeight: 700, fontFamily: 'inherit', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.75 : 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
});
const secondary = (busy) => ({
  flex: 1, minHeight: 44, borderRadius: 12, border: 'none', background: 'var(--panel)', color: 'var(--ink)',
  fontSize: 14, fontWeight: 600, fontFamily: 'inherit', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
});
const MESSAGE_COLOR = { error: 'var(--error)', success: 'var(--read)' };

export default function AuthModal({
  setShowAuth, email, setEmail, setPassword, authMessage, setAuthMessage, authLoading, otpStep,
  setOtpStep, otpCode, setOtpCode, handleSendCode, handleVerifyCode,
}) {
  const close = () => { setShowAuth(false); setEmail(''); setPassword(''); setOtpCode(''); setOtpStep('email'); setAuthMessage(null); };
  const focusRing = (e, on) => { e.currentTarget.style.borderColor = on ? 'var(--accent)' : 'var(--line)'; };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000 }}>
      <div onClick={close} aria-hidden style={{ position: 'absolute', inset: 0, background: 'var(--overlay)', animation: 'rn-fade-in 0.25s ease-out' }} />
      <div role="dialog" aria-modal="true" aria-labelledby="auth-title"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, margin: '0 auto', width: '100%', maxWidth: 560, boxSizing: 'border-box',
          background: 'var(--paper)', color: 'var(--ink)', borderRadius: '24px 24px 0 0', boxShadow: 'var(--menu-shadow)',
          padding: '10px 20px calc(env(safe-area-inset-bottom, 0px) + 22px)', maxHeight: '90dvh', overflowY: 'auto',
          animation: 'rn-sheet-up 0.32s cubic-bezier(0.32,0.72,0,1)' }}>
        <span aria-hidden style={{ display: 'block', width: 38, height: 5, borderRadius: 5, background: 'var(--line)', margin: '0 auto 10px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 36, marginBottom: 14 }}>
          <Wordmark />
          <button className="rn-btn" onClick={close} aria-label="Close"
            style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--panel)', color: 'var(--sub)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={16} />
          </button>
        </div>

        <h2 id="auth-title" style={{ margin: '0 0 6px', fontSize: 24, lineHeight: 1.15, letterSpacing: '-0.03em', fontWeight: 750 }}>
          {otpStep === 'email' ? 'Sign in or sign up' : 'Enter your code'}
        </h2>
        <p style={{ margin: '0 0 18px', fontSize: 15, lineHeight: 1.5, color: 'var(--sub)' }}>
          {otpStep === 'email'
            ? 'Keep your reading history, Interesting stories and challenge on every device. We’ll email you a 6-digit code — no password.'
            : <>We sent a code to <span style={{ color: 'var(--ink)', fontWeight: 650 }}>{email}</span>.</>}
        </p>

        {authMessage && (
          <p role={authMessage.type === 'error' ? 'alert' : 'status'}
            style={{ margin: '0 0 14px', padding: '11px 14px', borderRadius: 12, background: 'var(--panel)', fontSize: 14, lineHeight: 1.45,
              color: MESSAGE_COLOR[authMessage.type] || 'var(--ink)', fontWeight: authMessage.type === 'error' ? 600 : 500 }}>
            {authMessage.text}
          </p>
        )}

        {otpStep === 'email' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email} aria-label="Email"
              onChange={e => { setEmail(e.target.value); setAuthMessage(null); }}
              onKeyDown={e => { if (e.key === 'Enter' && !authLoading) handleSendCode(); }}
              onFocus={e => focusRing(e, true)} onBlur={e => focusRing(e, false)}
              style={field} />
            <button onClick={handleSendCode} disabled={authLoading} style={primary(authLoading)}>
              {authLoading ? <><Loader size={16} style={{ animation: 'rn-spin 0.8s linear infinite' }} /> Sending code…</> : 'Send code'}
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={10} placeholder="000000" value={otpCode} aria-label="Code"
              onChange={e => { setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 10)); setAuthMessage(null); }}
              onKeyDown={e => { if (e.key === 'Enter' && !authLoading) handleVerifyCode(); }}
              onFocus={e => focusRing(e, true)} onBlur={e => focusRing(e, false)}
              autoFocus
              style={{ ...field, fontSize: 24, fontWeight: 700, letterSpacing: '0.35em', textAlign: 'center' }} />
            <button onClick={handleVerifyCode} disabled={authLoading} style={primary(authLoading)}>
              {authLoading ? <><Loader size={16} style={{ animation: 'rn-spin 0.8s linear infinite' }} /> Verifying…</> : 'Verify and continue'}
            </button>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setOtpStep('email'); setOtpCode(''); setAuthMessage(null); }} style={secondary(false)}>
                Change email
              </button>
              <button onClick={handleSendCode} disabled={authLoading} style={secondary(authLoading)}>
                Resend code
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
