'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, Check } from 'lucide-react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  compact?: boolean
  style?: React.CSSProperties
}

export default function Select({ value, onChange, options, compact, style }: SelectProps) {
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selectedOption = options.find(o => o.value === value)
  const selectedLabel = selectedOption?.label ?? ''

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return
    const rect = buttonRef.current.getBoundingClientRect()
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    })
  }, [])

  // Open/close
  const toggleOpen = useCallback(() => {
    if (!open) {
      updatePosition()
      setHighlighted(options.findIndex(o => o.value === value))
      setOpen(true)
      setMounted(false)
      requestAnimationFrame(() => setMounted(true))
    } else {
      setOpen(false)
    }
  }, [open, options, value, updatePosition])

  const selectOption = useCallback((optValue: string) => {
    onChange(optValue)
    setOpen(false)
    buttonRef.current?.focus()
  }, [onChange])

  // Click outside
  useEffect(() => {
    if (!open) return
    const handler = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', handler)
    return () => document.removeEventListener('pointerdown', handler)
  }, [open])

  // Recalculate position on resize
  useEffect(() => {
    if (!open) return
    const handler = () => updatePosition()
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [open, updatePosition])

  // Scroll highlighted into view
  useEffect(() => {
    if (!open || highlighted < 0 || !listRef.current) return
    const items = listRef.current.children
    if (items[highlighted]) {
      (items[highlighted] as HTMLElement).scrollIntoView({ block: 'nearest' })
    }
  }, [highlighted, open])

  // Keyboard
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        toggleOpen()
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlighted(prev => (prev + 1) % options.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlighted(prev => (prev - 1 + options.length) % options.length)
        break
      case 'Enter':
        e.preventDefault()
        if (highlighted >= 0 && highlighted < options.length) {
          selectOption(options[highlighted].value)
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        buttonRef.current?.focus()
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }, [open, highlighted, options, toggleOpen, selectOption])

  const padding = compact ? '0.375rem 2rem 0.375rem 0.75rem' : '0.5rem 2rem 0.5rem 0.75rem'

  return (
    <div ref={containerRef} style={{ position: 'relative', ...style }}>
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={toggleOpen}
        onKeyDown={handleKeyDown}
        style={{
          background: 'var(--mr-bg-input)',
          border: '1px solid var(--mr-border)',
          borderRadius: 'var(--mr-radius-sm)',
          color: 'var(--mr-text-primary)',
          fontSize: '0.875rem',
          cursor: 'pointer',
          width: '100%',
          padding,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'left',
          lineHeight: '1.4',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
          {selectedLabel}
        </span>
        <ChevronDown
          size={14}
          style={{
            position: 'absolute',
            right: '0.6rem',
            top: '50%',
            transform: open ? 'translateY(-50%) rotate(180deg)' : 'translateY(-50%)',
            transition: 'transform 150ms',
            color: 'var(--mr-text-secondary)',
            flexShrink: 0,
          }}
        />
      </button>

      {open && dropdownPos && (
        <div
          role="listbox"
          ref={listRef}
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            background: 'var(--mr-bg-card)',
            border: '1px solid var(--mr-border-strong)',
            borderRadius: 'var(--mr-radius-sm)',
            boxShadow: 'var(--mr-shadow-lg)',
            zIndex: 9999,
            maxHeight: '280px',
            overflowY: 'auto',
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(-4px)',
            transition: 'opacity 150ms, transform 150ms',
          }}
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value
            const isHighlighted = i === highlighted
            return (
              <div
                key={opt.value + i}
                role="option"
                aria-selected={isSelected}
                onClick={() => selectOption(opt.value)}
                onMouseEnter={() => setHighlighted(i)}
                style={{
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: isHighlighted ? 'var(--mr-bg-hover)' : 'transparent',
                  color: isSelected ? 'var(--mr-primary)' : 'var(--mr-text-primary)',
                  fontWeight: isSelected ? 600 : 400,
                  transition: 'background 100ms',
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={14} style={{ flexShrink: 0, marginLeft: '0.5rem' }} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
