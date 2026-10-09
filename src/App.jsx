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
import LinkDeviceModal from './components/LinkDeviceModal.jsx';
import DataMigrationModal from './components/DataMigrationModal.jsx';
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

// ─── Data Comparison Helpers ──────────────────────────────────────────────────
function hasUserActivity(data) {
  if (!data) return false;
  const completions = data.completions || {};
  if (Object.keys(completions).length > 0) return true;

  if (Array.isArray(data.habits)) {
    const defaultNames = [
      'upsc study',
      'read newspaper',
      'revise notes',
      'exercise',
      'meditation',
      'read a book',
      'drink enough water',
      'sleep on time',
    ];
    const currentNames = data.habits.map(h => (h.name || '').trim().toLowerCase());
    if (currentNames.length !== defaultNames.length) return true;
    for (let i = 0; i < currentNames.length; i++) {
      if (currentNames[i] !== defaultNames[i]) return true;
    }
  }
  return false;
}

function areDataEqual(a, b) {
  if (!a || !b) return false;
  const aHabits = Array.isArray(a.habits) ? a.habits : [];
  const bHabits = Array.isArray(b.habits) ? b.habits : [];
  if (aHabits.length !== bHabits.length) return false;

  for (let i = 0; i < aHabits.length; i++) {
    if (aHabits[i].name !== bHabits[i].name) return false;
  }

  const aComp = a.completions || {};
  const bComp = b.completions || {};
  const aKeys = Object.keys(aComp);
  const bKeys = Object.keys(bComp);
  if (aKeys.length !== bKeys.length) return false;

  for (const k of aKeys) {
    if (Boolean(aComp[k]) !== Boolean(bComp[k])) return false;
  }

  return true;
}

export default function App() {
  const { toasts, addToast } = useToast();
  const fileInputRef = useRef(null);
  const storageOk = isStorageAvailable();

  // ── Device Authorization State (Cookie verified via /api/tracker) ─────────
  const [isAuthorized, setIsAuthorized] = useState(null); // null = checking, true = authorized, false = needs linking

  // ── Synchronization State Machine ──────────────────────────────────────────
  // States: 'checking_auth' | 'reconciling' | 'needs_migration' | 'ready' | 'error'
  const [syncState, setSyncState] = useState('checking_auth');

  // Cloud Sync Status Pill: 'synced' | 'syncing' | 'offline' | 'error'
  const [syncStatus, setSyncStatus] = useState('synced');
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [migrationModalState, setMigrationModalState] = useState(null);

  // ── Concurrency & Lifecycle Refs ───────────────────────────────────────────
  const isReconciledRef = useRef(false);
  const isRemoteUpdateRef = useRef(false);
  const lastLocalWriteTimeRef = useRef(0);
  const pendingSaveTimeoutRef = useRef(null);

  // ── Initial Tracker Data (Load from localStorage immediately) ───────────────
  const [appData, setAppData] = useState(() => {
    const saved = loadData();
    return saved || buildDefaultData();
  });

  const latestAppDataRef = useRef(appData);
  useEffect(() => {
    latestAppDataRef.current = appData;
  }, [appData]);

  // ── Month / Year State ──────────────────────────────────────────────────────
  const today = todayYMD();
  const [year, setYear] = useState(today.year);
  const [month, setMonth] = useState(today.month);

  const { habits, completions } = appData;
  const [rowHeights, setRowHeights] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);

  // ── Step 1: Verify Device Authorization on Mount ────────────────────────────
  const checkDeviceAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/tracker?action=status', {
        credentials: 'same-origin',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.authorized) {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
        setSyncState('ready'); // Unlinked device still loads local tracker
      }
    } catch {
      // If server unreachable, continue in offline mode with local data
      setIsAuthorized(false);
      setSyncState('ready');
      setSyncStatus('offline');
    }
  }, []);

  useEffect(() => {
    checkDeviceAuth();
  }, [checkDeviceAuth]);

  // ── Step 2: One-Time Initial Reconciliation with Cloud ───────────────────────
  const performInitialReconciliation = useCallback(async () => {
    if (!isAuthorized || isReconciledRef.current) return;

    setSyncState('reconciling');
    console.log('[Sync] Performing initial cloud reconciliation via serverless API...');

    try {
      const res = await fetch('/api/tracker', {
        method: 'GET',
        credentials: 'same-origin',
      });

      if (!res.ok) {
        if (res.status === 401) {
          setIsAuthorized(false);
          setSyncState('ready');
          return;
        }
        const errData = await res.json().catch(() => ({}));
        console.error('[Sync] Server read error:', errData.error);
        setSyncState('error');
        setSyncStatus('error');
        setSyncError(errData.error || 'Failed to load cloud data');
        addToast('error', `Cloud connection error: ${errData.error || 'Server error'}`);
        return;
      }

      const data = await res.json();
      const cloudData = data?.tracker_data;
      const cloudUpdatedAt = data?.updated_at;
      const localData = loadData();

      const cloudHasData = Boolean(cloudData && Array.isArray(cloudData.habits));
      const localHasActivity = hasUserActivity(localData);

      if (cloudHasData) {
        if (localHasActivity && !areDataEqual(localData, cloudData)) {
          console.log('[Sync] Conflict detected: showing version selection modal.');
          setMigrationModalState({
            type: 'conflict',
            cloudData,
            cloudUpdatedAt,
            localData,
          });
          setSyncState('needs_migration');
          return;
        }

        // Cloud data authoritative or matches local
        console.log('[Sync] Loading cloud data directly (reconciled).');
        isRemoteUpdateRef.current = true;
        setAppData(cloudData);
        saveData(cloudData);
        isReconciledRef.current = true;
        setSyncStatus('synced');
        setLastSyncedAt(cloudUpdatedAt ? new Date(cloudUpdatedAt) : new Date());
        setSyncError(null);
        setSyncState('ready');
      } else {
        // No cloud record yet
        if (localHasActivity) {
          console.log('[Sync] New cloud record with local activity: offering import.');
          setMigrationModalState({
            type: 'import_local',
            localData,
          });
          setSyncState('needs_migration');
          return;
        }

        // Initialize defaults in cloud
        console.log('[Sync] Initializing fresh defaults in cloud.');
        const defaults = buildDefaultData();
        isRemoteUpdateRef.current = true;
        setAppData(defaults);
        saveData(defaults);

        await fetch('/api/tracker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ tracker_data: defaults }),
        }).catch(() => {});

        isReconciledRef.current = true;
        setSyncStatus('synced');
        setLastSyncedAt(new Date());
        setSyncState('ready');
      }
    } catch (err) {
      console.error('[Sync] Reconciliation network failure:', err);
      setSyncState('ready');
      setSyncStatus('offline');
    }
  }, [isAuthorized, addToast]);

  useEffect(() => {
    if (isAuthorized === true) {
      performInitialReconciliation();
    }
  }, [isAuthorized, performInitialReconciliation]);

  // ── Step 3: Handle Migration / Conflict Choice ──────────────────────────────
  const handleResolveMigration = useCallback(async (choice) => {
    if (!migrationModalState) return;

    const { localData, cloudData } = migrationModalState;

    if (choice === 'import_local' || choice === 'use_local') {
      setSyncStatus('syncing');
      isRemoteUpdateRef.current = true;
      setAppData(localData);
      saveData(localData);

      try {
        const res = await fetch('/api/tracker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ tracker_data: localData }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          setSyncStatus('error');
          setSyncError(errData.error || 'Upload failed');
          addToast('error', `Failed to upload data to cloud: ${errData.error || 'Network error'}`);
          return;
        }

        setSyncStatus('synced');
        setLastSyncedAt(new Date());
        setSyncError(null);
        addToast('success', choice === 'import_local' ? 'Local habits imported to cloud!' : 'Cloud updated with device data!');
      } catch {
        setSyncStatus('error');
        addToast('error', 'Network error uploading to cloud.');
        return;
      }
    } else if (choice === 'use_cloud') {
      isRemoteUpdateRef.current = true;
      setAppData(cloudData);
      saveData(cloudData);
      setSyncStatus('synced');
      setLastSyncedAt(new Date());
      setSyncError(null);
      addToast('success', 'Cloud tracker data loaded!');
    } else if (choice === 'start_fresh') {
      const defaults = buildDefaultData();
      isRemoteUpdateRef.current = true;
      setAppData(defaults);
      saveData(defaults);

      await fetch('/api/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ tracker_data: defaults }),
      }).catch(() => {});

      setSyncStatus('synced');
      setLastSyncedAt(new Date());
      setSyncError(null);
      addToast('info', 'Started fresh with default habits.');
    }

    isReconciledRef.current = true;
    setMigrationModalState(null);
    setSyncState('ready');
  }, [migrationModalState, addToast]);

  // ── Step 4: Multi-Device Sync (Polling & Visibility Change) ─────────────────
  const fetchRemoteUpdates = useCallback(async () => {
    if (!isAuthorized || syncState !== 'ready') return;

    // Guard: If client made local edits in the last 1500ms, skip to prevent race conditions
    if (Date.now() - lastLocalWriteTimeRef.current < 1500) {
      return;
    }

    try {
      const res = await fetch('/api/tracker', {
        method: 'GET',
        credentials: 'same-origin',
      });

      if (!res.ok) return;

      const data = await res.json();
      const remoteData = data?.tracker_data;
      const remoteUpdatedAt = data?.updated_at;

      if (!remoteData || typeof remoteData !== 'object' || !Array.isArray(remoteData.habits)) {
        return;
      }

      // Ignore self-write echoes
      if (areDataEqual(latestAppDataRef.current, remoteData)) {
        return;
      }

      // Check race condition again
      if (Date.now() - lastLocalWriteTimeRef.current < 1500) {
        return;
      }

      console.log('[Sync] Applied update from other device.');
      isRemoteUpdateRef.current = true;
      setAppData(remoteData);
      saveData(remoteData);
      setSyncStatus('synced');
      if (remoteUpdatedAt) setLastSyncedAt(new Date(remoteUpdatedAt));
      addToast('info', 'Tracker updated from other device.');
    } catch {
      // Network hiccup; ignore silently during background poll
    }
  }, [isAuthorized, syncState, addToast]);

  // Background polling every 4s when tab is active + instant refresh on focus/visibility change
  useEffect(() => {
    if (!isAuthorized || syncState !== 'ready') return;

    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchRemoteUpdates();
      }
    }, 4000);

    function handleVisibilityOrFocus() {
      if (document.visibilityState === 'visible') {
        fetchRemoteUpdates();
      }
    }

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [isAuthorized, syncState, fetchRemoteUpdates]);

  // ── Step 5: Debounced Cloud Saving on Local Edits ───────────────────────────
  useEffect(() => {
    if (syncState !== 'ready') return;

    // Immediately persist to localStorage for offline resilience
    if (storageOk) {
      saveData(appData);
    }

    if (!isAuthorized) return;

    // If update originated from remote sync or reconciliation, skip cloud write
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    // Record local edit timestamp
    lastLocalWriteTimeRef.current = Date.now();

    // Cancel pending debounce write
    if (pendingSaveTimeoutRef.current) {
      clearTimeout(pendingSaveTimeoutRef.current);
    }

    setSyncStatus('syncing');

    // Debounce cloud write by 1000ms
    pendingSaveTimeoutRef.current = setTimeout(async () => {
      if (!navigator.onLine) {
        setSyncStatus('offline');
        return;
      }

      try {
        const res = await fetch('/api/tracker', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ tracker_data: appData }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.error('[Sync] Cloud write error:', errData.error);
          setSyncStatus('error');
          setSyncError(errData.error || 'Save error');
        } else {
          const data = await res.json();
          setSyncStatus('synced');
          setLastSyncedAt(data.updated_at ? new Date(data.updated_at) : new Date());
          setSyncError(null);
        }
      } catch (err) {
        console.error('[Sync] Network error on save:', err);
        setSyncStatus('offline');
      }
    }, 1000);

    return () => {
      if (pendingSaveTimeoutRef.current) {
        clearTimeout(pendingSaveTimeoutRef.current);
      }
    };
  }, [appData, syncState, isAuthorized, storageOk]);

  // ── Step 6: Manual Retry / Force Cloud Save ─────────────────────────────────
  const triggerCloudSave = useCallback(async () => {
    if (!isAuthorized) return;

    if (!navigator.onLine) {
      setSyncStatus('offline');
      addToast('error', 'You are currently offline. Check your internet connection.');
      return;
    }

    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/tracker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ tracker_data: latestAppDataRef.current }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setSyncStatus('error');
        setSyncError(errData.error || 'Sync failed');
        addToast('error', `Sync failed: ${errData.error || 'Server error'}`);
      } else {
        const data = await res.json();
        setSyncStatus('synced');
        setLastSyncedAt(data.updated_at ? new Date(data.updated_at) : new Date());
        setSyncError(null);
        addToast('success', 'Tracker synced to cloud!');
      }
    } catch {
      setSyncStatus('error');
      addToast('error', 'Sync failed. Check network connection.');
    }
  }, [isAuthorized, addToast]);

  // Online / Offline Network Handlers
  useEffect(() => {
    function handleOnline() {
      if (syncStatus === 'offline' || syncStatus === 'error') {
        triggerCloudSave();
      }
    }
    function handleOffline() {
      setSyncStatus('offline');
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncStatus, triggerCloudSave]);

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
  }, [addToast]);

  // ── Edit Habit ──────────────────────────────────────────────────────────────
  const handleEditHabit = useCallback((id, newName) => {
    setAppData(prev => ({
      ...prev,
      habits: prev.habits.map(h => h.id === id ? { ...h, name: newName } : h),
    }));
    addToast('success', `Habit renamed to "${newName}".`);
  }, [addToast]);

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
  }, [addToast]);

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
      console.error('[PDF] Generation error:', err);
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

  // ── Initial Checking Auth Screen ────────────────────────────────────────────
  if (isAuthorized === null) {
    return (
      <div className="app-loading-screen" role="status" aria-live="polite">
        <div className="app-loading-spinner" />
        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-dark)' }}>
          Loading your habit tracker...
        </span>
      </div>
    );
  }

  // ── Unlinked Device: One-Time Device Authorization Screen ───────────────────
  if (isAuthorized === false) {
    return (
      <>
        <LinkDeviceModal
          onAuthorized={() => {
            setIsAuthorized(true);
            isReconciledRef.current = false;
          }}
          onToast={addToast}
        />
        <ToastContainer toasts={toasts} />
      </>
    );
  }

  // ── Reconciling State Screen ────────────────────────────────────────────────
  if (syncState === 'reconciling') {
    return (
      <div className="app-loading-screen" role="status" aria-live="polite">
        <div className="app-loading-spinner" />
        <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-dark)' }}>
          Synchronizing with cloud...
        </span>
      </div>
    );
  }

  // ── Reconciliation Error Screen ─────────────────────────────────────────────
  if (syncState === 'error') {
    return (
      <div className="app-loading-screen" role="alert">
        <div style={{ maxWidth: 420, textAlign: 'center', padding: '1.5rem', background: 'var(--bg-white)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-md)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#991b1b', marginBottom: '0.5rem' }}>
            Sync Initialization Error
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            {syncError || 'Could not verify your cloud habit tracker data.'}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={performInitialReconciliation}>
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Genuine Initial Conflict Screen ─────────────────────────────────────────
  if (syncState === 'needs_migration' && migrationModalState) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
        <Header
          onDownloadReport={() => {}}
          isDownloading={false}
          syncStatus="offline"
          lastSyncedAt={lastSyncedAt}
          onRetrySync={() => {}}
          syncError={null}
        />
        <DataMigrationModal
          migrationState={migrationModalState}
          onResolve={handleResolveMigration}
        />
        <ToastContainer toasts={toasts} />
      </div>
    );
  }

  // ── Ready View: Direct Habit Tracker (No Login/Logout Screens) ──────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Header
        onDownloadReport={handleDownloadReport}
        isDownloading={isDownloading}
        syncStatus={syncStatus}
        lastSyncedAt={lastSyncedAt}
        onRetrySync={triggerCloudSave}
        syncError={syncError}
      />

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
          ⚠ localStorage is unavailable in your browser. Data will not be saved between sessions offline.
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
