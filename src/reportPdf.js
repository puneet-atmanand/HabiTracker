import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import {
  getDaysInMonth,
  getWeekdayInitial,
  calcDailyCompletion,
  calcMonthlyCompletion,
  calcHabitCompletion,
  calcWeeklyProgress,
  calcCurrentStreak,
  rankHabits,
  elapsedDays,
  formatDateKey,
  MONTH_NAMES,
} from './utils.js';

/**
 * Creates an isolated off-screen wrapper for capturing a page canvas.
 */
function createPageHost() {
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-9999px';
  host.style.top = '0';
  host.style.width = '1122px';
  host.style.height = '793px';
  host.style.zIndex = '-9999';
  host.style.background = '#fbfdfa';
  host.style.margin = '0';
  host.style.padding = '0';
  host.style.boxSizing = 'border-box';
  host.style.overflow = 'visible';
  return host;
}

/**
 * Generates an ultra-clear, executive 2-page landscape A4 PDF report
 * with zero text clipping, crisp vector SVG icons, perfectly isolated pages, and 100% HD polish.
 */
export async function downloadMonthlyReportPDF(
  year,
  month,
  habits,
  completions,
  userName = 'PUNEET ATMANAND ITI'
) {
  const monthName = MONTH_NAMES[month - 1];
  const totalDays = getDaysInMonth(year, month);
  const monthlyPct = calcMonthlyCompletion(year, month, habits, completions);
  const daily = calcDailyCompletion(year, month, habits, completions);
  const elapsed = elapsedDays(year, month);
  const weeks = calcWeeklyProgress(year, month, habits, completions);
  const streak = calcCurrentStreak(habits, completions);
  const ranked = rankHabits(habits, year, month, completions);

  const perfectDays = daily.filter(
    d => d.day <= elapsed && habits.length > 0 && d.done === habits.length
  ).length;

  let totalDone = 0;
  daily.forEach(dd => {
    totalDone += dd.done;
  });
  const maxPossible = habits.length * totalDays;

  const bestDay = daily.reduce(
    (max, cur) => (cur.done > max.done ? cur : max),
    { day: 1, done: 0 }
  );

  const topHabit = ranked.length > 0 ? ranked[0] : null;
  const avgPerDay = elapsed > 0 ? (totalDone / elapsed).toFixed(1) : '0';

  // Dynamic status tag
  let statusBadge = 'ACTIVE TRACKING';
  let statusBg = '#dcfce7';
  let statusColor = '#15803d';

  if (totalDone === 0) {
    statusBadge = 'MONTH INITIALIZED';
    statusBg = '#eff6ff';
    statusColor = '#2563eb';
  } else if (monthlyPct >= 80) {
    statusBadge = 'ELITE CONSISTENCY';
    statusBg = '#dcfce7';
    statusColor = '#166534';
  } else if (monthlyPct >= 50) {
    statusBadge = 'STRONG PROGRESS';
    statusBg = '#f0fdf4';
    statusColor = '#15803d';
  } else {
    statusBadge = 'BUILDING MOMENTUM';
    statusBg = '#fef3c7';
    statusColor = '#b45309';
  }

  // Base font style
  const fontStyle = `font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; -webkit-font-smoothing: antialiased;`;

  // SVG Checkmark icon string (clean, vector crisp, no font clipping possible)
  const svgCheckWhite = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  const svgCheckGreen = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#86efac" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style="display: block;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

  // ─────────────────────────────────────────────────────────────────────────────
  // PAGE 1: EXECUTIVE PERFORMANCE DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────────
  const page1 = document.createElement('div');
  page1.style.cssText = `
    width: 1122px;
    height: 793px;
    padding: 24px 30px;
    box-sizing: border-box;
    background: #fbfdfa;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    ${fontStyle}
    color: #1f2937;
  `;

  page1.innerHTML = `
    <div>
      <!-- Top Header Banner -->
      <div style="background: linear-gradient(135deg, #173615 0%, #255621 55%, #3b7634 100%); border-radius: 12px; padding: 14px 22px; color: #ffffff; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 14px rgba(23,54,21,0.18); margin-bottom: 14px;">
        <div style="display: flex; align-items: center; gap: 14px;">
          <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(255,255,255,0.18); display: flex; align-items: center; justify-content: center; font-size: 22px; line-height: 1;">
            🌿
          </div>
          <div>
            <div style="font-size: 21px; font-weight: 800; letter-spacing: 0.05em; color: #ffffff; line-height: 1.3;">
              ${userName}
            </div>
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #bde5b8; font-weight: 700; line-height: 1.4; margin-top: 2px;">
              Executive Habit Performance Report · ${monthName} ${year}
            </div>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="background: ${statusBg}; color: ${statusColor}; padding: 6px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; letter-spacing: 0.06em; line-height: 1.3;">
            ${statusBadge}
          </div>
          <div style="background: rgba(255,255,255,0.14); padding: 6px 14px; border-radius: 20px; font-size: 11px; color: #eaf5e8; font-weight: 600; line-height: 1.3;">
            ${monthName} 1–${totalDays}, ${year}
          </div>
        </div>
      </div>

      <!-- 4 Hero KPI Cards -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 14px;">
        <!-- Card 1: Monthly Completion -->
        <div style="background: #ffffff; border: 1.5px solid #e1ebe0; border-radius: 12px; padding: 14px 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.03);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 700; color: #536c53; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.4;">Monthly Completion</span>
            <span style="font-size: 14px; line-height: 1;">🎯</span>
          </div>
          <div style="font-size: 30px; font-weight: 800; color: #173615; line-height: 1.3;">
            ${monthlyPct}%
          </div>
          <div style="width: 100%; height: 7px; background: #eaf2e8; border-radius: 4px; margin: 8px 0 6px 0; overflow: hidden;">
            <div style="width: ${monthlyPct}%; height: 100%; background: #3b7634; border-radius: 4px;"></div>
          </div>
          <div style="font-size: 11px; color: #6b826b; font-weight: 600; line-height: 1.4;">
            ${monthlyPct >= 70 ? 'Optimal discipline zone' : 'Active habit progression'}
          </div>
        </div>

        <!-- Card 2: Total Check-ins -->
        <div style="background: #ffffff; border: 1.5px solid #e1ebe0; border-radius: 12px; padding: 14px 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.03);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 700; color: #536c53; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.4;">Total Check-ins</span>
            <span style="font-size: 14px; line-height: 1;">✓</span>
          </div>
          <div style="font-size: 30px; font-weight: 800; color: #173615; line-height: 1.3;">
            ${totalDone} <span style="font-size: 14px; font-weight: 600; color: #7f977f;">/ ${maxPossible}</span>
          </div>
          <div style="width: 100%; height: 7px; background: #eaf2e8; border-radius: 4px; margin: 8px 0 6px 0; overflow: hidden;">
            <div style="width: ${maxPossible > 0 ? Math.round((totalDone / maxPossible) * 100) : 0}%; height: 100%; background: #2563eb; border-radius: 4px;"></div>
          </div>
          <div style="font-size: 11px; color: #6b826b; font-weight: 600; line-height: 1.4;">
            Avg ${avgPerDay} check-ins per day
          </div>
        </div>

        <!-- Card 3: Current Streak -->
        <div style="background: #ffffff; border: 1.5px solid #e1ebe0; border-radius: 12px; padding: 14px 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.03);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 700; color: #536c53; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.4;">Current Streak</span>
            <span style="font-size: 14px; line-height: 1;">🔥</span>
          </div>
          <div style="font-size: 30px; font-weight: 800; color: #b45309; line-height: 1.3;">
            ${streak} <span style="font-size: 14px; font-weight: 600; color: #d97706;">Days</span>
          </div>
          <div style="width: 100%; height: 7px; background: #fef3c7; border-radius: 4px; margin: 8px 0 6px 0; overflow: hidden;">
            <div style="width: ${Math.min(100, streak * 10)}%; height: 100%; background: #f59e0b; border-radius: 4px;"></div>
          </div>
          <div style="font-size: 11px; color: #92400e; font-weight: 600; line-height: 1.4;">
            ${streak > 0 ? 'Consecutive unbroken days' : 'Start today to ignite streak'}
          </div>
        </div>

        <!-- Card 4: Perfect Days -->
        <div style="background: #ffffff; border: 1.5px solid #e1ebe0; border-radius: 12px; padding: 14px 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.03);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 700; color: #536c53; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.4;">Perfect Days</span>
            <span style="font-size: 14px; line-height: 1;">⭐</span>
          </div>
          <div style="font-size: 30px; font-weight: 800; color: #4338ca; line-height: 1.3;">
            ${perfectDays} <span style="font-size: 14px; font-weight: 600; color: #6366f1;">Days</span>
          </div>
          <div style="width: 100%; height: 7px; background: #e0e7ff; border-radius: 4px; margin: 8px 0 6px 0; overflow: hidden;">
            <div style="width: ${totalDays > 0 ? Math.round((perfectDays / totalDays) * 100) : 0}%; height: 100%; background: #6366f1; border-radius: 4px;"></div>
          </div>
          <div style="font-size: 11px; color: #4338ca; font-weight: 600; line-height: 1.4;">
            100% habit completion achieved
          </div>
        </div>
      </div>

      <!-- Middle Two Columns: Weekly Breakdown & Top Habits Leaderboard -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px;">
        <!-- Left: Weekly Performance Trajectory -->
        <div style="background: #ffffff; border: 1.5px solid #e1ebe0; border-radius: 12px; padding: 16px 18px; box-shadow: 0 1px 4px rgba(0,0,0,0.03);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1.5px solid #f0f4ef; padding-bottom: 8px;">
            <span style="font-size: 12px; font-weight: 800; color: #173615; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.3;">
              📅 Weekly Performance Trajectory
            </span>
            <span style="font-size: 11px; color: #687f67; font-weight: 700; line-height: 1.3;">5-Week Cycle</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${weeks
              .map(
                w => `
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; line-height: 1.4;">
                  <span style="font-weight: 700; color: #21431e;">Week ${w.week} <span style="color: #7b947a; font-weight: 500; font-size: 11px;">(Days ${w.start}–${w.end})</span></span>
                  <span style="font-weight: 800; color: #173615;">${w.pct}% <span style="font-weight: 500; color: #7b947a; font-size: 11px;">(${w.done}/${w.possible})</span></span>
                </div>
                <div style="width: 100%; height: 8px; background: #eaf1e8; border-radius: 4px; overflow: hidden;">
                  <div style="width: ${w.pct}%; height: 100%; background: linear-gradient(90deg, #46843e 0%, #295b22 100%); border-radius: 4px;"></div>
                </div>
              </div>
            `
              )
              .join('')}
          </div>
        </div>

        <!-- Right: Habit Consistency Rankings (No text clipping, no overflow hidden) -->
        <div style="background: #ffffff; border: 1.5px solid #e1ebe0; border-radius: 12px; padding: 16px 18px; box-shadow: 0 1px 4px rgba(0,0,0,0.03);">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; border-bottom: 1.5px solid #f0f4ef; padding-bottom: 8px;">
            <span style="font-size: 12px; font-weight: 800; color: #173615; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.3;">
              🏆 Habit Consistency Rankings
            </span>
            <span style="font-size: 11px; color: #687f67; font-weight: 700; line-height: 1.3;">Top Performers</span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${ranked
              .slice(0, 5)
              .map((h, i) => {
                const rankLabels = ['#1', '#2', '#3', '#4', '#5'];
                const badgeBgs = ['#fef3c7', '#f1f5f9', '#fed7aa', '#eaf2e8', '#eaf2e8'];
                const badgeColors = ['#92400e', '#334155', '#9a3412', '#23521f', '#23521f'];

                return `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 6px 12px; background: #fbfdfa; border-radius: 8px; border: 1px solid #eef4ec; min-height: 38px; box-sizing: border-box;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="width: 24px; height: 24px; border-radius: 6px; background: ${badgeBgs[i]}; color: ${badgeColors[i]}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; line-height: 1;">
                      ${rankLabels[i]}
                    </div>
                    <div style="font-size: 13px; font-weight: 700; color: #173615; line-height: 1.4; padding: 2px 0;">
                      ${h.name}
                    </div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 70px; height: 7px; background: #eaf1e8; border-radius: 4px; overflow: hidden;">
                      <div style="width: ${h.pct}%; height: 100%; background: #3b7634; border-radius: 4px;"></div>
                    </div>
                    <span style="font-size: 13px; font-weight: 800; color: #23521f; width: 36px; text-align: right; line-height: 1.3;">
                      ${h.pct}%
                    </span>
                  </div>
                </div>
              `;
              })
              .join('')}
          </div>
        </div>
      </div>

      <!-- Bottom Row: 3 Executive Takeaway Cards (Generous line-height, no text clipping) -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;">
        <div style="background: #ffffff; border: 1.5px solid #e1ebe0; border-radius: 12px; padding: 14px 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.03);">
          <div style="font-size: 11px; font-weight: 700; color: #536c53; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; line-height: 1.3;">
            🌟 Peak Execution Output
          </div>
          <div style="font-size: 15px; font-weight: 800; color: #173615; line-height: 1.4; padding: 2px 0;">
            ${bestDay.done > 0 ? `Day ${bestDay.day} · ${bestDay.done} Habits Complete` : 'Tracking In Progress'}
          </div>
          <div style="font-size: 11px; color: #6b826b; margin-top: 3px; line-height: 1.4; font-weight: 500;">
            ${bestDay.done > 0 ? 'Highest single-day completion output' : 'Daily records updated in real time'}
          </div>
        </div>

        <div style="background: #ffffff; border: 1.5px solid #e1ebe0; border-radius: 12px; padding: 14px 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.03);">
          <div style="font-size: 11px; font-weight: 700; color: #536c53; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; line-height: 1.3;">
            👑 Leading Habit Champion
          </div>
          <div style="font-size: 15px; font-weight: 800; color: #173615; line-height: 1.4; padding: 2px 0;">
            ${topHabit ? `${topHabit.name} (${topHabit.pct}%)` : 'Habits Initialized'}
          </div>
          <div style="font-size: 11px; color: #6b826b; margin-top: 3px; line-height: 1.4; font-weight: 500;">
            Leading execution consistency this cycle
          </div>
        </div>

        <div style="background: #ffffff; border: 1.5px solid #e1ebe0; border-radius: 12px; padding: 14px 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.03);">
          <div style="font-size: 11px; font-weight: 700; color: #536c53; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; line-height: 1.3;">
            ⚡ Discipline Score
          </div>
          <div style="font-size: 15px; font-weight: 800; color: #173615; line-height: 1.4; padding: 2px 0;">
            ${perfectDays} Perfect Days · ${monthlyPct}% Total Rate
          </div>
          <div style="font-size: 11px; color: #6b826b; margin-top: 3px; line-height: 1.4; font-weight: 500;">
            Discipline index across ${totalDays} calendar days
          </div>
        </div>
      </div>
    </div>

    <!-- Page 1 Footer -->
    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1.5px solid #e1ebe0; font-size: 11px; color: #687f67; font-weight: 600; line-height: 1.4;">
      <span>Mint Habit Tracker · Performance Intelligence System</span>
      <span>Confidential Personal Record · ${userName}</span>
      <span>Page 1 of 2</span>
    </div>
  `;

  // ─────────────────────────────────────────────────────────────────────────────
  // PAGE 2: FULL DAILY HABIT EXECUTION MATRIX
  // ─────────────────────────────────────────────────────────────────────────────
  const page2 = document.createElement('div');
  page2.style.cssText = `
    width: 1122px;
    height: 793px;
    padding: 24px 30px;
    box-sizing: border-box;
    background: #fbfdfa;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    ${fontStyle}
    color: #1f2937;
  `;

  // Build matrix days headers
  let dayHeadersHtml = '';
  for (let d = 1; d <= totalDays; d++) {
    const weekday = getWeekdayInitial(year, month, d);
    const isWeekend = weekday === 'S';

    dayHeadersHtml += `
      <th style="padding: 5px 1px; text-align: center; border-left: 1px solid #e2ebe0; background: ${isWeekend ? '#f1f7ef' : '#f8faf7'};">
        <div style="font-size: 9px; color: ${isWeekend ? '#b45309' : '#64748b'}; font-weight: 700; line-height: 1.2;">${weekday}</div>
        <div style="font-size: 10px; color: #1e293b; font-weight: 800; line-height: 1.3;">${d}</div>
      </th>
    `;
  }

  // Calculate row height dynamically
  const habitRowHeight = Math.max(30, Math.min(38, Math.floor(320 / Math.max(habits.length, 1))));

  // Build habit rows (Zero text clipping, vector checkmarks)
  let habitRowsHtml = '';
  habits.forEach((h, hIdx) => {
    let habitDoneCount = 0;
    let dayCellsHtml = '';

    for (let d = 1; d <= totalDays; d++) {
      const key = formatDateKey(year, month, d);
      const isDone = !!completions[`${h.id}::${key}`];
      if (isDone) habitDoneCount++;

      dayCellsHtml += `
        <td style="padding: 2px 1px; text-align: center; border-left: 1px solid #edf2ec; vertical-align: middle;">
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 19px; height: 19px; border-radius: 4px; background: ${
            isDone ? '#2e6926' : '#f3f6f2'
          };">
            ${
              isDone
                ? svgCheckWhite
                : `<div style="width: 4px; height: 4px; border-radius: 50%; background: #94a3b8;"></div>`
            }
          </div>
        </td>
      `;
    }

    const hPct = totalDays > 0 ? Math.round((habitDoneCount / totalDays) * 100) : 0;
    const isEven = hIdx % 2 === 0;

    habitRowsHtml += `
      <tr style="border-bottom: 1px solid #e8ede7; background: ${isEven ? '#ffffff' : '#f9fcf8'}; height: ${habitRowHeight}px;">
        <td style="padding: 4px 12px; font-size: 12px; font-weight: 700; color: #173615; line-height: 1.4; width: 190px;">
          ${h.name}
        </td>
        ${dayCellsHtml}
        <td style="padding: 4px 4px; text-align: center; font-size: 11px; font-weight: 800; color: #173615; border-left: 1.5px solid #dbe5da; line-height: 1.4;">
          ${habitDoneCount}
        </td>
        <td style="padding: 4px 8px; text-align: right; font-size: 11px; font-weight: 800; color: #23521f; border-left: 1px solid #dbe5da; line-height: 1.4;">
          ${hPct}%
        </td>
      </tr>
    `;
  });

  // Build daily totals row
  let dailyTotalsHtml = '';
  for (let d = 1; d <= totalDays; d++) {
    const dd = daily[d - 1];
    const doneForDay = dd ? dd.done : 0;
    const isPerfect = habits.length > 0 && doneForDay === habits.length;

    dailyTotalsHtml += `
      <td style="padding: 5px 1px; text-align: center; border-left: 1px solid #d6e2d4; font-size: 10px; font-weight: 800; line-height: 1.3; background: ${
        isPerfect ? '#dcfce7' : doneForDay > 0 ? '#e8f3e6' : '#f0f5ee'
      }; color: ${isPerfect ? '#166534' : doneForDay > 0 ? '#1f481c' : '#788f76'};">
        ${doneForDay}
      </td>
    `;
  }

  page2.innerHTML = `
    <div>
      <!-- Top Header Banner -->
      <div style="background: linear-gradient(135deg, #173615 0%, #255621 55%, #3b7634 100%); border-radius: 12px; padding: 14px 22px; color: #ffffff; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 14px rgba(23,54,21,0.18); margin-bottom: 14px;">
        <div>
          <div style="font-size: 20px; font-weight: 800; letter-spacing: 0.05em; color: #ffffff; line-height: 1.3;">
            ${userName} · DAILY HABIT EXECUTION MATRIX
          </div>
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #bde5b8; font-weight: 700; line-height: 1.4; margin-top: 2px;">
            Full Accountability Log · ${monthName} ${year} · ${totalDays} Days Tracked
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="background: rgba(255,255,255,0.16); padding: 6px 14px; border-radius: 20px; font-size: 11px; color: #ffffff; display: flex; align-items: center; gap: 6px; font-weight: 700; line-height: 1.3;">
            ${svgCheckGreen}
            <span>Completed</span>
          </div>
          <div style="background: rgba(255,255,255,0.16); padding: 6px 14px; border-radius: 20px; font-size: 11px; color: #ffffff; display: flex; align-items: center; gap: 6px; font-weight: 700; line-height: 1.3;">
            <div style="width: 5px; height: 5px; border-radius: 50%; background: #cbd5e1;"></div>
            <span>Missed</span>
          </div>
        </div>
      </div>

      <!-- Matrix Table Box -->
      <div style="background: #ffffff; border: 1.5px solid #dbe5da; border-radius: 12px; padding: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.03); margin-bottom: 14px;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f1f6f0; border-bottom: 1.5px solid #dbe5da;">
              <th style="padding: 8px 12px; text-align: left; font-size: 11px; font-weight: 800; color: #173615; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.3; width: 190px;">
                Habits (${habits.length})
              </th>
              ${dayHeadersHtml}
              <th style="padding: 8px 4px; text-align: center; font-size: 10px; font-weight: 800; color: #173615; border-left: 1.5px solid #dbe5da; text-transform: uppercase; line-height: 1.3; width: 44px;">
                Done
              </th>
              <th style="padding: 8px 8px; text-align: right; font-size: 10px; font-weight: 800; color: #173615; border-left: 1px solid #dbe5da; text-transform: uppercase; line-height: 1.3; width: 48px;">
                Rate
              </th>
            </tr>
          </thead>
          <tbody>
            ${habitRowsHtml}
            <!-- Daily Totals Row -->
            <tr style="border-top: 2px solid #b8ceb5; background: #eaf3e8; height: 34px;">
              <td style="padding: 6px 12px; font-size: 11px; font-weight: 800; color: #173615; text-transform: uppercase; letter-spacing: 0.04em; line-height: 1.3;">
                Daily Check-ins
              </td>
              ${dailyTotalsHtml}
              <td style="padding: 6px 4px; text-align: center; font-size: 11px; font-weight: 800; color: #173615; border-left: 1.5px solid #d6e2d4; line-height: 1.3;">
                ${totalDone}
              </td>
              <td style="padding: 6px 8px; text-align: right; font-size: 11px; font-weight: 800; color: #173615; border-left: 1px solid #d6e2d4; line-height: 1.3;">
                ${monthlyPct}%
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Month Summary Key Takeaways (3 Insight Cards) -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;">
        <div style="background: #ffffff; border: 1.5px solid #e1ebe0; border-radius: 12px; padding: 14px 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.03);">
          <div style="font-size: 11px; font-weight: 700; color: #536c53; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; line-height: 1.3;">
            📊 Total Repetitions Completed
          </div>
          <div style="font-size: 15px; font-weight: 800; color: #173615; line-height: 1.4; padding: 2px 0;">
            ${totalDone} of ${maxPossible} Possible Check-ins
          </div>
          <div style="font-size: 11px; color: #6b826b; margin-top: 3px; line-height: 1.4; font-weight: 500;">
            Across ${habits.length} daily habits throughout ${monthName}
          </div>
        </div>

        <div style="background: #ffffff; border: 1.5px solid #e1ebe0; border-radius: 12px; padding: 14px 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.03);">
          <div style="font-size: 11px; font-weight: 700; color: #536c53; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; line-height: 1.3;">
            📅 Calendar Coverage
          </div>
          <div style="font-size: 15px; font-weight: 800; color: #173615; line-height: 1.4; padding: 2px 0;">
            ${monthName} 1 – ${totalDays}, ${year} (${totalDays} Days)
          </div>
          <div style="font-size: 11px; color: #6b826b; margin-top: 3px; line-height: 1.4; font-weight: 500;">
            Comprehensive 31-day execution audit
          </div>
        </div>

        <div style="background: #ffffff; border: 1.5px solid #e1ebe0; border-radius: 12px; padding: 14px 16px; box-shadow: 0 1px 4px rgba(0,0,0,0.03);">
          <div style="font-size: 11px; font-weight: 700; color: #536c53; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 4px; line-height: 1.3;">
            ⚡ Consistency Principle
          </div>
          <div style="font-size: 15px; font-weight: 800; color: #173615; line-height: 1.4; padding: 2px 0;">
            Excellence is a Continuous Habit
          </div>
          <div style="font-size: 11px; color: #6b826b; margin-top: 3px; line-height: 1.4; font-weight: 500;">
            Accountability ledger maintained for ${userName}
          </div>
        </div>
      </div>
    </div>

    <!-- Page 2 Footer -->
    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1.5px solid #e1ebe0; font-size: 11px; color: #687f67; font-weight: 600; line-height: 1.4;">
      <span>Mint Habit Tracker · Accountability & Execution Record</span>
      <span>${userName} · Consistency is the DNA of mastery.</span>
      <span>Page 2 of 2</span>
    </div>
  `;

  // Wait for fonts to be ready
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER CANVASES AT ULTRA-HD RESOLUTION (scale: 2.5) WITH ISOLATED HOSTS
  // ─────────────────────────────────────────────────────────────────────────────
  const host1 = createPageHost();
  host1.appendChild(page1);
  document.body.appendChild(host1);

  let canvas1;
  try {
    canvas1 = await html2canvas(page1, {
      scale: 2.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#fbfdfa',
      width: 1122,
      height: 793,
      windowWidth: 1122,
      windowHeight: 793,
    });
  } finally {
    if (host1.parentNode) {
      host1.parentNode.removeChild(host1);
    }
  }

  const host2 = createPageHost();
  host2.appendChild(page2);
  document.body.appendChild(host2);

  let canvas2;
  try {
    canvas2 = await html2canvas(page2, {
      scale: 2.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#fbfdfa',
      width: 1122,
      height: 793,
      windowWidth: 1122,
      windowHeight: 793,
    });
  } finally {
    if (host2.parentNode) {
      host2.parentNode.removeChild(host2);
    }
  }

  // Build landscape A4 PDF (297mm x 210mm)
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const imgData1 = canvas1.toDataURL('image/jpeg', 0.98);
  pdf.addImage(imgData1, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');

  pdf.addPage('a4', 'landscape');
  const imgData2 = canvas2.toDataURL('image/jpeg', 0.98);
  pdf.addImage(imgData2, 'JPEG', 0, 0, 297, 210, undefined, 'FAST');

  const fileName = `${userName.replace(/\s+/g, '_')}_${monthName}_${year}_Monthly_Report.pdf`;
  pdf.save(fileName);
  return true;
}
