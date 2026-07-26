import Image from 'next/image'

/**
 * The SHPE lockup.
 *
 * The design calls for a co-branded UT SHPE lockup (`navbar_logo.png`) that
 * isn't in the repo yet, and that mark must not be recolored or cropped — so
 * this uses the chapter's SHPE lockup until the real asset is dropped into
 * `public/`. Only the `src` below needs to change when it is.
 */
const SRC = '/SHPE-logo2.png'
const ASPECT = 987 / 311

export default function Logo({
  height = 30,
  /** Sits the lockup on a white chip, for placement on ink or orange. */
  chip = false,
  className = '',
}: {
  height?: number
  chip?: boolean
  className?: string
}) {
  return (
    <span
      className={`inline-flex flex-none items-center ${
        chip ? 'rounded-sm bg-white px-2.5 py-[5px]' : ''
      } ${className}`}
    >
      <Image
        src={SRC}
        alt="UT SHPE"
        width={Math.round(height * ASPECT)}
        height={height}
        priority
        style={{ height, width: 'auto' }}
      />
    </span>
  )
}
