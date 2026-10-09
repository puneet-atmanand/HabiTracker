import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { calcMonthlyCompletion, elapsedDays, getDaysInMonth } from '../utils.js';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export default function CompletionDonut({ year, month, habits, completions }) {
  const pct = calcMonthlyCompletion(year, month, habits, completions);
  const remaining = 100 - pct;
  const elapsed = elapsedDays(year, month);
  const totalDays = getDaysInMonth(year, month);

  const data = [
    { name: 'Completed', value: pct },
    { name: 'Remaining', value: remaining === 0 && pct === 0 ? 100 : remaining },
  ];

  const isEmpty = pct === 0;

  return (
    <div
      className="card"
      style={{ minWidth: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      <div className="card-title" style={{ alignSelf: 'flex-start' }}>Monthly Completion</div>
      <div style={{ position: 'relative', width: 140, height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={46}
              outerRadius={62}
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              strokeWidth={0}
            >
              <Cell fill={isEmpty ? '#E3EFD9' : '#5F9254'} />
              <Cell fill="#E3EFD9" />
            </Pie>
            <Tooltip
              formatter={(v, n) => [`${v}%`, n]}
              contentStyle={{ fontSize: '0.7rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-dark)', lineHeight: 1 }}>
            {pct}%
          </span>
          <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            done
          </span>
        </div>
      </div>
      <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dark)' }}>
          {MONTHS[month - 1]} {year}
        </div>
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
          {elapsed} / {totalDays} days tracked
        </div>
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.6rem' }}>
        <LegendItem color="#5F9254" label="Completed" />
        <LegendItem color="#E3EFD9" label="Remaining" />
      </div>
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
      {label}
    </div>
  );
}
