export interface GmailMessage {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  internalDate: string;
  labelIds: string[];
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime: string;
}

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
}

async function googleFetch<T>(url: string, providerToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${providerToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google API error ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

function parseHeader(headers: Array<{ name: string; value: string }> | undefined, name: string): string {
  if (!headers) return "";
  const row = headers.find((header) => header.name.toLowerCase() === name.toLowerCase());
  return row?.value ?? "";
}

export async function fetchGmailMessages(providerToken: string, maxResults = 20): Promise<GmailMessage[]> {
  const listData = await googleFetch<{ messages?: Array<{ id: string }> }>(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=newer_than:14d`,
    providerToken
  );

  const messageIds = listData.messages ?? [];
  if (messageIds.length === 0) return [];

  const details = await Promise.all(
    messageIds.map((message) =>
      googleFetch<{
        id: string;
        snippet: string;
        internalDate: string;
        labelIds?: string[];
        payload?: { headers?: Array<{ name: string; value: string }> };
      }>(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${message.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
        providerToken
      )
    )
  );

  return details.map((item) => ({
    id: item.id,
    subject: parseHeader(item.payload?.headers, "Subject") || "(no subject)",
    from: parseHeader(item.payload?.headers, "From") || "Unknown sender",
    snippet: item.snippet ?? "",
    internalDate: item.internalDate,
    labelIds: item.labelIds ?? [],
  }));
}

export async function fetchGoogleDriveFiles(providerToken: string, pageSize = 25): Promise<GoogleDriveFile[]> {
  const data = await googleFetch<{
    files?: Array<{
      id: string;
      name: string;
      mimeType: string;
      webViewLink?: string;
      modifiedTime?: string;
    }>;
  }>(
    `https://www.googleapis.com/drive/v3/files?pageSize=${pageSize}&fields=files(id,name,mimeType,webViewLink,modifiedTime)&orderBy=modifiedTime desc`,
    providerToken
  );

  return (data.files ?? []).map((file) => ({
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    webViewLink: file.webViewLink,
    modifiedTime: file.modifiedTime ?? new Date().toISOString(),
  }));
}

export async function fetchGoogleCalendarEvents(
  providerToken: string,
  timeMin: string,
  timeMax: string,
  maxResults = 100
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    maxResults: String(maxResults),
    singleEvents: "true",
    orderBy: "startTime",
  });

  const data = await googleFetch<{
    items?: Array<GoogleCalendarEvent>;
  }>(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, providerToken);

  return data.items ?? [];
}
