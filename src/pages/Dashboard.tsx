import React, { useEffect, useLayoutEffect, useMemo, useState, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { emailEvents } from "@/lib/emailEvents";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListChecks, CalendarClock, Mail, StickyNote, AlertTriangle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface DashboardSummary {
  todaysTasks: DashboardTask[];
  todaysMeetings: DashboardMeeting[];
  importantEmails: DashboardEmail[];
  notesSummary: DashboardNote[];
  priorityTasks: DashboardTask[];
  updatedAt: string;
}
interface DashboardTask    { id: string; title: string; priority?: string; category?: string; }
interface DashboardMeeting { id: string; title: string; startAt: string;  category?: string; }
interface DashboardEmail   { id: string; subject: string; sender: string; category?: string; tags?: string; }
interface DashboardNote    { id: string; title: string; category?: string; }

// Masonry layout with a pinned item.
// The child with data-pin="top-right" is always placed at the top of the
// right column; every other child flows into whichever column is shortest.
function MasonryGrid({ children, columns = 2, gap = 16 }: {
  children: React.ReactNode;
  columns?: number;
  gap?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const layout = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const all = Array.from(container.children) as HTMLElement[];
    if (!all.length) return;

    const totalWidth = container.offsetWidth;
    if (!totalWidth) return;

    const colWidth = (totalWidth - gap * (columns - 1)) / columns;

    // Pass 1: set all widths so heights are accurate.
    all.forEach((item) => {
      item.style.position = "absolute";
      item.style.width = `${colWidth}px`;
      item.style.visibility = "hidden";
    });

    // Force reflow so offsetHeight values are up-to-date.
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    container.offsetHeight;

    const colHeights = Array<number>(columns).fill(0);
    const rightCol = columns - 1;
    const rightX = rightCol * (colWidth + gap);

    // Pass 2a: pin "top-right" item to top of right column first.
    const pinned = all.find((el) => el.dataset.pin === "top-right");
    if (pinned) {
      pinned.style.left = `${rightX}px`;
      pinned.style.top  = "0px";
      pinned.style.visibility = "";
      colHeights[rightCol] = pinned.offsetHeight + gap;
    }

    // Pass 2b: sort remaining items tallest-first so content-rich cards
    // rise to the top, then flow each into the shortest column.
    const rest = all
      .filter((el) => el.dataset.pin !== "top-right")
      .sort((a, b) => b.offsetHeight - a.offsetHeight);

    rest.forEach((item) => {
      const col = colHeights.indexOf(Math.min(...colHeights));
      item.style.left = `${col * (colWidth + gap)}px`;
      item.style.top  = `${colHeights[col]}px`;
      item.style.visibility = "";
      colHeights[col] += item.offsetHeight + gap;
    });

    container.style.height = `${Math.max(...colHeights) - gap}px`;
  }, [columns, gap]);

  useLayoutEffect(() => {
    layout();
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => { layout(); });
    ro.observe(container);
    Array.from(container.children).forEach((c) => ro.observe(c));
    return () => ro.disconnect();
  }, [layout, children]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {children}
    </div>
  );
}

export default function Dashboard() {
  const { user, msProviderToken, googleProviderToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary>({
    todaysTasks: [], todaysMeetings: [], importantEmails: [],
    notesSummary: [], priorityTasks: [], updatedAt: new Date().toISOString(),
  });

  // Fetch summary only, no provider sync — used for rollbacks and cross-tab updates
  const fetchSummary = useCallback(async () => {
    try {
      setError(null);
      const data = await api.dashboard.summary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  // Full sync + fetch — runs on mount and every 60s
  const load = useCallback(async () => {
    try {
      setError(null);
      const now = new Date();
      const syncCalls: Array<Promise<unknown>> = [];
      if (msProviderToken) {
        syncCalls.push(api.sync.microsoftCalendar({ year: now.getFullYear(), month: now.getMonth() + 1, providerToken: msProviderToken }));
        syncCalls.push(api.sync.microsoftWorkspace({ providerToken: msProviderToken }));
      }
      if (googleProviderToken) {
        syncCalls.push(api.sync.googleWorkspace({ year: now.getFullYear(), month: now.getMonth() + 1, providerToken: googleProviderToken }));
      }
      if (syncCalls.length > 0) await Promise.allSettled(syncCalls);
      const data = await api.dashboard.summary();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, [msProviderToken, googleProviderToken]);

  useEffect(() => {
    if (!user) return;
    load();
    const interval = window.setInterval(load, 60000);
    return () => window.clearInterval(interval);
  }, [user, load]);

  // Stay in sync with the Emails tab
  useEffect(() => {
    const unsubDeleted = emailEvents.onDeleted((id) => {
      setSummary((prev) => ({
        ...prev,
        importantEmails: prev.importantEmails.filter((e) => e.id !== id),
      }));
    });
    const unsubRefresh = emailEvents.onRefresh(() => {
      fetchSummary();
    });
    return () => {
      unsubDeleted();
      unsubRefresh();
    };
  }, [fetchSummary]);

  const deleteEmail = async (id: string) => {
    // Optimistic remove
    setSummary((prev) => ({
      ...prev,
      importantEmails: prev.importantEmails.filter((e) => e.id !== id),
    }));
    // Tell the Emails tab immediately
    emailEvents.emitDeleted(id);
    try {
      await api.emails.delete(id);
      toast.success("Email deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete email");
      // Roll back with a summary-only fetch (no provider sync, which would restore the email)
      fetchSummary();
      emailEvents.emitRefresh();
    }
  };

  const statCards = useMemo(() => [
    { title: "Today's Tasks",    value: summary.todaysTasks.length,     icon: <ListChecks    className="h-4 w-4" /> },
    { title: "Today's Meetings", value: summary.todaysMeetings.length,  icon: <CalendarClock className="h-4 w-4" /> },
    { title: "Important Emails", value: summary.importantEmails.length, icon: <Mail          className="h-4 w-4" /> },
    { title: "Priority Tasks",   value: summary.priorityTasks.length,   icon: <AlertTriangle className="h-4 w-4" /> },
  ], [summary]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading dashboard...</div>;
  if (error)   return <div className="text-sm text-destructive">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-xs text-muted-foreground">
          Auto-updated: {format(new Date(summary.updatedAt), "MMM d, h:mm a")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{card.title}</p>
                {card.icon}
              </div>
              <p className="mt-2 text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <MasonryGrid gap={16}>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarClock className="h-4 w-4" />Today's Meetings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {summary.todaysMeetings.length === 0 ? (
                <p className="text-sm text-muted-foreground">No meetings today</p>
              ) : summary.todaysMeetings.map((m) => (
                <div key={m.id} className="rounded-md border p-2">
                  <p className="text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(m.startAt), "h:mm a")}</p>
                  {m.category && <Badge variant="outline" className="mt-1">{m.category}</Badge>}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />Priority Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {summary.priorityTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No high priority tasks</p>
              ) : summary.priorityTasks.map((t) => (
                <div key={t.id} className="rounded-md border p-2">
                  <p className="text-sm font-medium">{t.title}</p>
                  <div className="flex gap-1 mt-1">
                    {t.priority && <Badge variant="destructive">{t.priority}</Badge>}
                    {t.category && <Badge variant="outline">{t.category}</Badge>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div data-pin="top-right">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" />Important Emails
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {summary.importantEmails.length === 0 ? (
                <p className="text-sm text-muted-foreground">No important emails</p>
              ) : summary.importantEmails.map((e) => (
                <div key={e.id} className="rounded-md border p-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{e.subject}</p>
                    <p className="text-xs text-muted-foreground truncate">{e.sender}</p>
                    {e.category && <Badge variant="secondary" className="mt-1">{e.category}</Badge>}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteEmail(e.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <StickyNote className="h-4 w-4" />Notes Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {summary.notesSummary.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes</p>
              ) : summary.notesSummary.map((n) => (
                <div key={n.id} className="rounded-md border p-2">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.category && <Badge variant="outline" className="mt-1">{n.category}</Badge>}
                </div>
              ))}
            </CardContent>
          </Card>

      </MasonryGrid>
    </div>
  );
}