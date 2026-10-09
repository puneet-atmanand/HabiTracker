import { useRef, useState } from 'react';
import { validateBackup } from '../utils.js';

export default function BackupControls({ data, onImport, onToast, fileInputRef }) {
  const [importing, setImporting] = useState(false);
  const [pendingData, setPendingData] = useState(null);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const err = validateBackup(parsed);
        if (err) {
          onToast('error', `Invalid backup: ${err}`);
          return;
        }
        setPendingData(parsed);
        setImporting(true);
      } catch {
        onToast('error', 'Failed to parse JSON file. Please choose a valid backup.');
      }
    };
    reader.readAsText(file);
    // Reset file input so same file can be selected again
    e.target.value = '';
  }

  function confirmImport() {
    onImport(pendingData);
    setImporting(false);
    setPendingData(null);
    onToast('success', 'Backup imported successfully!');
  }

  function cancelImport() {
    setImporting(false);
    setPendingData(null);
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFileChange}
        style={{ display: 'none' }}
        aria-label="Select backup JSON file"
        id="file-input-backup"
      />

      {importing && pendingData && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="import-modal-title">
          <div className="modal-box">
            <h2 id="import-modal-title" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.75rem' }}>
              Import Backup
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              This backup contains:
            </p>
            <ul style={{ fontSize: '0.875rem', color: 'var(--text-dark)', marginBottom: '1rem', paddingLeft: '1.25rem' }}>
              <li><strong>{pendingData.habits?.length || 0}</strong> habits</li>
              <li><strong>{Object.keys(pendingData.completions || {}).length}</strong> completion records</li>
            </ul>
            <p style={{ fontSize: '0.8rem', color: '#dc2626', marginBottom: '1rem', fontWeight: 500 }}>
              ⚠ This will replace your current data. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={cancelImport} aria-label="Cancel import">
                Cancel
              </button>
              <button className="btn btn-primary" onClick={confirmImport} id="btn-confirm-import" aria-label="Confirm import">
                Import & Replace
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
