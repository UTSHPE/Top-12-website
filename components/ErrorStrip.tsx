import { FaCircleInfo } from 'react-icons/fa6'

/**
 * Inline problem notice. The copy stays calm and specific — it tells someone
 * what to do next rather than announcing a failure.
 */
export default function ErrorStrip({
  title,
  detail,
}: {
  title: string
  detail: string
}) {
  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-md border-l-4 border-error bg-surface px-[18px] py-3.5 shadow-[0_3px_10px_rgba(0,0,0,.05)]"
    >
      <FaCircleInfo aria-hidden className="size-[17px] flex-none text-error" />
      <p className="text-sm text-body">
        <b className="text-ink">{title}</b> {detail}
      </p>
    </div>
  )
}
