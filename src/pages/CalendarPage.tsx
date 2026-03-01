import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api, type CalendarEventRecord } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Circle, CalendarDays } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  addMonths,
  subMonths,
  getDay,
} from "date-fns";
import { toast } from "sonner";

interface TaskLite {
  id: string;
  title: string;
  status: "todo" | "completed";
  dueDate?: string | null;
}

export default function CalendarPage() {
  const { user, msProviderToken, googleProviderToken, clearMsProviderToken, clearGoogleProviderToken } = useAuth();
  const [tasks, setTasks] = useState<TaskLite[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventRecord[]>([]);
  const [loadingMs, setLoadingMs] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Fetch internal tasks
  useEffect(() => {
    if (!user) return;
    api.tasks.list().then((data) => setTasks(data || [])).catch(console.error);
  }, [user]);

  const loadMicrosoftEvents = useCallback(async () => {
    if (!user) return;

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;

    setLoadingMs(true);

    try {
      const syncCalls: Array<Promise<unknown>> = [];

      if (msProviderToken) {
        syncCalls.push(
          api.sync.microsoftCalendar({
            year,
            month,
            providerToken: msProviderToken,
          })
        );
      }

      if (googleProviderToken) {
        syncCalls.push(
          api.sync.googleWorkspace({
            year,
            month,
            providerToken: googleProviderToken,
          })
        );
      }

      if (syncCalls.length > 0) {
        const syncResults = await Promise.allSettled(syncCalls);
        for (const result of syncResults) {
          if (result.status === "rejected") {
            const message = String(result.reason ?? "sync failed");
            if (message.includes("Microsoft token is invalid") || message.includes("invalid or expired")) {
              clearMsProviderToken();
            }
            if (message.includes("Google token is invalid") || message.includes("invalid_grant")) {
              clearGoogleProviderToken();
            }
          }
        }
      }

      const rows = await api.calendarEvents.list();
      setCalendarEvents(rows || []);
    } catch (err) {
      const error = err as Error;
      console.error("[CalendarPage] Calendar error:", error.message);
      toast.error("Could not load calendar events.");
    } finally {
      setLoadingMs(false);
    }
  }, [
    user,
    msProviderToken,
    googleProviderToken,
    currentMonth,
    clearMsProviderToken,
    clearGoogleProviderToken,
  ]);

  useEffect(() => {
    loadMicrosoftEvents();
  }, [loadMicrosoftEvents]);

  useEffect(() => {
    if (!user) return;
    const intervalId = window.setInterval(loadMicrosoftEvents, 60000);
    return () => window.clearInterval(intervalId);
  }, [user, loadMicrosoftEvents]);

  useEffect(() => {
    if (!user) return;

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadMicrosoftEvents();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [user, loadMicrosoftEvents]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);

  const tasksForDay = (date: Date) =>
    tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), date));

  const allEventsForDay = (date: Date) =>
    calendarEvents.filter((e) => isSameDay(new Date(e.startAt), date));

  const selectedTasks = selectedDate ? tasksForDay(selectedDate) : [];
  const selectedCalendarEvents = selectedDate ? allEventsForDay(selectedDate) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        {loadingMs && (
          <span className="text-xs text-muted-foreground animate-pulse">
            Syncing Microsoft Calendar…
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{format(currentMonth, "MMMM yyyy")}</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px text-center text-xs font-medium text-muted-foreground mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-px">
              {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
              {days.map((day) => {
                const dayTasks = tasksForDay(day);
                const dayCalendarEvents = allEventsForDay(day);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isToday = isSameDay(day, new Date());
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={`flex flex-col items-center gap-0.5 rounded-lg p-2 text-sm transition-colors hover:bg-muted
                      ${isSelected ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
                      ${isToday && !isSelected ? "font-bold text-primary" : ""}
                    `}
                  >
                    {format(day, "d")}
                    {(dayTasks.length > 0 || dayCalendarEvents.length > 0) && (
                      <div className="flex gap-0.5">
                        {dayTasks.slice(0, 2).map((_, i) => (
                          <span key={`t-${i}`} className={`h-1 w-1 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-primary"}`} />
                        ))}
                        {dayCalendarEvents.slice(0, 2).map((_, i) => (
                          <span key={`ms-${i}`} className={`h-1 w-1 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-orange-400"}`} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {selectedDate ? format(selectedDate, "MMMM d, yyyy") : "Select a date"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedDate ? (
              <p className="text-sm text-muted-foreground">Click on a date to view events</p>
            ) : (
              <>
                {selectedTasks.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">Tasks</p>
                    <ul className="space-y-2">
                      {selectedTasks.map((t) => (
                        <li key={t.id} className="flex items-center gap-2 text-sm">
                          <Circle className={`h-3 w-3 flex-shrink-0 ${t.status === "completed" ? "text-muted-foreground" : "text-primary"}`} />
                          <span className={t.status === "completed" ? "line-through text-muted-foreground" : ""}>{t.title}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedCalendarEvents.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1 flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" /> Connected Calendars
                    </p>
                    <ul className="space-y-3">
                      {selectedCalendarEvents.map((e) => (
                        <li key={e.id} className="text-sm">
                          <p className="font-medium text-orange-500">{e.title}</p>
                          <div className="text-xs text-muted-foreground">
                            {`${format(new Date(e.startAt), "h:mm a")} – ${format(new Date(e.endAt), "h:mm a")}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {e.provider}
                            {e.category ? ` • ${e.category}` : ""}
                          </div>
                          {e.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {e.description}
                            </div>
                          )}
                          <div className="text-xs text-muted-foreground">
                            {new Date(e.startAt).toDateString() === new Date(e.endAt).toDateString()
                              ? "All day"
                              : "Timed event"}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedTasks.length === 0 && selectedCalendarEvents.length === 0 && (
                  <p className="text-sm text-muted-foreground">No events for this day</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}