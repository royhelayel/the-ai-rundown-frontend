import React, { useState, useEffect } from 'react';

export const VerificationPage = () => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('verifying'); // verifying, success, error, expired
  const [error, setError] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get token and email from URL
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const email = params.get('email');

        if (!token || !email) {
          setStatus('error');
          setError('No verification token found');
          setLoading(false);
          return;
        }

        console.log('Verifying:', { token, email });

        // Call backend verification endpoint
        const response = await fetch('http://localhost:3001/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, email })
        });

        const data = await response.json();

        if (!response.ok) {
          if (data.code === 'TOKEN_EXPIRED') {
            setStatus('expired');
          } else {
            setStatus('error');
            setError(data.error || 'Verification failed');
          }
          setLoading(false);
          return;
        }

        setStatus('success');
        setLoading(false);
      } catch (err) {
        setStatus('error');
        setError(err.message);
        setLoading(false);
      }
    };

    verifyEmail();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)',
        flexDirection: 'column'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '4px solid #6366f1', 
            borderTop: '4px solid transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <h2 style={{ color: '#1a1a2e' }}>Verifying your email...</h2>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)',
      padding: '2rem'
    }}>
      <div style={{ 
        background: 'white', 
        borderRadius: '16px', 
        padding: '3rem', 
        maxWidth: '450px', 
        width: '100%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)'
      }}>
        
        {status === 'success' && (
          <>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '48px',
                marginBottom: '1rem',
                color: '#10b981'
              }}>
                ✓
              </div>
              <h1 style={{ 
                fontSize: '1.8rem', 
                fontWeight: '900', 
                marginBottom: '0.5rem', 
                color: '#1a1a2e' 
              }}>
                Email Verified!
              </h1>
              <p style={{ color: '#64748b', marginBottom: '2rem' }}>
                Your email has been verified. You can now sign in and start using The AI Rundown.
              </p>
              <a href="/" style={{ 
                display: 'inline-block',
                padding: '0.85rem 2rem', 
                background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', 
                color: 'white', 
                textDecoration: 'none', 
                borderRadius: '8px', 
                fontWeight: '700'
              }}>
                Go to Dashboard
              </a>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '48px',
                marginBottom: '1rem',
                color: '#e74c3c'
              }}>
                ✗
              </div>
              <h1 style={{ 
                fontSize: '1.8rem', 
                fontWeight: '900', 
                marginBottom: '0.5rem', 
                color: '#1a1a2e' 
              }}>
                Verification Failed
              </h1>
              <p style={{ color: '#64748b', marginBottom: '1rem' }}>
                {error || 'There was an issue verifying your email.'}
              </p>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '2rem' }}>
                Please sign in and request a new verification email.
              </p>
              <a href="/" style={{ 
                display: 'inline-block',
                padding: '0.85rem 2rem', 
                background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', 
                color: 'white', 
                textDecoration: 'none', 
                borderRadius: '8px', 
                fontWeight: '700'
              }}>
                Go to Home
              </a>
            </div>
          </>
        )}

        {status === 'expired' && (
          <>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                fontSize: '48px',
                marginBottom: '1rem',
                color: '#f59e0b'
              }}>
                ⏱️
              </div>
              <h1 style={{ 
                fontSize: '1.8rem', 
                fontWeight: '900', 
                marginBottom: '0.5rem', 
                color: '#1a1a2e' 
              }}>
                Link Expired
              </h1>
              <p style={{ color: '#64748b', marginBottom: '2rem' }}>
                Your verification link has expired. Please sign in and request a new one.
              </p>
              <a href="/" style={{ 
                display: 'inline-block',
                padding: '0.85rem 2rem', 
                background: 'linear-gradient(135deg, #6366f1 0%, #ec4899 100%)', 
                color: 'white', 
                textDecoration: 'none', 
                borderRadius: '8px', 
                fontWeight: '700'
              }}>
                Go to Home
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VerificationPage;