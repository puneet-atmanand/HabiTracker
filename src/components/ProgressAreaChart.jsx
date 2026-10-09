import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { calcDailyCompletion, elapsedDays, getDaysInMonth, getChartDayTicks } from '../utils.js';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: 'var(--bg-white)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '0.6rem 0.75rem',
      fontSize: '0.75rem',
      boxShadow: 'var(--shadow-md)',
    }}>
      <div style={{ fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.25rem' }}>
        Day {d.day}
      </div>
      <div style={{ color: 'var(--accent-strong)', fontWeight: 600 }}>{d.pct}% complete</div>
      <div style={{ color: 'var(--text-muted)' }}>{d.done} / {d.total} habits</div>
    </div>
  );
}

export default function ProgressAreaChart({ year, month, habits, completions }) {
  const data = calcDailyCompletion(year, month, habits, completions);
  const elapsed = elapsedDays(year, month);
  const totalDays = getDaysInMonth(year, month);
  const ticks = getChartDayTicks(totalDays);

  // Only show bars up to elapsed days; future days are shown as null
  const chartData = data.map(d => ({
    ...d,
    pct: d.day <= elapsed ? d.pct : null,
  }));

  return (
    <div className="card" style={{ flex: '1', minWidth: 0 }}>
      <div className="card-title">Progress Over Time</div>
      <div style={{ width: '100%', height: 190 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 8, right: 10, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#88B779" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#88B779" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E3EFD9" vertical={false} />
          <XAxis
            dataKey="day"
            ticks={ticks}
            interval={0}
            tick={{ fontSize: 10, fill: '#8C9988' }}
            tickLine={false}
            axisLine={{ stroke: '#E3EFD9' }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#8C9988' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${v}%`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="pct"
            stroke="#5F9254"
            strokeWidth={2}
            fill="url(#greenGrad)"
            dot={false}
            activeDot={{ r: 4, fill: '#5F9254', strokeWidth: 0 }}
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      </div>
      {habits.length === 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
          Add habits to see your progress chart.
        </p>
      )}
    </div>
  );
}
