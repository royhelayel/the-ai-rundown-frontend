import { Loader } from 'lucide-react';

export default function AuthModal({
  setShowAuth, email, setEmail, setPassword, authMessage, setAuthMessage, authLoading, otpStep,
  setOtpStep, otpCode, setOtpCode, handleSendCode, handleVerifyCode,
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#18181f', borderRadius: '20px', padding: '2rem', maxWidth: '380px', width: '90%', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '0.4rem', textAlign: 'center', color: 'white' }}>
          {otpStep === 'email' ? 'Sign in or sign up' : 'Enter your code'}
        </h2>
        <p style={{ margin: '0 0 1.4rem', textAlign: 'center', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
          {otpStep === 'email'
            ? 'Enter your email and we’ll send you a 6-digit code — no password needed.'
            : <>We sent a code to <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 700 }}>{email}</span></>}
        </p>
        {authMessage && (
          <div style={{ marginBottom: '1.1rem', padding: '0.85rem 1rem', borderRadius: '12px', fontSize: '0.88rem', lineHeight: '1.5',
            background: authMessage.type === 'error' ? 'rgba(239,68,68,0.1)' : authMessage.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(99,102,241,0.1)',
            color: authMessage.type === 'error' ? '#f87171' : authMessage.type === 'success' ? '#4ade80' : '#a5b4fc',
            border: `1px solid ${authMessage.type === 'error' ? 'rgba(239,68,68,0.3)' : authMessage.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(99,102,241,0.3)'}`
          }}>
            {authMessage.text}
          </div>
        )}

        {otpStep === 'email' ? (
          <>
            <input type="email" inputMode="email" autoComplete="email" placeholder="you@example.com" value={email}
              onChange={e => { setEmail(e.target.value); setAuthMessage(null); }}
              onKeyDown={e => { if (e.key === 'Enter' && !authLoading) handleSendCode(); }}
              style={{ width: '100%', padding: '0.78rem 1rem', marginBottom: '1.2rem', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', fontSize: '0.93rem', background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
            <button onClick={handleSendCode} disabled={authLoading}
              style={{ width: '100%', padding: '0.82rem', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: 'white', border: 'none', borderRadius: '999px', cursor: authLoading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.93rem', marginBottom: '0.6rem', opacity: authLoading ? 0.8 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {authLoading ? <><Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Sending code…</> : 'Send code'}
            </button>
          </>
        ) : (
          <>
            <input type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={10} placeholder="Enter code" value={otpCode}
              onChange={e => { setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 10)); setAuthMessage(null); }}
              onKeyDown={e => { if (e.key === 'Enter' && !authLoading) handleVerifyCode(); }}
              autoFocus
              style={{ width: '100%', padding: '0.78rem 1rem', marginBottom: '1.2rem', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px', fontSize: '1.4rem', letterSpacing: '0.35em', textAlign: 'center', fontWeight: 800, background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none', boxSizing: 'border-box' }} />
            <button onClick={handleVerifyCode} disabled={authLoading}
              style={{ width: '100%', padding: '0.82rem', background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', color: 'white', border: 'none', borderRadius: '999px', cursor: authLoading ? 'not-allowed' : 'pointer', fontWeight: '700', fontSize: '0.93rem', marginBottom: '0.6rem', opacity: authLoading ? 0.8 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {authLoading ? <><Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Verifying…</> : 'Verify & continue'}
            </button>
            <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.4rem' }}>
              <button onClick={() => { setOtpStep('email'); setOtpCode(''); setAuthMessage(null); }}
                style={{ flex: 1, padding: '0.7rem', background: 'none', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', borderRadius: '999px', cursor: 'pointer', fontWeight: '600', fontSize: '0.84rem' }}>
                Change email
              </button>
              <button onClick={handleSendCode} disabled={authLoading}
                style={{ flex: 1, padding: '0.7rem', background: 'none', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', borderRadius: '999px', cursor: authLoading ? 'not-allowed' : 'pointer', fontWeight: '600', fontSize: '0.84rem' }}>
                Resend code
              </button>
            </div>
          </>
        )}

        <button onClick={() => { setShowAuth(false); setEmail(''); setPassword(''); setOtpCode(''); setOtpStep('email'); setAuthMessage(null); }}
          style={{ width: '100%', padding: '0.7rem', background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: '0.88rem' }}>
          Close
        </button>
      </div>
    </div>
  );
}
