import { useCallback, useState } from 'react'

interface Toast {
  id: string
  title?: string
  description?: string
  type?: 'default' | 'success' | 'error' | 'warning'
  duration?: number
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback(({ title, description, type = 'default', duration = 5000 }: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast: Toast = { id, title, description, type, duration }
    
    setToasts(prev => [...prev, newToast])
    
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== id))
      }, duration)
    }
    
    return id
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }, [])

  const success = useCallback((title?: string, description?: string) => {
    return toast({ title, description, type: 'success' })
  }, [toast])

  const error = useCallback((title?: string, description?: string) => {
    return toast({ title, description, type: 'error' })
  }, [toast])

  const warning = useCallback((title?: string, description?: string) => {
    return toast({ title, description, type: 'warning' })
  }, [toast])

  return {
    toasts,
    toast,
    dismiss,
    success,
    error,
    warning
  }
}
