import { useState, useRef, useCallback, useEffect } from 'react';
import Header from './components/Header.jsx';
import MonthYearSelector from './components/MonthYearSelector.jsx';
import SummaryCards from './components/SummaryCards.jsx';
import ProgressAreaChart from './components/ProgressAreaChart.jsx';
import CompletionDonut from './components/CompletionDonut.jsx';
import HabitMatrix from './components/HabitMatrix.jsx';
import HabitProgressList from './components/HabitProgressList.jsx';
import DailyCompletionChart from './components/DailyCompletionChart.jsx';
import WeeklyProgress from './components/WeeklyProgress.jsx';
import TopHabits from './components/TopHabits.jsx';
import BackupControls from './components/BackupControls.jsx';
import ToastContainer, { useToast } from './components/Toast.jsx';
import {
  loadData,
  saveData,
  buildDefaultData,
  generateId,
  todayYMD,
} from './utils.js';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ─── Storage availability check ───────────────────────────────────────────────
function isStorageAvailable() {
  try {
    localStorage.setItem('__test__', '1');
    localStorage.removeItem('__test__');
    return true;
  } catch {
    return false;
  }
}

export default function App() {
  const { toasts, addToast } = useToast();
  const fileInputRef = useRef(null);
  const storageOk = isStorageAvailable();

  // ── Initial Data ────────────────────────────────────────────────────────────
  const [appData, setAppData] = useState(() => {
    const saved = loadData();
    return saved || buildDefaultData();
  });

  // ── Month / Year State ──────────────────────────────────────────────────────
  const today = todayYMD();
  const [year, setYear] = useState(today.year);
  const [month, setMonth] = useState(today.month);

  const { habits, completions } = appData;
  const [rowHeights, setRowHeights] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // ── Persist on change ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!storageOk) return;
    const ok = saveData(appData);
    if (!ok) addToast('error', 'Could not save to localStorage. Storage may be full.');
  }, [appData]);

  // ── Month Navigation ────────────────────────────────────────────────────────
  function handleMonthYear(y, m) {
    setYear(y);
    setMonth(m);
  }

  // ── Toggle Completion ───────────────────────────────────────────────────────
  const handleToggle = useCallback((habitId, dateKey) => {
    const ck = `${habitId}::${dateKey}`;
    setAppData(prev => {
      const newComp = { ...prev.completions };
      if (newComp[ck]) delete newComp[ck];
      else newComp[ck] = true;
      return { ...prev, completions: newComp };
    });
  }, []);

  // ── Add Habit ───────────────────────────────────────────────────────────────
  const handleAddHabit = useCallback((name) => {
    const newHabit = { id: generateId(), name };
    setAppData(prev => ({ ...prev, habits: [...prev.habits, newHabit] }));
    addToast('success', `Habit "${name}" added!`);
  }, []);

  // ── Edit Habit ──────────────────────────────────────────────────────────────
  const handleEditHabit = useCallback((id, newName) => {
    setAppData(prev => ({
      ...prev,
      habits: prev.habits.map(h => h.id === id ? { ...h, name: newName } : h),
    }));
    addToast('success', `Habit renamed to "${newName}".`);
  }, []);

  // ── Delete Habit ────────────────────────────────────────────────────────────
  const handleDeleteHabit = useCallback((id) => {
    setAppData(prev => {
      const newHabits = prev.habits.filter(h => h.id !== id);
      const newComp = { ...prev.completions };
      Object.keys(newComp).forEach(k => {
        if (k.startsWith(`${id}::`)) delete newComp[k];
      });
      return { ...prev, habits: newHabits, completions: newComp };
    });
    addToast('info', 'Habit deleted.');
  }, []);

  // ── Download Monthly PDF Report ─────────────────────────────────────────────
  async function handleDownloadReport() {
    if (isDownloading) return;
    setIsDownloading(true);
    addToast('info', 'Generating your monthly PDF report...');
    try {
      const { downloadMonthlyReportPDF } = await import('./reportPdf.js');
      await downloadMonthlyReportPDF(year, month, habits, completions, 'PUNEET ATMANAND ITI');
      addToast('success', `PDF Report for ${MONTHS[month - 1]} ${year} downloaded!`);
    } catch (err) {
      console.error('PDF generation error:', err);
      addToast('error', 'Could not generate PDF report. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }

  // ── Export ──────────────────────────────────────────────────────────────────
  function handleExport() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      habits: appData.habits,
      completions: appData.completions,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const d = new Date();
    a.download = `mint-habits-backup-${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('success', 'Backup exported!');
  }

  // ── Import ──────────────────────────────────────────────────────────────────
  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleImport(importedData) {
    setAppData({
      version: importedData.version || 1,
      habits: importedData.habits,
      completions: importedData.completions || {},
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Header onDownloadReport={handleDownloadReport} isDownloading={isDownloading} />

      {!storageOk && (
        <div
          role="alert"
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '0.75rem 1.25rem',
            fontSize: '0.85rem',
            textAlign: 'center',
          }}
        >
          ⚠ localStorage is unavailable in your browser. Data will not be saved between sessions.
        </div>
      )}

      {/* ── Main Content ─────────────────────────────────────────────────────── */}
      <main className="app-main">

        {/* ── Dashboard Header Row ───────────────────────────────────────────── */}
        <div className="dashboard-header-row">
          <div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.2rem' }}>
              Habit Dashboard
            </h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              {MONTHS[month - 1]} {year} · Track, reflect, grow.
            </p>
          </div>
          <MonthYearSelector year={year} month={month} onChange={handleMonthYear} />
        </div>

        {/* ── Summary Cards ──────────────────────────────────────────────────── */}
        <div className="section-gap">
          <SummaryCards year={year} month={month} habits={habits} completions={completions} />
        </div>

        {/* ── Charts Row: Area + Donut ───────────────────────────────────────── */}
        <div className="section-gap charts-grid-row">
          <ProgressAreaChart year={year} month={month} habits={habits} completions={completions} />
          <CompletionDonut year={year} month={month} habits={habits} completions={completions} />
        </div>

        {/* ── Matrix + Progress List ─────────────────────────────────────────── */}
        <div className="section-gap matrix-progress-row">
          <div className="matrix-col">
            <HabitMatrix
              year={year}
              month={month}
              habits={habits}
              completions={completions}
              onToggle={handleToggle}
              onAddHabit={handleAddHabit}
              onEditHabit={handleEditHabit}
              onDeleteHabit={handleDeleteHabit}
              onRowHeightsChange={setRowHeights}
            />
          </div>
          <div className="progress-col">
            <HabitProgressList
              year={year}
              month={month}
              habits={habits}
              completions={completions}
              rowHeights={rowHeights}
            />
          </div>
        </div>

        {/* ── Bar Chart + Weekly Progress ────────────────────────────────────── */}
        <div className="section-gap daily-weekly-row">
          <DailyCompletionChart year={year} month={month} habits={habits} completions={completions} />
          <WeeklyProgress year={year} month={month} habits={habits} completions={completions} />
        </div>

        {/* ── Top 5 Habits ───────────────────────────────────────────────────── */}
        <div className="section-gap">
          <TopHabits year={year} month={month} habits={habits} completions={completions} />
        </div>
      </main>

      {/* ── Backup Controls (hidden file input + import modal) ─────────────── */}
      <BackupControls
        data={appData}
        onImport={handleImport}
        onToast={addToast}
        fileInputRef={fileInputRef}
      />

      {/* ── Toast Notifications ────────────────────────────────────────────── */}
      <ToastContainer toasts={toasts} />
    </div>
  );
}
