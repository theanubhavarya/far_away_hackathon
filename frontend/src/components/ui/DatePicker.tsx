// Yatri AI — Custom Date Picker Popup
// Google-style calendar popup with month/year navigation

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_HEADERS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

interface DatePickerProps {
  value: string;          // ISO string "YYYY-MM-DD"
  onChange: (v: string) => void;
  minDate?: string;       // ISO string
  label?: string;
  id?: string;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDisplay(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function DatePicker({ value, onChange, minDate, label, id }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Parse the current value or default to today
  const selected = useMemo(() => {
    if (value) return new Date(value + 'T00:00:00');
    return new Date();
  }, [value]);

  const [viewYear, setViewYear] = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  // Sync view when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const minParsed = minDate ? new Date(minDate + 'T00:00:00') : null;
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);

  const isDisabled = (day: number): boolean => {
    if (!minParsed) return false;
    const date = new Date(viewYear, viewMonth, day);
    return date < new Date(minParsed.getFullYear(), minParsed.getMonth(), minParsed.getDate());
  };

  const isSelected = (day: number): boolean => {
    return (
      selected.getFullYear() === viewYear &&
      selected.getMonth() === viewMonth &&
      selected.getDate() === day
    );
  };

  const isToday = (day: number): boolean => {
    const today = new Date();
    return (
      today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === day
    );
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(viewYear - 1); setViewMonth(11); }
    else setViewMonth(viewMonth - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(viewYear + 1); setViewMonth(0); }
    else setViewMonth(viewMonth + 1);
  };

  const selectDay = (day: number) => {
    if (isDisabled(day)) return;
    onChange(toISO(viewYear, viewMonth, day));
    setOpen(false);
  };

  // Build grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger button */}
      <button
        type="button"
        id={id}
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          padding: '12px 16px 12px 40px',
          background: 'var(--bg-base)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)',
          fontSize: '0.875rem',
          fontFamily: 'var(--font-body)',
          textAlign: 'left',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
          position: 'relative',
        }}
        aria-label={label || 'Select date'}
      >
        <Calendar
          size={14}
          style={{
            position: 'absolute',
            left: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-muted)',
          }}
        />
        {formatDisplay(value) || 'Select date'}
      </button>

      {/* Popup */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              zIndex: 300,
              width: 300,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              borderRadius: 16,
              boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.1)',
              overflow: 'hidden',
            }}
          >
            {/* Header — Month/Year + Navigation */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 16px 12px',
                borderBottom: '1px solid var(--border-default)',
              }}
            >
              <button
                onClick={prevMonth}
                aria-label="Previous month"
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  transition: 'all 150ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <ChevronLeft size={18} />
              </button>

              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                userSelect: 'none',
              }}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </div>

              <button
                onClick={nextMonth}
                aria-label="Next month"
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  transition: 'all 150ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Day Headers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                padding: '12px 12px 4px',
                gap: 2,
              }}
            >
              {DAY_HEADERS.map((d) => (
                <div
                  key={d}
                  style={{
                    textAlign: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '4px 0',
                  }}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Day Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                padding: '4px 12px 16px',
                gap: 2,
              }}
            >
              {cells.map((day, i) => {
                if (day === null) {
                  return <div key={`empty-${i}`} />;
                }
                const disabled = isDisabled(day);
                const sel = isSelected(day);
                const today = isToday(day);

                return (
                  <button
                    key={day}
                    onClick={() => selectDay(day)}
                    disabled={disabled}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      border: 'none',
                      borderRadius: '50%',
                      cursor: disabled ? 'default' : 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: sel ? 700 : today ? 600 : 400,
                      fontFamily: 'var(--font-body)',
                      background: sel
                        ? 'linear-gradient(135deg, var(--color-primary), #8B5CF6)'
                        : 'transparent',
                      color: sel
                        ? '#fff'
                        : disabled
                          ? 'var(--text-muted)'
                          : today
                            ? 'var(--color-primary)'
                            : 'var(--text-primary)',
                      opacity: disabled ? 0.35 : 1,
                      transition: 'all 150ms',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    onMouseEnter={(e) => {
                      if (!disabled && !sel) {
                        e.currentTarget.style.background = 'var(--bg-elevated)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!disabled && !sel) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                    aria-label={`${day} ${MONTH_NAMES[viewMonth]} ${viewYear}`}
                  >
                    {day}
                    {/* Today dot indicator */}
                    {today && !sel && (
                      <span
                        style={{
                          position: 'absolute',
                          bottom: 3,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: 4,
                          height: 4,
                          borderRadius: '50%',
                          background: 'var(--color-primary)',
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Actions */}
            <div
              style={{
                display: 'flex',
                gap: 6,
                padding: '0 12px 14px',
                borderTop: '1px solid var(--border-default)',
                paddingTop: 12,
              }}
            >
              <button
                onClick={() => {
                  const today = new Date();
                  onChange(toISO(today.getFullYear(), today.getMonth(), today.getDate()));
                  setOpen(false);
                }}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Today
              </button>
              <button
                onClick={() => {
                  const tmr = new Date();
                  tmr.setDate(tmr.getDate() + 1);
                  onChange(toISO(tmr.getFullYear(), tmr.getMonth(), tmr.getDate()));
                  setOpen(false);
                }}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Tomorrow
              </button>
              <button
                onClick={() => {
                  const d = new Date();
                  d.setDate(d.getDate() + 7);
                  onChange(toISO(d.getFullYear(), d.getMonth(), d.getDate()));
                  setOpen(false);
                }}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-md)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                +1 Week
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
