import { supabase } from "@/integrations/supabase/client";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, "") || "/api";

export interface MSCalendarEvent {
  id: string;
  subject: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  isAllDay: boolean;
  bodyPreview: string;
  webLink: string;
  location?: { displayName: string };
}

export interface EmailRecord {
  id: string;
  sender: string;
  subject: string;
  bodySummary: string;
  provider: string;
  isImportant: boolean;
  category: string;
  tags: string;
  source: string;
  receivedAt: string;
}

export interface CalendarEventRecord {
  id: string;
  title: string;
  description: string;
  provider: string;
  category: string;
  tags: string;
  startAt: string;
  endAt: string;
}

export interface FileRecord {
  id: string;
  name: string;
  mimeType: string;
  provider: string;
  webUrl: string;
  category: string;
  tags: string;
  modifiedAt: string;
}

export interface MicrosoftSyncResult {
  success: boolean;
  period: { year: number; month: number };
  totals: Record<string, number>;
  syncedAt: string;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeader();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...(options.headers as Record<string, string> ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

export const api = {
  dashboard: {
    summary: () => apiFetch<any>("/dashboard/summary"),
  },
  calendar: {
    listMicrosoftMonthEvents: (params: { year: number; month: number; providerToken: string }) =>
      apiFetch<{ events: MSCalendarEvent[] }>(
        `/ms-calendar/events?year=${params.year}&month=${params.month}`,
        {
          headers: {
            "X-Provider-Token": params.providerToken,
          },
        }
      ),
  },
  sync: {
    microsoftCalendar: (params: { year: number; month: number; providerToken: string }) =>
      apiFetch<MicrosoftSyncResult>(
        `/sync/microsoft/calendar?year=${params.year}&month=${params.month}`,
        {
          method: "POST",
          headers: {
            "X-Provider-Token": params.providerToken,
          },
        }
      ),
    googleWorkspace: (params: { year: number; month: number; providerToken: string }) =>
      apiFetch<MicrosoftSyncResult>(
        `/sync/google/workspace?year=${params.year}&month=${params.month}`,
        {
          method: "POST",
          headers: {
            "X-Provider-Token": params.providerToken,
          },
        }
      ),
    microsoftWorkspace: (params: { providerToken: string }) =>
      apiFetch<MicrosoftSyncResult>(
        `/sync/microsoft/workspace`,
        {
          method: "POST",
          headers: {
            "X-Provider-Token": params.providerToken,
          },
        }
      ),
  },
  projects: {
    list: () => apiFetch<any[]>("/projects"),
    create: (data: any) => apiFetch<any>("/projects", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => apiFetch<any>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch<any>(`/projects/${id}`, { method: "DELETE" }),
  },
  tasks: {
    list: () => apiFetch<any[]>("/tasks"),
    create: (data: any) => apiFetch<any>("/tasks", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => apiFetch<any>(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch<any>(`/tasks/${id}`, { method: "DELETE" }),
  },
  notes: {
    list: () => apiFetch<any[]>("/notes"),
    create: (data: any) => apiFetch<any>("/notes", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => apiFetch<any>(`/notes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch<any>(`/notes/${id}`, { method: "DELETE" }),
  },
  links: {
    list: () => apiFetch<any[]>("/links"),
    create: (data: any) => apiFetch<any>("/links", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => apiFetch<any>(`/links/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch<any>(`/links/${id}`, { method: "DELETE" }),
  },
  emails: {
    list: () => apiFetch<EmailRecord[]>("/emails"),
    create: (data: any) => apiFetch<EmailRecord>("/emails", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => apiFetch<EmailRecord>(`/emails/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch<any>(`/emails/${id}`, { method: "DELETE" }),
  },
  calendarEvents: {
    list: () => apiFetch<CalendarEventRecord[]>("/calendar-events"),
    create: (data: any) => apiFetch<CalendarEventRecord>("/calendar-events", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => apiFetch<CalendarEventRecord>(`/calendar-events/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch<any>(`/calendar-events/${id}`, { method: "DELETE" }),
  },
  files: {
    list: () => apiFetch<FileRecord[]>("/files"),
    listAll: () => apiFetch<FileRecord[]>("/files"),
    create: (data: any) => apiFetch<FileRecord>("/files", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: any) => apiFetch<FileRecord>(`/files/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch<any>(`/files/${id}`, { method: "DELETE" }),
  },
  customTags: {
    list: () => apiFetch<any[]>("/custom-tags"),
    create: (data: any) => apiFetch<any>("/custom-tags", { method: "POST", body: JSON.stringify(data) }),
    delete: (id: string) => apiFetch<any>(`/custom-tags/${id}`, { method: "DELETE" }),
  },
};
