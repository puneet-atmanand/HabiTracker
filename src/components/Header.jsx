import { Download } from 'lucide-react';

export default function Header({ onDownloadReport, isDownloading }) {
  return (
    <header className="site-header">
      <div className="header-inner">
        {/* User Name */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span className="header-user-name">
            PUNEET ATMANAND ITI
          </span>
        </div>

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
    </header>
  );
}
