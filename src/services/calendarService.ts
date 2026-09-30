import { getAccessToken } from './firebaseAuth';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  htmlLink?: string;
}

/**
 * Lists upcoming morning wake-up events or general events from user's primary calendar.
 */
export async function getUpcomingCalendarEvents(): Promise<CalendarEvent[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated with Google');
  }

  const now = new Date().toISOString();
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('timeMin', now);
  url.searchParams.set('maxResults', '15');
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch Google Calendar events: ${errorText}`);
  }

  const data = await res.json();
  return (data.items || []) as CalendarEvent[];
}

/**
 * Creates a wake-up event in the user's primary Google Calendar scheduled at the alarm's Nepal Time.
 */
export async function createAlarmCalendarEvent(
  alarmLabel: string,
  nepaliTimeStr: string, // "05:40"
  repeatDays: number[]
): Promise<CalendarEvent> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated with Google');
  }

  const [hours, minutes] = nepaliTimeStr.split(':').map(Number);

  // Compute the next occurrence date in Nepal Time (UTC+5:45)
  // Current UTC time:
  const now = new Date();
  const utcNow = now.getTime() + now.getTimezoneOffset() * 60000;
  const nptNow = new Date(utcNow + 345 * 60000);

  const eventDateNpt = new Date(nptNow);
  eventDateNpt.setHours(hours, minutes, 0, 0);

  // If time already passed today in Nepal time, schedule for tomorrow
  if (eventDateNpt.getTime() <= nptNow.getTime()) {
    eventDateNpt.setDate(eventDateNpt.getDate() + 1);
  }

  // Convert NPT date back to standard ISO UTC string for API
  // eventDateNpt is local representation of Nepal time.
  const year = eventDateNpt.getFullYear();
  const month = (eventDateNpt.getMonth() + 1).toString().padStart(2, '0');
  const day = eventDateNpt.getDate().toString().padStart(2, '0');
  const hourStr = hours.toString().padStart(2, '0');
  const minStr = minutes.toString().padStart(2, '0');

  // Nepal Standard Time ISO string with offset +05:45
  const startDateTime = `${year}-${month}-${day}T${hourStr}:${minStr}:00+05:45`;

  // End time: 30 minutes after wake up
  const endMinutes = minutes + 30;
  const endH = hours + Math.floor(endMinutes / 60);
  const endM = endMinutes % 60;
  const endDateTime = `${year}-${month}-${day}T${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}:00+05:45`;

  const recurrenceRule =
    repeatDays.length > 0 && repeatDays.length < 7
      ? [
          `RRULE:FREQ=WEEKLY;BYDAY=${repeatDays
            .map((d) => ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'][d])
            .join(',')}`,
        ]
      : repeatDays.length === 7
      ? ['RRULE:FREQ=DAILY']
      : undefined;

  const eventPayload: Record<string, unknown> = {
    summary: `⏰ Prabhat Wake-Up: ${alarmLabel || 'Morning Alarm'}`,
    description: `Scheduled via Prabhat Nepali Alarm Clock.\nTime: ${nepaliTimeStr} (Nepal Standard Time, UTC+5:45).\nMandatory Photo Wake-Up Challenge enabled.`,
    start: {
      dateTime: startDateTime,
      timeZone: 'Asia/Kathmandu',
    },
    end: {
      dateTime: endDateTime,
      timeZone: 'Asia/Kathmandu',
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 0 },
        { method: 'popup', minutes: 5 },
      ],
    },
  };

  if (recurrenceRule) {
    eventPayload.recurrence = recurrenceRule;
  }

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventPayload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to create calendar event: ${errorText}`);
  }

  return (await res.json()) as CalendarEvent;
}

/**
 * Deletes a calendar event.
 * NOTE: Callers must first present a confirmation modal before calling this.
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated with Google');
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!res.ok && res.status !== 404) {
    const errorText = await res.text();
    throw new Error(`Failed to delete calendar event: ${errorText}`);
  }
}
