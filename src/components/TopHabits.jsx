import { Trophy } from 'lucide-react';
import { rankHabits } from '../utils.js';

const RANK_MEDALS = ['🥇', '🥈', '🥉', '4', '5'];
const RANK_COLORS = ['#5F9254', '#88B779', '#B5D3A8', 'var(--text-muted)', 'var(--text-muted)'];

export default function TopHabits({ year, month, habits, completions }) {
  const ranked = rankHabits(habits, year, month, completions).slice(0, 5);

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
        <Trophy size={14} style={{ color: 'var(--accent-strong)' }} />
        <span className="card-title" style={{ margin: 0 }}>Top 5 Habits</span>
      </div>

      {habits.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '0.75rem 0' }}>
          No habits to rank yet.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {ranked.map((h, i) => (
            <div
              key={h.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                padding: '0.5rem 0.65rem',
                borderRadius: '8px',
                background: i === 0 ? 'var(--bg-light)' : 'transparent',
                border: i === 0 ? '1px solid var(--border-color)' : '1px solid transparent',
              }}
            >
              <span
                style={{
                  fontSize: i < 3 ? '1rem' : '0.7rem',
                  fontWeight: 700,
                  width: '1.5rem',
                  textAlign: 'center',
                  color: RANK_COLORS[i],
                  flexShrink: 0,
                }}
              >
                {RANK_MEDALS[i]}
              </span>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: '0.8125rem',
                  fontWeight: i === 0 ? 600 : 500,
                  color: 'var(--text-dark)',
                  wordBreak: 'break-word',
                  lineHeight: 1.3,
                }}
                title={h.name}
              >
                {h.name}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: RANK_COLORS[i], flexShrink: 0 }}>
                {h.pct}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
