import { Check, CloudOff, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

export default function SyncStatusBadge({ status, lastSyncedAt, onRetry, errorMsg }) {
  const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  if (status === 'syncing') {
    return (
      <div
        className="sync-badge sync-badge-syncing"
        title="Syncing changes with Supabase..."
        role="status"
        aria-live="polite"
      >
        <Loader2 size={13} className="sync-icon-spin" />
        <span className="sync-badge-text">Saving...</span>
      </div>
    );
  }

  if (status === 'offline') {
    return (
      <div
        className="sync-badge sync-badge-offline"
        title="You are currently offline. Changes are saved locally on this device and will sync when reconnected."
        role="status"
        aria-live="polite"
      >
        <CloudOff size={13} />
        <span className="sync-badge-text">Offline (Saved locally)</span>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div
        className="sync-badge sync-badge-error"
        title={errorMsg ? `Sync error: ${errorMsg}` : 'Failed to sync with cloud. Click to retry.'}
        role="alert"
      >
        <AlertCircle size={13} />
        <span className="sync-badge-text">Sync Error</span>
        {onRetry && (
          <button
            type="button"
            className="sync-retry-btn"
            onClick={onRetry}
            aria-label="Retry syncing"
            title="Retry cloud sync"
          >
            <RefreshCw size={11} />
            <span>Retry</span>
          </button>
        )}
      </div>
    );
  }

  // Default: 'synced'
  return (
    <div
      className="sync-badge sync-badge-synced"
      title={lastSyncedAt ? `Cloud synced · Last saved at ${formatTime(lastSyncedAt)}` : 'Cloud synced'}
      role="status"
      aria-live="polite"
    >
      <Check size={13} strokeWidth={2.5} />
      <span className="sync-badge-text">
        Synced{lastSyncedAt ? ` · ${formatTime(lastSyncedAt)}` : ''}
      </span>
    </div>
  );
}
