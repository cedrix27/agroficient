'use client'

import { useEffect } from 'react'

export type ToastState = {
  open: boolean
  message: string
  type: 'success' | 'error'
}

export default function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  useEffect(() => {
    if (!toast.open) return
    const id = setTimeout(onClose, 2800)
    return () => clearTimeout(id)
  }, [toast.open, onClose])

  if (!toast.open) return null

  return (
    <div className={`toast ${toast.type}`} role="status" aria-live="polite">
      {toast.message}
    </div>
  )
}
