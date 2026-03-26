'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

// --- Types ---

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  error: (message: string) => void
  success: (message: string) => void
  info: (message: string) => void
}

// --- Context ---

const ToastContext = createContext<ToastContextValue | null>(null)

// --- Styles ---

const CONTAINER_STYLE: React.CSSProperties = {
  position: 'fixed',
  top: 16,
  right: 16,
  zIndex: 99999,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  pointerEvents: 'none',
}

const BASE_TOAST_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '12px 16px',
  borderRadius: 8,
  fontSize: 14,
  lineHeight: 1.4,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  minWidth: 280,
  maxWidth: 420,
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  pointerEvents: 'auto' as const,
  animation: 'mr-toast-slide-in 0.3s ease-out',
}

const TYPE_STYLES: Record<ToastType, React.CSSProperties> = {
  success: {
    background: '#065f46',
    color: '#d1fae5',
    border: '1px solid #10b981',
  },
  error: {
    background: '#7f1d1d',
    color: '#fecaca',
    border: '1px solid #ef4444',
  },
  info: {
    background: '#1e3a5f',
    color: '#dbeafe',
    border: '1px solid #3b82f6',
  },
}

const CLOSE_BUTTON_STYLE: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'inherit',
  cursor: 'pointer',
  padding: 4,
  fontSize: 16,
  lineHeight: 1,
  opacity: 0.7,
  flexShrink: 0,
}

// --- Keyframes Injection ---

let keyframesInjected = false

function injectKeyframes() {
  if (keyframesInjected || typeof document === 'undefined') return
  const style = document.createElement('style')
  style.textContent = `
    @keyframes mr-toast-slide-in {
      from { opacity: 0; transform: translateX(100%); }
      to { opacity: 1; transform: translateX(0); }
    }
  `
  document.head.appendChild(style)
  keyframesInjected = true
}

// --- Provider ---

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const addToast = useCallback((type: ToastType, message: string) => {
    injectKeyframes()
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const contextValue: ToastContextValue = {
    error: useCallback((msg: string) => addToast('error', msg), [addToast]),
    success: useCallback((msg: string) => addToast('success', msg), [addToast]),
    info: useCallback((msg: string) => addToast('info', msg), [addToast]),
  }

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toasts.length > 0 && (
        <div style={CONTAINER_STYLE}>
          {toasts.map(toast => (
            <div
              key={toast.id}
              style={{ ...BASE_TOAST_STYLE, ...TYPE_STYLES[toast.type] }}
              role="alert"
            >
              <span>{toast.message}</span>
              <button
                style={CLOSE_BUTTON_STYLE}
                onClick={() => removeToast(toast.id)}
                aria-label="Close notification"
              >
                &#x2715;
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}

// --- Hook ---

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
