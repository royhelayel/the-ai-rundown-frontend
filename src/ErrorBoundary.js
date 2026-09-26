import React from 'react';

// Without this, any error thrown while rendering unmounts the whole tree and the user is
// left looking at a white page with no clue why. This keeps the message on screen.
export default class ErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('RadioNews crashed while rendering:', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div style={{ fontFamily: '-apple-system, system-ui, sans-serif', padding: '32px 20px', maxWidth: 520, margin: '0 auto', color: '#111' }}>
        <h1 style={{ fontSize: 20, margin: '0 0 8px' }}>Something went wrong</h1>
        <p style={{ margin: '0 0 16px', color: '#555' }}>This page hit an error. Reloading usually fixes it.</p>
        <button
          onClick={() => window.location.reload()}
          style={{ fontSize: 16, padding: '10px 18px', borderRadius: 10, border: 0, background: '#111', color: '#fff' }}
        >
          Reload
        </button>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 24, fontSize: 12, color: '#888' }}>
          {String(error?.stack || error?.message || error).slice(0, 1200)}
        </pre>
      </div>
    );
  }
}
