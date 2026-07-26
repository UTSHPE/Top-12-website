/**
 * The officer-side variant of the signature access-code component. The dashed
 * orange treatment is the app's shorthand for "this is a code to share" — it
 * never appears on a field a member types into.
 */

type Size = 'sm' | 'lg' | 'xl'

// `xl` is the present-on-a-projector variant. It sizes with clamp() rather than
// a transform so the tiles occupy the box they actually draw in — scaling with
// `transform` leaves the layout box at its original size, which makes the code
// collide with whatever sits above and below it.
const SIZES: Record<Size, { tile: string; gap: string; border: string }> = {
  sm: {
    tile: 'h-[34px] w-[26px] rounded-[7px] text-base',
    gap: 'gap-1.5',
    border: 'border-2',
  },
  lg: {
    tile: 'h-16 w-[52px] rounded-[11px] text-[32px]',
    gap: 'gap-2.5',
    border: 'border-2',
  },
  xl: {
    tile: 'h-[clamp(72px,20vh,200px)] w-[clamp(46px,11vw,150px)] rounded-[clamp(10px,1.6vw,22px)] text-[clamp(30px,8vw,104px)]',
    gap: 'gap-[clamp(5px,1.4vw,18px)]',
    border: 'border-[3px]',
  },
}

export default function CodeDisplay({
  code,
  size = 'lg',
  tone = 'dark',
}: {
  code: string
  size?: Size
  /** Glyph color — `dark` for placement on the ink card, `light` on surfaces. */
  tone?: 'dark' | 'light'
}) {
  const { tile, gap, border } = SIZES[size]

  return (
    <div className={`flex max-w-full justify-center ${gap}`}>
      {code.split('').map((char, i) => (
        <span
          key={i}
          className={`flex flex-none items-center justify-center border-dashed border-primary-bright bg-primary-bright/15 font-mono leading-none font-bold ${tile} ${border} ${
            tone === 'dark' ? 'text-white' : 'text-ink'
          }`}
        >
          {char}
        </span>
      ))}
    </div>
  )
}
