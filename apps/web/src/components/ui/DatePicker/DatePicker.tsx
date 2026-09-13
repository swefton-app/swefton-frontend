import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import styles from './DatePicker.module.css'

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
  max?: string
}

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

const weekdayNames = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] as const

function toIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return undefined
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function initialCalendarMonth(value: string) {
  const selected = parseIsoDate(value)
  if (selected) return new Date(selected.getFullYear(), selected.getMonth(), 1)

  const today = new Date()
  return new Date(today.getFullYear() - 18, today.getMonth(), 1)
}

export function DatePicker({ value, onChange, label = 'Date', max }: DatePickerProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [openSelector, setOpenSelector] = useState<'month' | 'year' | null>(null)
  const [viewMonth, setViewMonth] = useState(() => initialCalendarMonth(value))
  const selectedDate = parseIsoDate(value)
  const maximumDate = parseIsoDate(max ?? toIsoDate(new Date())) ?? new Date()
  const currentYear = new Date().getFullYear()

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

  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear()
    const month = viewMonth.getMonth()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const mondayBasedStart = (new Date(year, month, 1).getDay() + 6) % 7

    return [
      ...Array.from({ length: mondayBasedStart }, () => null),
      ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)),
    ]
  }, [viewMonth])
  const yearOptions = useMemo(
    () =>
      Array.from({ length: currentYear - 1899 }, (_, index) => ({
        value: currentYear - index,
        label: String(currentYear - index),
      })),
    [currentYear],
  )
  const monthOptions = monthNames.map((month, index) => ({
    value: index,
    label: month,
  }))

  const displayValue = selectedDate
    ? new Intl.DateTimeFormat(undefined, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(selectedDate)
    : 'Choose your date of birth'

  const selectDate = (date: Date) => {
    onChange(toIsoDate(date))
    setOpen(false)
  }

  const changeMonth = (offset: number) => {
    setViewMonth(
      (current) => new Date(current.getFullYear(), current.getMonth() + offset, 1),
    )
  }

  const canMoveForward =
    viewMonth.getFullYear() < maximumDate.getFullYear() ||
    (viewMonth.getFullYear() === maximumDate.getFullYear() &&
      viewMonth.getMonth() < maximumDate.getMonth())

  return (
    <div className={styles.datePicker} ref={rootRef}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.open : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarDays aria-hidden="true" />
        <span className={selectedDate ? styles.hasValue : undefined}>{displayValue}</span>
        <ChevronRight className={styles.triggerChevron} aria-hidden="true" />
      </button>

      {open && (
        <div className={styles.popover} role="dialog" aria-label={`${label} calendar`}>
          <div className={styles.calendarHeader}>
            <button
              type="button"
              className={styles.navigationButton}
              onClick={() => changeMonth(-1)}
              aria-label="Previous month"
            >
              <ChevronLeft />
            </button>
            <div className={styles.monthSelectors}>
              <CalendarSelect
                label="Month"
                value={viewMonth.getMonth()}
                options={monthOptions}
                open={openSelector === 'month'}
                onOpenChange={(nextOpen) => setOpenSelector(nextOpen ? 'month' : null)}
                onChange={(month) => {
                  setViewMonth(
                    new Date(viewMonth.getFullYear(), month, 1),
                  )
                  setOpenSelector(null)
                }}
              />
              <CalendarSelect
                label="Year"
                value={viewMonth.getFullYear()}
                options={yearOptions}
                open={openSelector === 'year'}
                onOpenChange={(nextOpen) => setOpenSelector(nextOpen ? 'year' : null)}
                onChange={(year) => {
                  setViewMonth(
                    new Date(year, viewMonth.getMonth(), 1),
                  )
                  setOpenSelector(null)
                }}
              />
            </div>
            <button
              type="button"
              className={styles.navigationButton}
              onClick={() => changeMonth(1)}
              aria-label="Next month"
              disabled={!canMoveForward}
            >
              <ChevronRight />
            </button>
          </div>

          <div className={styles.weekdays} aria-hidden="true">
            {weekdayNames.map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className={styles.days} role="grid">
            {calendarDays.map((date, index) => {
              if (!date) return <span key={`empty-${index}`} />

              const isoDate = toIsoDate(date)
              const selected = isoDate === value
              const isToday = isoDate === toIsoDate(new Date())
              const disabled = date > maximumDate

              return (
                <button
                  key={isoDate}
                  type="button"
                  className={`${selected ? styles.selectedDay : ''} ${isToday ? styles.today : ''}`}
                  onClick={() => selectDate(date)}
                  disabled={disabled}
                  aria-selected={selected}
                  role="gridcell"
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          <div className={styles.calendarFooter}>
            <span>{selectedDate ? displayValue : 'No date selected'}</span>
            {selectedDate && (
              <button type="button" onClick={() => onChange('')}>
                <X /> Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

interface CalendarSelectProps {
  label: string
  value: number
  options: readonly { value: number; label: string }[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onChange: (value: number) => void
}

function CalendarSelect({
  label,
  value,
  options,
  open,
  onOpenChange,
  onChange,
}: CalendarSelectProps) {
  const selectedLabel = options.find((option) => option.value === value)?.label

  return (
    <div className={`${styles.calendarSelect} ${open ? styles.selectOpen : ''}`}>
      <button
        type="button"
        className={styles.selectTrigger}
        onClick={() => onOpenChange(!open)}
        aria-label={`Choose ${label.toLowerCase()}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selectedLabel}</span>
        <ChevronDown />
      </button>
      {open && (
        <div className={styles.selectMenu} role="listbox" aria-label={label}>
          {options.map((option) => {
            const selected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                className={selected ? styles.selectedOption : undefined}
                onClick={() => onChange(option.value)}
                role="option"
                aria-selected={selected}
              >
                <span>{option.label}</span>
                {selected && <Check />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
