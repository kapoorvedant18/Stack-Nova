export interface MSCalendarEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  isAllDay: boolean;
  bodyPreview: string;
  webLink: string;
  location?: { displayName: string };
  organizer?: { emailAddress: { name: string; address: string } };
}

export async function fetchMicrosoftCalendarEvents(
  providerToken: string,
  startDate: string, // ISO string e.g. "2026-02-01T00:00:00.000Z"
  endDate: string    // ISO string e.g. "2026-02-28T23:59:59.999Z"
): Promise<MSCalendarEvent[]> {
  const params = new URLSearchParams({
    startDateTime: startDate,
    endDateTime: endDate,
    $select: "id,subject,start,end,isAllDay,bodyPreview,webLink,location,organizer",
    $orderby: "start/dateTime asc",
    $top: "100",
  });

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/me/calendarView?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${providerToken}`,
        "Content-Type": "application/json",
        Prefer: 'outlook.timezone="UTC"',
      },
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Microsoft Graph API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  return data.value as MSCalendarEvent[];
}
