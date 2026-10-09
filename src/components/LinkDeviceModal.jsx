import { useState } from 'react';
import { KeyRound, Eye, EyeOff, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

export default function LinkDeviceModal({ onAuthorized, onToast }) {
  const [syncKey, setSyncKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleAuthorize(e) {
    e.preventDefault();
    setErrorMsg('');

    if (!syncKey.trim()) {
      setErrorMsg('Please enter your Sync Key.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/tracker?action=link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ syncKey: syncKey.trim() }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMsg(data.error || 'Invalid Sync Key. Please check the key and try again.');
        setIsLoading(false);
        return;
      }

      if (onToast) onToast('success', 'Device successfully authorized!');
      if (onAuthorized) onAuthorized();
    } catch {
      setErrorMsg('Failed to connect to synchronization service. Please check your network.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: 440 }}>
        <div className="auth-header">
          <div className="auth-icon-badge">
            <ShieldCheck size={28} />
          </div>
          <h1 className="auth-title">Mint Habit Tracker</h1>
          <p className="auth-subtitle">
            Enter your secure Sync Key once to authorize this device for cloud synchronization.
          </p>
        </div>

        {errorMsg && (
          <div className="auth-alert auth-alert-error" role="alert">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleAuthorize} className="auth-form">
          <div className="auth-field">
            <label htmlFor="sync-key-input" className="auth-label">
              Sync Key
            </label>
            <div className="auth-input-group">
              <KeyRound size={16} className="auth-input-icon" />
              <input
                id="sync-key-input"
                type={showKey ? 'text' : 'password'}
                autoComplete="off"
                spellCheck="false"
                required
                value={syncKey}
                onChange={e => setSyncKey(e.target.value)}
                placeholder="Enter your 64-character Sync Key"
                className="auth-input"
                disabled={isLoading}
              />
              <button
                type="button"
                className="auth-input-eye-btn"
                onClick={() => setShowKey(!showKey)}
                aria-label={showKey ? 'Hide key' : 'Show key'}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-submit-btn"
            disabled={isLoading || !syncKey.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="sync-icon-spin" />
                <span>Authorizing Device...</span>
              </>
            ) : (
              <span>Authorize Device</span>
            )}
          </button>
        </form>

        <div className="auth-footer-note" style={{ fontSize: '0.75rem', lineHeight: 1.5 }}>
          Authorized via Secure HttpOnly Cookie. No login screens will be displayed in ordinary use.
        </div>
      </div>
    </div>
  );
}
