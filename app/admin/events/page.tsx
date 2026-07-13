import { createClient } from '@supabase/supabase-js';


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const revalidate = 0;

export default async function OfficerAnalyticsPage() {
  //Fetch all historical chapter events, sorting with the newest meetings on top
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('*')
    .order('calendar_start', { ascending: false });

  if (eventsError) {
    return <div style={{ padding: '20px', color: 'red' }}>Error loading database events: {eventsError.message}</div>;
  }

  //For each event row, compile headcounts and total points concurrently
  const analyticsData = await Promise.all(
    events.map(async (event) => {
      const { count, error: countError } = await supabase
        .from('sign_ins')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', event.id);

      //Retrieve the point values for this event to sum overall distribution weights
      const { data: signIns, error: pointsError } = await supabase
        .from('sign_ins')
        .select('points_earned')
        .eq('event_id', event.id);

      if (countError || pointsError) {
        console.error(`Error calculating attendance aggregates for event ID ${event.id}`);
      }

      const totalPointsDistributed = signIns
        ? signIns.reduce((sum, item) => sum + Number(item.points_earned), 0)
        : 0;

      return {
        ...event,
        headcount: count || 0,
        totalPoints: totalPointsDistributed,
      };
    })
  );

  return (
    <div style={{ maxWidth: '1000px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#bf5700' }}>UT SHPE Attendance & Engagement Analytics</h2>
      <p style={{ color: '#666' }}>High-level overview of chapter turnouts and point distributions for the Top 12 Executive Board.</p>
      
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', textAlign: 'left' }}>
        <thead>
          <tr style={{ backgroundColor: '#f4f4f4', borderBottom: '2px solid #ccc' }}>
            <th style={{ padding: '12px' }}>Event Title</th>
            <th style={{ padding: '12px' }}>Type</th>
            <th style={{ padding: '12px' }}>Date</th>
            <th style={{ padding: '12px', color: '#bf5700' }}>True Headcount</th>
            <th style={{ padding: '12px' }}>Total Points Distributed</th>
            <th style={{ padding: '12px' }}>Multiplier</th>
          </tr>
        </thead>
        <tbody>
          {analyticsData.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                No active events found in your Supabase directory logs.
              </td>
            </tr>
          ) : (
            analyticsData.map((event) => (
              <tr key={event.id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '12px', fontWeight: 'bold' }}>{event.title}</td>
                <td style={{ padding: '12px' }}>{event.event_type}</td>
                <td style={{ padding: '12px' }}>
                  {new Date(event.calendar_start).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </td>
                <td style={{ padding: '12px', fontWeight: 'bold', fontSize: '16px', color: '#bf5700' }}>
                  {event.headcount} members
                </td>
                <td style={{ padding: '12px' }}>{event.totalPoints} pts</td>
                <td style={{ padding: '12px', color: '#666' }}>{Number(event.multiplier).toFixed(1)}x</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}