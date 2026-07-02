import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '60vh', gap: '1rem', padding: '2rem', textAlign: 'center', color: '#666'
        }}>
          <h2 style={{ color: '#e53e3e', margin: 0 }}>Something went wrong</h2>
          <p style={{ margin: 0 }}>{this.state.error?.message || 'An unexpected error occurred'}</p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{
              padding: '0.75rem 1.5rem', background: '#7c3aed', color: '#fff', border: 'none',
              borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem'
            }}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
