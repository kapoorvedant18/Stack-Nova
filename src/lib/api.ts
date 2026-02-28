import { supabase } from "@/integrations/supabase/client";

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = await getAuthHeader();
  const res = await fetch(`/api${path}`, {
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
    delete: (id: string) => apiFetch<any>(`/links/${id}`, { method: "DELETE" }),
  },
};
