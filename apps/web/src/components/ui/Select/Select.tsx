import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import styles from './Select.module.css'

export interface SelectOption {
  value: string
  label: string
  description?: string
}

interface SelectProps {
  value: string
  options: readonly SelectOption[]
  onChange: (value: string) => void
  ariaLabel: string
  icon?: ReactNode
  placeholder?: string
  invalid?: boolean
}

export function Select({
  value,
  options,
  onChange,
  ariaLabel,
  icon,
  placeholder = 'Select an option',
  invalid = false,
}: SelectProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = options.find((option) => option.value === value)
  const [open, setOpen] = useState(false)

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

  const choose = (nextValue: string) => {
    onChange(nextValue)
    setOpen(false)
  }

  return (
    <div className={`${styles.select} ${open ? styles.open : ''}`} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((current) => !current)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid}
      >
        {icon && <span className={styles.icon}>{icon}</span>}
        <span className={`${styles.value} ${selected ? styles.hasValue : ''}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={styles.chevron} aria-hidden="true" />
      </button>

      {open && (
        <div className={styles.menu} role="listbox" aria-label={ariaLabel}>
          {options.map((option) => {
            const isSelected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                className={isSelected ? styles.selected : undefined}
                onClick={() => choose(option.value)}
                role="option"
                aria-selected={isSelected}
              >
                <span className={styles.optionCopy}>
                  <strong>{option.label}</strong>
                  {option.description && <small>{option.description}</small>}
                </span>
                {isSelected && <Check />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
