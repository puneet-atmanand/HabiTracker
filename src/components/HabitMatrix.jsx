import { useState, useRef, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X, GripVertical } from 'lucide-react';
import {
  getDaysInMonth,
  getWeekdayInitial,
  formatDateKey,
  isToday,
  generateId,
} from '../utils.js';

// ─── Habit Editor Row ─────────────────────────────────────────────────────────
function HabitEditRow({ habit, onSave, onCancel, existingNames }) {
  const [val, setVal] = useState(habit.name);
  const [err, setErr] = useState('');
  const inputRef = useRef(null);

  function handleSave() {
    const trimmed = val.trim();
    if (!trimmed) { setErr('Name cannot be empty.'); return; }
    const dup = existingNames.some(
      n => n.toLowerCase() === trimmed.toLowerCase() && n !== habit.name
    );
    if (dup) { setErr('A habit with this name already exists.'); return; }
    onSave(trimmed);
  }

  return (
    <td
      className="col-habit"
      style={{ padding: '0.4rem 0.65rem', background: 'var(--bg-light)' }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <input
            ref={inputRef}
            autoFocus
            className="input"
            value={val}
            onChange={e => { setVal(e.target.value); setErr(''); }}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') onCancel();
            }}
            style={{ padding: '0.35rem 0.45rem', fontSize: '0.75rem', height: '1.85rem', minWidth: 0, flex: 1 }}
            aria-label="Edit habit name"
          />
          <button
            className="habit-action-btn edit-btn"
            onClick={handleSave}
            aria-label="Save habit name"
            title="Save changes"
            style={{ color: 'var(--accent-strong)', background: '#edf6eb', borderColor: '#d2e7cc', flexShrink: 0 }}
          >
            <Check size={13} />
          </button>
          <button
            className="habit-action-btn"
            onClick={onCancel}
            aria-label="Cancel editing"
            title="Cancel"
            style={{ background: 'var(--bg-white)', borderColor: 'var(--border-color)', flexShrink: 0 }}
          >
            <X size={13} />
          </button>
        </div>
        {err && <span style={{ fontSize: '0.625rem', color: '#dc2626' }}>{err}</span>}
      </div>
    </td>
  );
}

// ─── Add Habit Row ────────────────────────────────────────────────────────────
function AddHabitRow({ days, onAdd, existingNames }) {
  const [adding, setAdding] = useState(false);
  const [val, setVal] = useState('');
  const [err, setErr] = useState('');

  function handleAdd() {
    const trimmed = val.trim();
    if (!trimmed) { setErr('Name cannot be empty.'); return; }
    const dup = existingNames.some(n => n.toLowerCase() === trimmed.toLowerCase());
    if (dup) { setErr('A habit with this name already exists.'); return; }
    onAdd(trimmed);
    setVal('');
    setErr('');
    setAdding(false);
  }

  if (!adding) {
    return (
      <tr>
        <td className="col-habit" style={{ padding: '0.45rem 0.85rem', background: 'var(--bg-white)' }}>
          <button
            className="btn btn-ghost"
            onClick={() => setAdding(true)}
            id="btn-add-habit"
            aria-label="Add new habit"
            style={{
              color: 'var(--accent-strong)',
              fontSize: '0.8rem',
              fontWeight: 600,
              gap: '0.35rem',
              padding: '0.3rem 0.5rem',
              borderRadius: '6px',
            }}
          >
            <Plus size={14} /> Add habit
          </button>
        </td>
        {Array.from({ length: days }, (_, i) => (
          <td key={i} style={{ background: 'var(--bg-white)' }} />
        ))}
      </tr>
    );
  }

  return (
    <tr>
      <td className="col-habit" style={{ padding: '0.4rem 0.65rem', background: 'var(--bg-light)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <input
              autoFocus
              className="input"
              value={val}
              placeholder="New habit…"
              onChange={e => { setVal(e.target.value); setErr(''); }}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAdd();
                if (e.key === 'Escape') { setAdding(false); setVal(''); setErr(''); }
              }}
              style={{ padding: '0.35rem 0.45rem', fontSize: '0.75rem', height: '1.85rem', minWidth: 0, flex: 1 }}
              aria-label="New habit name"
            />
            <button
              className="habit-action-btn edit-btn"
              onClick={handleAdd}
              aria-label="Confirm add habit"
              title="Add habit"
              style={{ color: 'var(--accent-strong)', background: '#edf6eb', borderColor: '#d2e7cc', flexShrink: 0 }}
            >
              <Check size={13} />
            </button>
            <button
              className="habit-action-btn"
              onClick={() => { setAdding(false); setVal(''); setErr(''); }}
              aria-label="Cancel adding habit"
              title="Cancel"
              style={{ background: 'var(--bg-white)', borderColor: 'var(--border-color)', flexShrink: 0 }}
            >
              <X size={13} />
            </button>
          </div>
          {err && <span style={{ fontSize: '0.625rem', color: '#dc2626' }}>{err}</span>}
        </div>
      </td>
      {Array.from({ length: days }, (_, i) => (
        <td key={i} style={{ background: 'var(--bg-light)' }} />
      ))}
    </tr>
  );
}

// ─── Confirm Delete Modal ─────────────────────────────────────────────────────
function ConfirmDeleteModal({ habit, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
      <div className="modal-box">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <Trash2 size={18} style={{ color: '#dc2626' }} />
          <h2 id="delete-modal-title" style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dark)' }}>
            Delete Habit
          </h2>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Are you sure you want to delete <strong style={{ color: 'var(--text-dark)' }}>"{habit.name}"</strong>?
          All completion records for this habit will be permanently removed.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onCancel} aria-label="Cancel delete">
            Cancel
          </button>
          <button className="btn btn-danger" onClick={onConfirm} id="btn-confirm-delete" aria-label="Confirm delete habit">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main HabitMatrix ─────────────────────────────────────────────────────────
export default function HabitMatrix({
  year, month, habits, completions,
  onToggle, onAddHabit, onEditHabit, onDeleteHabit,
  onRowHeightsChange,
}) {
  const [editingId, setEditingId] = useState(null);
  const [deletingHabit, setDeletingHabit] = useState(null);
  const tableRef = useRef(null);

  const days = getDaysInMonth(year, month);
  const existingNames = habits.map(h => h.name);

  useEffect(() => {
    if (!tableRef.current || !onRowHeightsChange) return;
    const updateHeights = () => {
      const rows = tableRef.current.querySelectorAll('tbody tr.habit-row-item');
      const heights = Array.from(rows).map(r => Math.round(r.getBoundingClientRect().height));
      onRowHeightsChange(heights);
    };

    updateHeights();
    const observer = new ResizeObserver(updateHeights);
    observer.observe(tableRef.current);
    return () => observer.disconnect();
  }, [habits, year, month, editingId, onRowHeightsChange]);

  function handleEditSave(habit, newName) {
    onEditHabit(habit.id, newName);
    setEditingId(null);
  }

  function handleDeleteConfirm() {
    if (deletingHabit) {
      onDeleteHabit(deletingHabit.id);
      setDeletingHabit(null);
    }
  }

  return (
    <>
      <div className="card" style={{ padding: '0' }}>
        <div className="matrix-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', minWidth: 0 }}>
            <span className="card-title" style={{ margin: 0, whiteSpace: 'nowrap' }}>Daily Habit Matrix</span>
            <span className="scroll-hint mobile-only">← Scroll dates →</span>
          </div>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', flexShrink: 0 }}>
            {habits.length} habit{habits.length !== 1 ? 's' : ''}
          </span>
        </div>

        {habits.length === 0 && (
          <div style={{ padding: '1rem 1.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No habits yet. Click "Add habit" below to get started!
          </div>
        )}

        <div className="matrix-wrapper" style={{ padding: '0' }}>
          <table className="matrix-table" ref={tableRef} role="grid" aria-label="Habit completion matrix">
            <thead>
              <tr>
                <th className="col-habit-head" scope="col">Habit</th>
                {Array.from({ length: days }, (_, i) => {
                  const day = i + 1;
                  const today = isToday(year, month, day);
                  return (
                    <th
                      key={day}
                      className={`day-header${today ? ' today-col' : ''}`}
                      scope="col"
                      aria-label={`Day ${day}`}
                    >
                      <span className="day-num">{day}</span>
                      <span className="day-wd">{getWeekdayInitial(year, month, day)}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {habits.map(habit => (
                <tr key={habit.id} className="habit-row-item">
                  {editingId === habit.id ? (
                    <HabitEditRow
                      habit={habit}
                      existingNames={existingNames}
                      onSave={name => handleEditSave(habit, name)}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <td className="col-habit" scope="row">
                      <div className="habit-name-cell">
                        <span
                          className="habit-name-text"
                          title={habit.name}
                        >
                          {habit.name}
                        </span>
                        <div className="habit-actions">
                          <button
                            className="habit-action-btn edit-btn"
                            onClick={() => setEditingId(habit.id)}
                            aria-label={`Edit habit: ${habit.name}`}
                            title="Edit habit"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            className="habit-action-btn delete-btn"
                            onClick={() => setDeletingHabit(habit)}
                            aria-label={`Delete habit: ${habit.name}`}
                            title="Delete habit"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </td>
                  )}

                  {Array.from({ length: days }, (_, i) => {
                    const day = i + 1;
                    const dateKey = formatDateKey(year, month, day);
                    const ck = `${habit.id}::${dateKey}`;
                    const checked = !!completions[ck];
                    const today = isToday(year, month, day);
                    const disabled = !today;
                    return (
                      <td
                        key={day}
                        className={`habit-check-cell${today ? ' today-col' : ''}`}
                        style={disabled ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                        title={disabled ? (day < new Date().getDate() ? 'Past day — cannot edit' : 'Future day — not yet') : 'Mark today'}
                      >
                        <input
                          type="checkbox"
                          className="habit-cb"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => !disabled && onToggle(habit.id, dateKey)}
                          aria-label={`${habit.name} on day ${day}: ${checked ? 'completed' : 'not completed'}${disabled ? ' (locked)' : ''}`}
                          id={`cb-${habit.id}-${dateKey}`}
                          style={disabled ? { cursor: 'not-allowed', pointerEvents: 'none' } : {}}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
              <AddHabitRow
                days={days}
                existingNames={existingNames}
                onAdd={onAddHabit}
              />
            </tbody>
          </table>
        </div>
      </div>

      {deletingHabit && (
        <ConfirmDeleteModal
          habit={deletingHabit}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeletingHabit(null)}
        />
      )}
    </>
  );
}
