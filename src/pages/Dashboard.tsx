import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ListChecks, CalendarClock, Mail, StickyNote, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

interface DashboardSummary {
  todaysTasks: DashboardTask[];
  todaysMeetings: DashboardMeeting[];
  importantEmails: DashboardEmail[];
  notesSummary: DashboardNote[];
  priorityTasks: DashboardTask[];
  updatedAt: string;
}

interface DashboardTask {
  id: string;
  title: string;
  priority?: string;
  category?: string;
}

interface DashboardMeeting {
  id: string;
  title: string;
  startAt: string;
  category?: string;
}

interface DashboardEmail {
  id: string;
  subject: string;
  sender: string;
  category?: string;
}

interface DashboardNote {
  id: string;
  title: string;
  category?: string;
}

export default function Dashboard() {
  const { user, msProviderToken, googleProviderToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary>({
    todaysTasks: [],
    todaysMeetings: [],
    importantEmails: [],
    notesSummary: [],
    priorityTasks: [],
    updatedAt: new Date().toISOString(),
  });

  const load = async () => {
    try {
      setError(null);

      const now = new Date();
      const syncCalls: Array<Promise<unknown>> = [];

      if (msProviderToken) {
        syncCalls.push(
          api.sync.microsoftCalendar({
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            providerToken: msProviderToken,
          })
        );

        syncCalls.push(
          api.sync.microsoftWorkspace({
            providerToken: msProviderToken,
          })
        );
      }

      if (googleProviderToken) {
        syncCalls.push(
          api.sync.googleWorkspace({
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            providerToken: googleProviderToken,
          })
        );
      }

      if (syncCalls.length > 0) {
        await Promise.allSettled(syncCalls);
      }

      const data = await api.dashboard.summary();
      setSummary(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load dashboard";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    load();

    const interval = window.setInterval(load, 60000);
    return () => window.clearInterval(interval);
  }, [user, msProviderToken, googleProviderToken]);

  const cards = useMemo(() => {
    return [
      { title: "Today's Tasks", value: summary.todaysTasks.length, icon: <ListChecks className="h-4 w-4" /> },
      { title: "Today's Meetings", value: summary.todaysMeetings.length, icon: <CalendarClock className="h-4 w-4" /> },
      { title: "Important Emails", value: summary.importantEmails.length, icon: <Mail className="h-4 w-4" /> },
      { title: "Priority Tasks", value: summary.priorityTasks.length, icon: <AlertTriangle className="h-4 w-4" /> },
    ];
  }, [summary]);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-sm text-destructive">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-xs text-muted-foreground">Auto-updated: {format(new Date(summary.updatedAt), "MMM d, h:mm a")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Today's Meetings</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {summary.todaysMeetings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No meetings today</p>
            ) : (
              summary.todaysMeetings.map((meeting) => (
                <div key={meeting.id} className="rounded-md border p-2">
                  <p className="text-sm font-medium">{meeting.title}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(meeting.startAt), "h:mm a")}</p>
                  <Badge variant="outline" className="mt-1">{meeting.category}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" />Important Emails</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {summary.importantEmails.length === 0 ? (
              <p className="text-sm text-muted-foreground">No important emails</p>
            ) : (
              summary.importantEmails.map((email) => (
                <div key={email.id} className="rounded-md border p-2">
                  <p className="text-sm font-medium">{email.subject}</p>
                  <p className="text-xs text-muted-foreground">{email.sender}</p>
                  <Badge variant="secondary" className="mt-1">{email.category}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Priority Tasks</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {summary.priorityTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No high priority tasks</p>
            ) : (
              summary.priorityTasks.map((task) => (
                <div key={task.id} className="rounded-md border p-2">
                  <p className="text-sm font-medium">{task.title}</p>
                  <div className="flex gap-1 mt-1">
                    <Badge variant="destructive">{task.priority}</Badge>
                    <Badge variant="outline">{task.category}</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><StickyNote className="h-4 w-4" />Notes Summary</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {summary.notesSummary.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes</p>
            ) : (
              summary.notesSummary.map((note) => (
                <div key={note.id} className="rounded-md border p-2">
                  <p className="text-sm font-medium">{note.title}</p>
                  <Badge variant="outline" className="mt-1">{note.category ?? "Personal"}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
