import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

function CustomDropdown({ id, value, options, onSelect, label, width = '160px' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className="custom-dropdown-container" ref={ref}>
      <button
        type="button"
        id={id}
        className={`custom-dropdown-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen(prev => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
      >
        <span>{selectedOption ? selectedOption.label : value}</span>
        <ChevronDown size={14} className="chevron-icon" />
      </button>

      {open && (
        <div
          className="custom-dropdown-menu"
          style={{ width }}
          role="listbox"
          tabIndex={-1}
        >
          {options.map(opt => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                className={`custom-dropdown-item ${isSelected ? 'selected' : ''}`}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onSelect(opt.value);
                  setOpen(false);
                }}
              >
                <span>{opt.label}</span>
                {isSelected && (
                  <Check size={14} style={{ color: 'var(--accent-strong)', strokeWidth: 2.5 }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MonthYearSelector({ year, month, onChange }) {
  function prev() {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  }
  function next() {
    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  }

  const monthOptions = MONTHS.map((m, i) => ({
    value: i + 1,
    label: m,
  }));

  const yearOptions = YEARS.map(y => ({
    value: y,
    label: String(y),
  }));

  return (
    <div className="month-year-container">
      <button
        className="btn-icon"
        onClick={prev}
        aria-label="Previous month"
        id="btn-prev-month"
        style={{
          width: '2.1rem',
          height: '2.1rem',
          minWidth: '2.1rem',
          minHeight: '2.1rem',
          borderRadius: '8px',
          border: '1.5px solid var(--border-color)',
          background: 'var(--bg-white)',
          flexShrink: 0,
        }}
      >
        <ChevronLeft size={16} />
      </button>

      <div className="month-year-dropdowns">
        <CustomDropdown
          id="select-month"
          value={month}
          options={monthOptions}
          onSelect={m => onChange(year, m)}
          label="Select month"
          width="155px"
        />

        <CustomDropdown
          id="select-year"
          value={year}
          options={yearOptions}
          onSelect={y => onChange(y, month)}
          label="Select year"
          width="105px"
        />
      </div>

      <button
        className="btn-icon"
        onClick={next}
        aria-label="Next month"
        id="btn-next-month"
        style={{
          width: '2.1rem',
          height: '2.1rem',
          minWidth: '2.1rem',
          minHeight: '2.1rem',
          borderRadius: '8px',
          border: '1.5px solid var(--border-color)',
          background: 'var(--bg-white)',
          flexShrink: 0,
        }}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
