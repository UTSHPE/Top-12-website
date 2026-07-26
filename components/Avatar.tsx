/**
 * Monogram disc.
 *
 * The design mockups use hand-drawn character illustrations for officers. Those
 * are explicitly placeholder art tied to fictional people, so real members get
 * the documented monogram fallback instead — swap this for per-officer
 * illustrations once the chapter has them.
 */

const PALETTES = [
  { bg: '#F5EFE6', fg: '#BF5700' },
  { bg: '#EAF0FA', fg: '#1F5FB8' },
  { bg: '#E7F0F6', fg: '#4F87A8' },
] as const

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Stable per-name tint so the same person keeps the same disc color. */
function paletteFor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return PALETTES[hash % PALETTES.length]
}

export default function Avatar({
  name,
  size = 40,
  className = '',
}: {
  name: string
  size?: number
  className?: string
}) {
  const { bg, fg } = paletteFor(name)

  return (
    <span
      title={name}
      className={`flex flex-none items-center justify-center rounded-full font-bold ${className}`}
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize: Math.max(11, Math.round(size * 0.32)),
      }}
    >
      {initialsOf(name)}
    </span>
  )
}
