import { calcHabitCompletion, elapsedDays } from '../utils.js';

export default function HabitProgressList({ year, month, habits, completions, rowHeights = [] }) {
  const elapsed = elapsedDays(year, month);

  if (habits.length === 0) {
    return (
      <div className="card" style={{ padding: '0', height: '100%' }}>
        <div className="matrix-card-header">
          <span className="card-title" style={{ margin: 0 }}>Habit Progress</span>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '2rem 1rem' }}>
          No habits yet. Add some in the tracker below.
        </p>
      </div>
    );
  }

  const items = habits.map(h => ({
    ...h,
    pct: calcHabitCompletion(h.id, year, month, completions),
  }));

  const avgPct = Math.round(items.reduce((s, x) => s + x.pct, 0) / habits.length);

  return (
    <div className="card" style={{ padding: '0', display: 'flex', flexDirection: 'column' }}>
      <div className="matrix-card-header">
        <span className="card-title" style={{ margin: 0 }}>Habit Progress</span>
        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
          {elapsed > 0 ? `${elapsed} days tracked` : 'No days tracked'}
        </span>
      </div>

      <div className="progress-table-head">
        <span>Completion</span>
        <span>Goal</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {items.map((h, i) => {
          const rowH = rowHeights[i];
          return (
            <div
              key={h.id}
              className="progress-row-item"
              style={{
                height: rowH ? `${rowH}px` : undefined,
                minHeight: rowH ? `${rowH}px` : '2.875rem',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', gap: '0.5rem' }}>
                <span
                  style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: 'var(--text-dark)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                  }}
                  title={h.name}
                >
                  {h.name}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-strong)', flexShrink: 0 }}>
                  {h.pct}%
                </span>
              </div>
              <div className="progress-track" style={{ height: '6px' }}>
                <div
                  className="progress-fill"
                  style={{
                    width: `${h.pct}%`,
                    background: h.pct === 100
                      ? 'var(--accent-strong)'
                      : h.pct >= 60
                      ? 'var(--accent-mid)'
                      : 'var(--accent-light)',
                  }}
                  role="progressbar"
                  aria-valuenow={h.pct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${h.name} progress: ${h.pct}%`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Synchronized footer aligned across from '+ Add habit' row */}
      <div className="progress-footer-row">
        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)' }}>
          Monthly Avg
        </span>
        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--accent-strong)' }}>
          {avgPct}%
        </span>
      </div>
    </div>
  );
}
