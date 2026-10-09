import { Download } from 'lucide-react';
import SyncStatusBadge from './SyncStatusBadge.jsx';

export default function Header({
  onDownloadReport,
  isDownloading,
  syncStatus,
  lastSyncedAt,
  onRetrySync,
  syncError,
}) {
  return (
    <header className="site-header">
      <div className="header-inner">
        {/* Left Side: Brand Name */}
        <div className="header-left">
          <span className="header-user-name">
            PUNEET ATMANAND ITI
          </span>
        </div>

        {/* Right Side: Sync Status & PDF Download */}
        <div className="header-right">
          <SyncStatusBadge
            status={syncStatus}
            lastSyncedAt={lastSyncedAt}
            onRetry={onRetrySync}
            errorMsg={syncError}
          />

          {/* Download Monthly PDF Report Action */}
          <button
            className="btn btn-primary btn-download"
            onClick={onDownloadReport}
            disabled={isDownloading}
            aria-label="Download monthly PDF report"
            id="btn-download-report"
            style={{
              opacity: isDownloading ? 0.75 : 1,
              cursor: isDownloading ? 'wait' : 'pointer',
            }}
          >
            <Download size={15} />
            <span>{isDownloading ? 'Generating PDF...' : 'Download PDF Report'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
