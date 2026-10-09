import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { calcDailyCompletion, elapsedDays, getDaysInMonth, getChartDayTicks } from '../utils.js';

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: 'var(--bg-white)',
      border: '1px solid var(--border-color)',
      borderRadius: '8px',
      padding: '0.5rem 0.65rem',
      fontSize: '0.75rem',
      boxShadow: 'var(--shadow-md)',
    }}>
      <div style={{ fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.2rem' }}>Day {d.day}</div>
      <div style={{ color: 'var(--accent-strong)' }}>{d.done} / {d.total} habits</div>
      {d.total > 0 && d.done === d.total && (
        <div style={{ color: '#5F9254', fontWeight: 600, marginTop: '0.1rem' }}>✓ Perfect day!</div>
      )}
    </div>
  );
}

export default function DailyCompletionChart({ year, month, habits, completions }) {
  const allData = calcDailyCompletion(year, month, habits, completions);
  const elapsed = elapsedDays(year, month);
  const totalDays = getDaysInMonth(year, month);
  const ticks = getChartDayTicks(totalDays);
  const data = allData.filter(d => d.day <= elapsed);

  return (
    <div className="card" style={{ flex: '1', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
      <div className="card-title">Daily Check-ins</div>
      {data.length === 0 || habits.length === 0 ? (
        <div style={{ flex: 1, minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          No data to display yet.
        </div>
      ) : (
        <div style={{ width: '100%', height: 210 }}>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={data} margin={{ top: 8, right: 8, left: -15, bottom: 0 }} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#E3EFD9" vertical={false} />
            <XAxis
              dataKey="day"
              ticks={ticks}
              interval={0}
              tick={{ fontSize: 9, fill: '#8C9988' }}
              tickLine={false}
              axisLine={{ stroke: '#E3EFD9' }}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#8C9988' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              domain={[0, habits.length || 1]}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(136,183,121,0.08)' }} />
            <Bar dataKey="done" radius={[3, 3, 0, 0]} maxBarSize={24}>
              {data.map(d => (
                <Cell
                  key={d.day}
                  fill={
                    d.total > 0 && d.done === d.total
                      ? '#5F9254'
                      : '#88B779'
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      )}
    </div>
  );
}
