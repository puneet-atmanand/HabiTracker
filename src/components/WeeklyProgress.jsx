import { calcWeeklyProgress } from '../utils.js';

export default function WeeklyProgress({ year, month, habits, completions }) {
  const weeks = calcWeeklyProgress(year, month, habits, completions);

  return (
    <div className="card" style={{ flex: '1', minWidth: '220px', display: 'flex', flexDirection: 'column' }}>
      <div className="card-title">Weekly Progress</div>
      {habits.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          Add habits to see weekly progress.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, justifyContent: 'space-between' }}>
          {weeks.map(w => (
            <div key={w.week}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dark)' }}>
                    Week {w.week}
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>
                    Days {w.start}–{w.end}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                    {w.done}/{w.possible}
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-strong)' }}>
                    {w.pct}%
                  </span>
                </div>
              </div>
              <div className="progress-track" style={{ height: '5px' }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${w.pct}%`,
                    background: w.pct === 100
                      ? 'var(--accent-strong)'
                      : w.pct >= 60
                      ? 'var(--accent-mid)'
                      : 'var(--accent-light)',
                  }}
                  role="progressbar"
                  aria-valuenow={w.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Week ${w.week} progress: ${w.pct}%`}
                />
              </div>
            </div>
          ))}
          {weeks.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No weeks to display.</p>
          )}
        </div>
      )}
    </div>
  );
}
