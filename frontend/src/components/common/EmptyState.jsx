import React from 'react';
import { Database, RotateCcw } from 'lucide-react';

export default function EmptyState({
  title = 'No records found',
  description = 'No employee records match the selected global filters. Try adjusting or clearing filters.',
  onReset
}) {
  return (
    <div className="state-box card" style={{ margin: '20px 0' }}>
      <div style={{
        width: '54px',
        height: '54px',
        borderRadius: '50%',
        backgroundColor: 'var(--bg-surface-alt)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-dim)',
        marginBottom: '16px'
      }}>
        <Database size={26} />
      </div>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
        {title}
      </h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', maxWidth: '440px', marginBottom: onReset ? '20px' : '0' }}>
        {description}
      </p>
      {onReset && (
        <button onClick={onReset} className="btn btn-secondary btn-sm">
          <RotateCcw size={14} /> Reset Global Filters
        </button>
      )}
    </div>
  );
}
