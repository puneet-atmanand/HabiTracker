import { Cloud, HardDrive, ShieldAlert, Sparkles } from 'lucide-react';

export default function DataMigrationModal({ migrationState, onResolve }) {
  if (!migrationState) return null;

  const { type, localData, cloudData, cloudUpdatedAt } = migrationState;

  const countCompletions = (completionsObj) => {
    return Object.keys(completionsObj || {}).length;
  };

  const localHabitCount = localData?.habits?.length || 0;
  const localCompletionsCount = countCompletions(localData?.completions);

  const cloudHabitCount = cloudData?.habits?.length || 0;
  const cloudCompletionsCount = countCompletions(cloudData?.completions);

  const formattedCloudDate = cloudUpdatedAt
    ? new Date(cloudUpdatedAt).toLocaleString()
    : 'Existing Cloud Data';

  // ── Scenario A: Cloud has no data, local data exists on this device ─────────
  if (type === 'import_local') {
    return (
      <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="migration-title">
        <div className="modal-box migration-modal">
          <div className="migration-header">
            <div className="migration-icon-badge">
              <Sparkles size={24} />
            </div>
            <div>
              <h2 id="migration-title" className="migration-title">
                Import Existing Tracker Data
              </h2>
              <p className="migration-subtitle">
                We found habit records on this device. Would you like to upload them to your new cloud account?
              </p>
            </div>
          </div>

          <div className="migration-data-card">
            <div className="migration-data-header">
              <HardDrive size={16} />
              <span style={{ fontWeight: 600 }}>Local Device Data</span>
            </div>
            <div className="migration-data-stats">
              <div className="migration-stat">
                <span className="migration-stat-num">{localHabitCount}</span>
                <span className="migration-stat-label">Habits</span>
              </div>
              <div className="migration-stat">
                <span className="migration-stat-num">{localCompletionsCount}</span>
                <span className="migration-stat-label">Check-ins</span>
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '1rem 0' }}>
            Importing will sync these habits across all your devices (phone and laptop). Your local records will remain safely preserved.
          </p>

          <div className="migration-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => onResolve('start_fresh')}
            >
              Start Fresh with Default Habits
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onResolve('import_local')}
              id="btn-confirm-import-local"
            >
              <Cloud size={15} />
              <span>Import to Cloud Account</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Scenario B: Both cloud data and local device data exist and differ ──────
  if (type === 'conflict') {
    return (
      <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="conflict-title">
        <div className="modal-box migration-modal">
          <div className="migration-header">
            <div className="migration-icon-badge" style={{ background: '#fef3c7', color: '#b45309' }}>
              <ShieldAlert size={24} />
            </div>
            <div>
              <h2 id="conflict-title" className="migration-title">
                Choose Data Version
              </h2>
              <p className="migration-subtitle">
                Different tracker data was found in the cloud and on this device. Please select which version you want to use.
              </p>
            </div>
          </div>

          <div className="conflict-grid">
            {/* Cloud Version Card */}
            <div className="conflict-card">
              <div className="conflict-card-header">
                <Cloud size={18} style={{ color: 'var(--accent-strong)' }} />
                <span style={{ fontWeight: 600 }}>Cloud Version</span>
              </div>
              <p className="conflict-date">Updated: {formattedCloudDate}</p>
              <div className="migration-data-stats">
                <div className="migration-stat">
                  <span className="migration-stat-num">{cloudHabitCount}</span>
                  <span className="migration-stat-label">Habits</span>
                </div>
                <div className="migration-stat">
                  <span className="migration-stat-num">{cloudCompletionsCount}</span>
                  <span className="migration-stat-label">Check-ins</span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.75rem' }}
                onClick={() => onResolve('use_cloud')}
              >
                Use Cloud Version
              </button>
            </div>

            {/* Local Version Card */}
            <div className="conflict-card">
              <div className="conflict-card-header">
                <HardDrive size={18} style={{ color: 'var(--text-dark)' }} />
                <span style={{ fontWeight: 600 }}>This Device's Version</span>
              </div>
              <p className="conflict-date">Stored in localStorage</p>
              <div className="migration-data-stats">
                <div className="migration-stat">
                  <span className="migration-stat-num">{localHabitCount}</span>
                  <span className="migration-stat-label">Habits</span>
                </div>
                <div className="migration-stat">
                  <span className="migration-stat-num">{localCompletionsCount}</span>
                  <span className="migration-stat-label">Check-ins</span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', marginTop: '0.75rem' }}
                onClick={() => onResolve('use_local')}
              >
                Keep Local & Overwrite Cloud
              </button>
            </div>
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1rem', textAlign: 'center' }}>
            Whichever version you pick will become synchronized across all your devices.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
