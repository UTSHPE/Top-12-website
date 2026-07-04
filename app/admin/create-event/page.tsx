'use client'; //executes code on web browser of user

import { useState } from 'react';   
import { createClient } from '@supabase/supabase-js'; //communication with db

// Initialize the browser pipeline client using your .env.local keys
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function CreateEventPage() {
  // Core Information States
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [eventType, setEventType] = useState('General Meeting');
  const [officerName, setOfficerName] = useState('');
  const [multiplier, setMultiplier] = useState(1.0);

  // Time Parameter Configuration States
  const [eventDate, setEventDate] = useState('');      // YYYY-MM-DD
  const [startTime, setStartTime] = useState('');      // HH:MM
  const [endTime, setEndTime] = useState('');        // HH:MM

  // Relative Menu Dropdown Buffer States (Offsets in minutes)
  const [startBuffer, setStartBuffer] = useState(5);   // Minutes before
  const [endBuffer, setEndBuffer] = useState(15);      // Minutes after

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage('');

    try {
      // 1. Anchor the baseline public event window boundaries
      const calendarStart = new Date(`${eventDate}T${startTime}`);
      const calendarEnd = new Date(`${eventDate}T${endTime}`);

      // 2. Compute dynamic check-in absolute timestamps using your minute dropdown rules
      const checkInStart = new Date(calendarStart.getTime() - startBuffer * 60000);
      const checkInEnd = new Date(calendarStart.getTime() + endBuffer * 60000);

      // 3. Generate a secure, unique 6-character access string
      const generatedCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // 4. Fire the record payload to your Supabase events table
      const { error } = await supabase.from('events').insert([
        {
          title,
          location,
          event_type: eventType,
          created_by_officer: officerName,
          access_code: generatedCode,
          base_points: 1,
          multiplier: Number(multiplier),
          check_in_start: checkInStart.toISOString(),
          check_in_end: checkInEnd.toISOString(),
          calendar_start: calendarStart.toISOString(),
          calendar_end: calendarEnd.toISOString(),
        },
      ]);

      if (error) throw error;

      setStatusMessage(`🎉 Event successfully created! Access Code: ${generatedCode}`);
      
      // Clear out inputs for the next entry
      setTitle('');
      setLocation('');
    } catch (err: any) {
      setStatusMessage(`❌ Database Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#bf5700' }}>UT SHPE Event Creator Dashboard</h2>
      <p style={{ fontSize: '14px', color: '#666' }}>Fill out the details below to initialize an event tracking channel.</p>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        <label>
          <strong>Event Title:</strong>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '4px' }} placeholder="e.g., Technical Resume Workshop" />
        </label>

        <label>
          <strong>Location:</strong>
          <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '4px' }} placeholder="e.g., EER 1.516" />
        </label>

        <div style={{ display: 'flex', gap: '10px' }}>
          <label style={{ flex: 1 }}>
            <strong>Event Type:</strong>
            <select value={eventType} onChange={(e) => setEventType(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '4px' }}>
              <option value="General Meeting">General Meeting</option>
              <option value="Technical">Technical Workshop</option>
              <option value="Academic">Academic / Study Night</option>
              <option value="Social">Social Event</option>
            </select>
          </label>

          <label style={{ flex: 1 }}>
            <strong>Point Multiplier:</strong>
            <select value={multiplier} onChange={(e) => setMultiplier(Number(e.target.value))} style={{ width: '100%', padding: '8px', marginTop: '4px' }}>
              <option value="1.0">1.0x (Standard)</option>
              <option value="1.5">1.5x (Special)</option>
              <option value="2.0">2.0x (High Priority)</option>
              <option value="3.0">3.0x (Marquee Event)</option>
            </select>
          </label>
        </div>

        <label>
          <strong>Your Name (Officer):</strong>
          <input type="text" value={officerName} onChange={(e) => setOfficerName(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '4px' }} placeholder="e.g., Internal VP" />
        </label>

        <hr style={{ border: '0', borderTop: '1px solid #ccc', margin: '10px 0' }} />

        <label>
          <strong>Event Date:</strong>
          <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
        </label>

        <div style={{ display: 'flex', gap: '10px' }}>
          <label style={{ flex: 1 }}>
            <strong>Start Time:</strong>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
          </label>

          <label style={{ flex: 1 }}>
            <strong>End Time:</strong>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '4px' }} />
          </label>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <label style={{ flex: 1 }}>
            <strong>Open Check-in:</strong>
            <select value={startBuffer} onChange={(e) => setStartBuffer(Number(e.target.value))} style={{ width: '100%', padding: '8px', marginTop: '4px' }}>
              <option value="5">5 minutes before</option>
              <option value="10">10 minutes before</option>
              <option value="15">15 minutes before</option>
            </select>
          </label>

          <label style={{ flex: 1 }}>
            <strong>Close Check-in:</strong>
            <select value={endBuffer} onChange={(e) => setEndBuffer(Number(e.target.value))} style={{ width: '100%', padding: '8px', marginTop: '4px' }}>
              <option value="5">5 minutes after start</option>
              <option value="10">10 minutes after start</option>
              <option value="15">15 minutes after start</option>
            </select>
          </label>
        </div>

        <button type="submit" disabled={loading} style={{ background: '#bf5700', color: 'white', padding: '12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', marginTop: '10px' }}>
          {loading ? 'Processing Pipeline...' : 'Generate and Deploy Event'}
        </button>
      </form>

      {statusMessage && (
        <div style={{ marginTop: '20px', padding: '12px', borderRadius: '4px', backgroundColor: '#f0f0f0', borderLeft: '5px solid #bf5700', wordBreak: 'break-word', fontWeight: 'bold' }}>
          {statusMessage}
        </div>
      )}
    </div>
  );
}