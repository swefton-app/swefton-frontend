import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, X } from 'lucide-react'
import styles from './MonthPicker.module.css'

interface MonthPickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  disabled?: boolean
}

const months = Array.from({ length: 12 }, (_, index) =>
  new Intl.DateTimeFormat(undefined, { month: 'long' }).format(new Date(2020, index, 1)),
)

function parseMonth(value: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return undefined
  const month = Number(match[2])
  return month >= 1 && month <= 12 ? { year: Number(match[1]), month: month - 1 } : undefined
}

export function MonthPicker({ value, onChange, label = 'Month', placeholder = 'Choose month', disabled = false }: MonthPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = parseMonth(value)
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear] = useState(() => selected?.year ?? new Date().getFullYear())

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  const displayValue = selected ? `${months[selected.month]} ${selected.year}` : placeholder

  return (
    <div className={styles.monthPicker} ref={rootRef}>
      <button
        type="button"
        disabled={disabled}
        className={`${styles.trigger} ${open ? styles.open : ''}`}
        onClick={() => {
          if (selected) setViewYear(selected.year)
          setOpen((current) => !current)
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarDays aria-hidden="true" />
        <span className={selected ? styles.hasValue : undefined}>{displayValue}</span>
        <ChevronRight className={styles.triggerChevron} aria-hidden="true" />
      </button>

      {open && (
        <div className={styles.popover} role="dialog" aria-label={`${label} picker`}>
          <div className={styles.calendarHeader}>
            <button type="button" className={styles.navigationButton} onClick={() => setViewYear((year) => year - 1)} aria-label="Previous year"><ChevronLeft /></button>
            <strong>{viewYear}</strong>
            <button type="button" className={styles.navigationButton} onClick={() => setViewYear((year) => year + 1)} aria-label="Next year"><ChevronRight /></button>
          </div>
          <div className={styles.monthGrid} role="grid">
            {months.map((month, index) => {
              const monthValue = `${viewYear}-${String(index + 1).padStart(2, '0')}`
              const isSelected = monthValue === value
              return (
                <button
                  key={monthValue}
                  type="button"
                  className={isSelected ? styles.selectedMonth : undefined}
                  onClick={() => { onChange(monthValue); setOpen(false) }}
                  aria-selected={isSelected}
                  role="gridcell"
                >
                  {month.slice(0, 3)}
                </button>
              )
            })}
          </div>
          <div className={styles.calendarFooter}>
            <span>{selected ? displayValue : 'No month selected'}</span>
            {selected && <button type="button" onClick={() => onChange('')}><X /> Clear</button>}
          </div>
        </div>
      )}
    </div>
  )
}
