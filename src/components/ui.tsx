import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { formatMoney } from '../game/money'

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function useFocusHeading() {
  const ref = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [])
  return ref
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost'
}

export function Button({ variant = 'primary', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 text-base font-semibold transition active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary' && 'bg-lemon text-ink shadow-[0_4px_0_#e0b000]',
        variant === 'secondary' && 'bg-card text-ink shadow-[0_0_0_1.5px_#eadcc6]',
        variant === 'ghost' && 'bg-transparent text-teal shadow-none',
        className,
      )}
      {...props}
    />
  )
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="grove flex min-h-dvh justify-center">
      <div className="relative flex min-h-dvh w-full max-w-[440px] flex-col bg-cream shadow-[0_0_0_1px_rgba(28,25,21,0.05),0_24px_80px_rgba(90,55,10,0.12)]">
        {children}
      </div>
    </div>
  )
}

export function Dock({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="h-48 shrink-0" aria-hidden="true" />
      <div className="fixed bottom-0 left-1/2 z-30 w-full max-w-[440px] -translate-x-1/2 border-t border-line/80 bg-cream/95 px-4 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] backdrop-blur-md">
        {children}
      </div>
    </>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx('rounded-3xl bg-card p-4 shadow-[0_0_0_1.5px_#eadcc6]', className)}>{children}</section>
}

export function Money({ cents, className }: { cents: number; className?: string }) {
  return <span className={cx(cents < 0 && 'text-coral', className)}>{formatMoney(cents)}</span>
}

export function Meter({ label, value, caption }: { label: string; value: number; caption: string }) {
  const rounded = Math.round(value)
  const tone = rounded >= 75 ? 'bg-leaf' : rounded >= 50 ? 'bg-lemon-deep' : 'bg-coral'
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <span className="font-semibold">{label}</span>
        <span className="font-mono text-sm">{rounded}</span>
      </div>
      <div
        className="h-3 overflow-hidden rounded-full bg-sand"
        role="meter"
        aria-valuenow={rounded}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className={cx('h-full rounded-full', tone)} style={{ width: `${Math.min(100, Math.max(0, rounded))}%` }} />
      </div>
      <p className="mt-1 text-sm text-ink-soft">{caption}</p>
    </div>
  )
}

export function Stepper({
  label,
  value,
  onDec,
  onInc,
  decLabel,
  incLabel,
  disableDec,
  disableInc,
}: {
  label: string
  value: number
  onDec: () => void
  onInc: () => void
  decLabel: string
  incLabel: string
  disableDec?: boolean
  disableInc?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-card px-3 py-2 shadow-[0_0_0_1.5px_#eadcc6]">
      <span className="font-semibold">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label={decLabel}
          onClick={onDec}
          disabled={disableDec}
          className="grid h-12 w-12 place-items-center rounded-xl bg-sand text-2xl leading-none font-semibold disabled:opacity-40"
        >
          −
        </button>
        <span className="w-10 text-center font-display text-2xl font-semibold">{value}</span>
        <button
          type="button"
          aria-label={incLabel}
          onClick={onInc}
          disabled={disableInc}
          className="grid h-12 w-12 place-items-center rounded-xl bg-sand text-2xl leading-none font-semibold disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  )
}
