// ─── Date Helpers ────────────────────────────────────────────────────────────

export function getDaysInMonth(year, month) {
  // month is 1-indexed
  return new Date(year, month, 0).getDate();
}

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function getWeekdayInitial(year, month, day) {
  const d = new Date(year, month - 1, day);
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()];
}

export function formatDateKey(year, month, day) {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export function parseYMD(key) {
  const [y, m, d] = key.split('-').map(Number);
  return { year: y, month: m, day: d };
}

export function todayYMD() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

export function isToday(year, month, day) {
  const t = todayYMD();
  return t.year === year && t.month === month && t.day === day;
}

export function isFutureMonth(year, month) {
  const t = todayYMD();
  return year > t.year || (year === t.year && month > t.month);
}

export function isCurrentMonth(year, month) {
  const t = todayYMD();
  return year === t.year && month === t.month;
}

// Returns the number of calendar days to use for progress calculations.
// Future months → 0. Current and past months → full days in month.
export function elapsedDays(year, month) {
  const total = getDaysInMonth(year, month);
  if (isFutureMonth(year, month)) return 0;
  return total; // full month for both current and past months
}

// Generates balanced X-axis tick labels for charts.
// Always starts at Day 1 and pins the exact final day of the month (28, 29, 30, or 31).
export function getChartDayTicks(totalDays) {
  const ticks = [1, 6, 11, 16, 21];
  if (totalDays >= 28) {
    if (totalDays - 26 >= 3) {
      ticks.push(26);
    }
    ticks.push(totalDays);
  } else {
    ticks.push(totalDays);
  }
  return ticks;
}

// ─── Calculation Helpers ─────────────────────────────────────────────────────

export function calcDailyCompletion(year, month, habits, completions) {
  const days = getDaysInMonth(year, month);
  const total = habits.length;
  return Array.from({ length: days }, (_, i) => {
    const day = i + 1;
    const key = formatDateKey(year, month, day);
    const done = total === 0 ? 0 : habits.filter(h => completions[`${h.id}::${key}`]).length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    return { day, done, total, pct, dateKey: key };
  });
}

export function calcMonthlyCompletion(year, month, habits, completions) {
  const totalDays = getDaysInMonth(year, month);
  if (isFutureMonth(year, month) || habits.length === 0) return 0;
  const possible = habits.length * totalDays;
  let done = 0;
  for (let d = 1; d <= totalDays; d++) {
    const key = formatDateKey(year, month, d);
    habits.forEach(h => {
      if (completions[`${h.id}::${key}`]) done++;
    });
  }
  return Math.round((done / possible) * 100);
}

export function calcHabitCompletion(habitId, year, month, completions) {
  const days = elapsedDays(year, month);
  if (days === 0) return 0;
  let done = 0;
  for (let d = 1; d <= days; d++) {
    const key = formatDateKey(year, month, d);
    if (completions[`${habitId}::${key}`]) done++;
  }
  return Math.round((done / days) * 100);
}

export function calcWeeklyProgress(year, month, habits, completions) {
  const total = getDaysInMonth(year, month);
  const weeks = [];
  const weekDefs = [
    { start: 1, end: 7 },
    { start: 8, end: 14 },
    { start: 15, end: 21 },
    { start: 22, end: 28 },
    { start: 29, end: total },
  ];
  weekDefs.forEach((w, i) => {
    if (w.start > total) return;
    const end = Math.min(w.end, total);
    if (end < w.start) return;
    let done = 0;
    let possible = 0;
    for (let d = w.start; d <= end; d++) {
      const key = formatDateKey(year, month, d);
      habits.forEach(h => {
        const elapsed = elapsedDays(year, month);
        if (d <= elapsed) {
          possible++;
          if (completions[`${h.id}::${key}`]) done++;
        }
      });
    }
    const pct = possible === 0 ? 0 : Math.round((done / possible) * 100);
    weeks.push({ week: i + 1, start: w.start, end, done, possible, pct });
  });
  return weeks;
}

export function rankHabits(habits, year, month, completions) {
  return habits
    .map(h => ({
      ...h,
      pct: calcHabitCompletion(h.id, year, month, completions),
    }))
    .sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name));
}

// Counts consecutive perfect days (all habits completed).
// Seamlessly traverses backwards across calendar month and year boundaries.
// If today is complete, counts today + past consecutive days.
// If today is in progress, preserves active streak from yesterday until today ends.
export function calcCurrentStreak(habits, completions) {
  if (!habits || habits.length === 0) return 0;

  const now = new Date();
  let check = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const todayKey = formatDateKey(check.getFullYear(), check.getMonth() + 1, check.getDate());
  const todayDone = habits.filter(h => completions[`${h.id}::${todayKey}`]).length;
  const todayPerfect = todayDone === habits.length;

  let streak = 0;
  let maxDays = 3650; // Guard up to 10 years

  if (todayPerfect) {
    streak = 1;
    check.setDate(check.getDate() - 1);
    while (maxDays-- > 0) {
      const key = formatDateKey(check.getFullYear(), check.getMonth() + 1, check.getDate());
      const done = habits.filter(h => completions[`${h.id}::${key}`]).length;
      if (done === habits.length) {
        streak++;
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }
  } else {
    // Today not yet finished; check if yesterday was perfect to maintain the streak
    check.setDate(check.getDate() - 1);
    while (maxDays-- > 0) {
      const key = formatDateKey(check.getFullYear(), check.getMonth() + 1, check.getDate());
      const done = habits.filter(h => completions[`${h.id}::${key}`]).length;
      if (done === habits.length) {
        streak++;
        check.setDate(check.getDate() - 1);
      } else {
        break;
      }
    }
  }

  return streak;
}

// ─── Storage ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'mint-habit-tracker-v1';

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || !Array.isArray(parsed.habits)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function generateId() {
  return `h_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export const INITIAL_HABITS = [
  'UPSC study',
  'Read newspaper',
  'Revise notes',
  'Exercise',
  'Meditation',
  'Read a book',
  'Drink enough water',
  'Sleep on time',
].map(name => ({ id: generateId(), name }));

export function buildDefaultData() {
  return { version: 1, habits: INITIAL_HABITS, completions: {} };
}

// ─── Backup Validation ────────────────────────────────────────────────────────

export function validateBackup(obj) {
  if (typeof obj !== 'object' || obj === null) return 'Not a valid JSON object.';
  if (!Array.isArray(obj.habits)) return 'Missing or invalid "habits" array.';
  for (const h of obj.habits) {
    if (typeof h.id !== 'string' || typeof h.name !== 'string') {
      return 'Each habit must have string "id" and "name" fields.';
    }
  }
  if (obj.completions !== undefined && typeof obj.completions !== 'object') {
    return '"completions" must be an object.';
  }
  return null; // valid
}

// ─── Monthly Report Export ───────────────────────────────────────────────────

export const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

export function generateMonthlyReportCSV(year, month, habits, completions, userName = 'PUNEET ATMANAND ITI') {
  const monthName = MONTH_NAMES[month - 1];
  const totalDays = getDaysInMonth(year, month);
  const monthlyPct = calcMonthlyCompletion(year, month, habits, completions);
  const daily = calcDailyCompletion(year, month, habits, completions);
  const elapsed = elapsedDays(year, month);
  const weeks = calcWeeklyProgress(year, month, habits, completions);
  const streak = calcCurrentStreak(habits, completions);
  const perfectDays = daily.filter(d => d.day <= elapsed && habits.length > 0 && d.done === habits.length).length;
  let totalDone = 0;
  daily.forEach(dd => { totalDone += dd.done; });
  const maxPossible = habits.length * totalDays;

  const rows = [];
  rows.push([`"${userName} - MONTHLY HABIT REPORT"`]);
  rows.push([`"Month:"`, `"${monthName} ${year}"`]);
  rows.push([`"Generated on:"`, `"${new Date().toLocaleDateString()}"`]);
  rows.push([]);
  rows.push([`"SUMMARY METRICS"`]);
  rows.push([`"Monthly Completion"`, `"${monthlyPct}%"`]);
  rows.push([`"Total Check-ins"`, `"${totalDone} / ${maxPossible}"`]);
  rows.push([`"Perfect Days"`, `"${perfectDays} days"`]);
  rows.push([`"Current Streak"`, `"${streak} days"`]);
  rows.push([]);

  // Daily Habit Matrix Table
  rows.push([`"DAILY HABIT MATRIX"`]);
  const headerRow = ['"Habit"'];
  for (let d = 1; d <= totalDays; d++) {
    headerRow.push(`"Day ${d}"`);
  }
  headerRow.push('"Completed"', '"Total Days"', '"Completion %"');
  rows.push(headerRow);

  habits.forEach(h => {
    const habitRow = [`"${h.name}"`];
    let habitDone = 0;
    for (let d = 1; d <= totalDays; d++) {
      const key = formatDateKey(year, month, d);
      const isDone = !!completions[`${h.id}::${key}`];
      if (isDone) habitDone++;
      habitRow.push(isDone ? '"✓"' : '"-"');
    }
    const habitPct = totalDays > 0 ? Math.round((habitDone / totalDays) * 100) : 0;
    habitRow.push(habitDone, totalDays, `"${habitPct}%"`);
    rows.push(habitRow);
  });

  // Daily totals row
  const dailyTotalRow = ['"Daily Total"'];
  for (let d = 1; d <= totalDays; d++) {
    const dd = daily[d - 1];
    dailyTotalRow.push(dd ? dd.done : 0);
  }
  dailyTotalRow.push(totalDone, maxPossible, `"${monthlyPct}%"`);
  rows.push(dailyTotalRow);
  rows.push([]);

  // Weekly Progress
  rows.push([`"WEEKLY PROGRESS"`]);
  rows.push(['"Week"', '"Period"', '"Check-ins"', '"Target"', '"Completion %"']);
  weeks.forEach(w => {
    rows.push([`"Week ${w.week}"`, `"Days ${w.start}-${w.end}"`, w.done, w.possible, `"${w.pct}%"`]);
  });

  return '\uFEFF' + rows.map(r => r.join(',')).join('\r\n');
}

export function downloadMonthlyReport(year, month, habits, completions, userName = 'PUNEET ATMANAND ITI') {
  const csv = generateMonthlyReportCSV(year, month, habits, completions, userName);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const monthName = MONTH_NAMES[month - 1];
  a.href = url;
  a.download = `${userName.replace(/\s+/g, '_')}_${monthName}_${year}_Habit_Report.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
