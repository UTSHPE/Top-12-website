import { NextResponse } from 'next/server';
import { google } from 'googleapis';

export async function POST(request: Request) {
  try {

    const { title, location, calendarStart, calendarEnd } = await request.json();

    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;
    const calendarId = process.env.GOOGLE_CALENDAR_ID;

    if (!clientEmail || !privateKey || !calendarId) {
      return NextResponse.json(
        { error: 'Backend Server Configuration Missing: Check environment keys.' },
        { status: 500 }
      );
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/calendar.events']
    });

    const calendar = google.calendar({ version: 'v3', auth });

    const eventPayload = {
      summary: title,
      location: location,
      start: {
        dateTime: calendarStart,    
        timeZone: 'America/Chicago', // Standard Central Time
      },
      end: {
        dateTime: calendarEnd,
        timeZone: 'America/Chicago',
      },
    };

    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: eventPayload,
    });

    
    return NextResponse.json({ 
      success: true, 
      googleEventId: response.data.id 
    });

  } catch (error: any) {
    console.error('Google Calendar Sync Error:', error);
    return NextResponse.json(
      { error: `Google API Transaction Failed: ${error.message}` },
      { status: 500 }
    );
  }
}