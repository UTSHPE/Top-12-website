'use client'

/**
 * The event form's shared field primitives.
 *
 * Extracted from CreateEventForm so the edit screen renders the same inputs
 * rather than a lookalike set that drifts. The create form is still the
 * reference for how they're composed — this file only owns what they look like.
 */

export const INPUT =
  'w-full rounded-[10px] border-[1.5px] border-line bg-surface px-[13px] py-[11px] text-[15px] font-semibold outline-none transition-colors focus:border-primary-bright'
export const LABEL = 'mb-1.5 block text-[13px] font-semibold text-muted'

export function Panel({
  eyebrow,
  color,
  Icon,
  children,
}: {
  eyebrow: string
  color: string
  Icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[14px] bg-surface-2 p-5">
      <h2
        className="font-display mb-4 flex items-center gap-1.5 text-[13px] font-bold tracking-[.06em] uppercase"
        style={{ color }}
      >
        <Icon className="size-3.5" />
        {eyebrow}
      </h2>
      <div className="flex flex-col gap-3.5">{children}</div>
    </section>
  )
}

export function DateField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (next: string) => void
}) {
  return (
    <div>
      <label className={LABEL} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
        className={`${INPUT} text-sm`}
      />
    </div>
  )
}
