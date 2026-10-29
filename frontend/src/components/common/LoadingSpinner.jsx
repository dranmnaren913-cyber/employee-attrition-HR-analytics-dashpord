import React from 'react';

export default function LoadingSpinner({ message = 'Loading analytics data...' }) {
  return (
    <div className="state-box">
      <div className="spinner" />
      <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 500 }}>
        {message}
      </p>
    </div>
  );
}
