import { getUpcomingEvents } from '@/lib/events'
import MemberNav from '@/components/MemberNav'
import EventsBrowser from './EventsBrowser'

// "Open now" status turns over on the minute.
export const revalidate = 0

export default async function EventsPage() {
  const events = await getUpcomingEvents()

  return (
    <>
      <MemberNav />
      <EventsBrowser events={events} />
    </>
  )
}
