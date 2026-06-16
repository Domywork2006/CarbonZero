import React from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

/**
 * A single toast notification item.
 *
 * @typedef {Object} Toast
 * @property {string} id      - Unique identifier for this toast.
 * @property {string} message - Text content to display.
 * @property {'success'|'error'} type - Controls icon and accent colour.
 */

/**
 * Toast notification stack rendered in the corner of the screen.
 * Extracted from App.jsx where it was duplicated for authenticated and
 * unauthenticated layouts.
 *
 * @param {Object}   props
 * @param {Toast[]}  props.toasts   - Array of active toast objects.
 * @param {Function} props.onRemove - Callback invoked with a toast id to dismiss it.
 * @returns {JSX.Element}
 */
const Toast = React.memo(function Toast({ toasts, onRemove }) {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="toast"
          style={{
            borderLeft: `4px solid ${toast.type === 'error' ? '#ef4444' : 'var(--accent-color)'}`
          }}
        >
          {toast.type === 'error' ? (
            <AlertCircle size={18} style={{ color: '#ef4444' }} />
          ) : (
            <CheckCircle size={18} style={{ color: 'var(--accent-color)' }} />
          )}
          <span style={{ fontSize: '0.88rem', fontWeight: '500' }}>
            {toast.message}
          </span>
          <button
            onClick={() => onRemove(toast.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              marginLeft: '8px',
              padding: '2px'
            }}
            aria-label="Dismiss notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
});

export default Toast;
