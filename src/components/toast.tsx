import { useEffect, useState } from 'react'

/** How long a toast stays on screen. */
export const TOAST_MS = 3500

type Listener = (toast: { id: number; text: string } | null) => void
const listeners = new Set<Listener>()
let current: { id: number; text: string } | null = null
let nextId = 0
let timer: ReturnType<typeof setTimeout> | null = null

function emit() {
  listeners.forEach((listener) => listener(current))
}

export function showToast(text: string) {
  nextId += 1
  current = { id: nextId, text }
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    current = null
    emit()
  }, TOAST_MS)
  emit()
}

/**
 * Rendered in the normal page flow at the top of every screen, so it pushes content down
 * instead of floating over buttons or receipts.
 */
export function ToastSlot() {
  const [toast, setToast] = useState(current)
  useEffect(() => {
    listeners.add(setToast)
    return () => {
      listeners.delete(setToast)
    }
  }, [])
  if (!toast) return null
  return (
    <p role="status" aria-live="polite" data-testid="toast" className="mx-4 mt-3 rounded-2xl bg-ink px-4 py-3 text-sm font-semibold text-cream">
      {toast.text}
    </p>
  )
}
