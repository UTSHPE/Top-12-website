import { getOfficer } from '@/lib/officer'
import AdminTopbar from '@/app/admin/AdminTopbar'
import CreateEventForm from './CreateEventForm'

export const revalidate = 0

export default async function CreateEventPage() {
  const officer = await getOfficer()

  return (
    <>
      <AdminTopbar
        title="Create event"
        subtitle="Members check in with the code this generates"
      />
      {/* Pre-fill the host with whoever is signed in — it's right most of the
          time and stays editable when an officer files an event for someone else. */}
      <CreateEventForm officerName={officer?.name ?? ''} />
    </>
  )
}
