import { CheckSquare, Calendar, Target, TrendingUp } from 'lucide-react';
import { calcMonthlyCompletion, calcDailyCompletion, elapsedDays, getDaysInMonth, calcCurrentStreak } from '../utils.js';

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div
      className="card stat-card"
      style={{ padding: '0.85rem 1rem' }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
        <div
          style={{
            width: '2rem',
            height: '2rem',
            borderRadius: '8px',
            background: color || 'var(--bg-light)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-strong)',
          }}
        >
          <Icon size={15} />
        </div>
      </div>
      <div style={{ fontSize: '1.45rem', fontWeight: 800, color: 'var(--text-dark)', lineHeight: 1.15 }}>
        {value}
      </div>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dark)', marginTop: '0.15rem' }}>
        {label}
      </div>
      {sub && (
        <div style={{ fontSize: '0.675rem', color: 'var(--text-muted)', marginTop: '0.15rem', lineHeight: 1.25 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export default function SummaryCards({ year, month, habits, completions }) {
  const monthlyPct = calcMonthlyCompletion(year, month, habits, completions);
  const daily = calcDailyCompletion(year, month, habits, completions);
  const elapsed = elapsedDays(year, month);
  const totalDays = getDaysInMonth(year, month);

  // Perfect days = days where all habits completed (only elapsed days)
  const perfectDays = elapsed === 0 || habits.length === 0 ? 0 :
    daily.filter(d => d.day <= elapsed && habits.length > 0 && d.done === habits.length).length;

  // Total check-ins done so far (count all completed entries in the month)
  let totalDone = 0;
  daily.forEach(dd => { totalDone += dd.done; });

  // Maximum possible check-ins for the whole month
  const maxPossible = habits.length * totalDays;

  // Current streak (seamless across months)
  const streak = calcCurrentStreak(habits, completions);

  return (
    <div className="summary-cards-grid">
      <StatCard
        icon={Target}
        label="Monthly Completion"
        value={`${monthlyPct}%`}
        sub={`${totalDays} days in month`}
        color="var(--bg-light)"
      />
      <StatCard
        icon={CheckSquare}
        label="Total Check-ins"
        value={`${totalDone} / ${maxPossible}`}
        sub={`${habits.length} habits × ${totalDays} days`}
        color="var(--bg-light)"
      />
      <StatCard
        icon={Calendar}
        label="Perfect Days"
        value={perfectDays}
        sub="All habits completed"
        color="var(--bg-light)"
      />
      <StatCard
        icon={TrendingUp}
        label="Current Streak"
        value={`${streak}d`}
        sub="Consecutive perfect days"
        color="var(--bg-light)"
      />
    </div>
  );
}
