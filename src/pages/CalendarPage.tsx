import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api, type MSCalendarEvent } from "@/lib/api";
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

export default function CalendarPage() {
  const { user, msProviderToken, clearMsProviderToken } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [msEvents, setMsEvents] = useState<MSCalendarEvent[]>([]);
  const [loadingMs, setLoadingMs] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Fetch internal tasks
  useEffect(() => {
    if (!user) return;
    api.tasks.list().then((data) => setTasks(data || [])).catch(console.error);
  }, [user]);

  const loadMicrosoftEvents = useCallback(async () => {
    if (!user || !msProviderToken) return;

    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;

    setLoadingMs(true);

    try {
      const { events } = await api.calendar.listMicrosoftMonthEvents({
        year,
        month,
        providerToken: msProviderToken,
      });
      setMsEvents(events ?? []);
    } catch (err) {
      const error = err as Error;
      console.error("[CalendarPage] MS Calendar error:", error.message);

      if (
        error.message.includes("Missing X-Provider-Token") ||
        error.message.includes("invalid or expired")
      ) {
        clearMsProviderToken();
        toast.error("Microsoft calendar session expired. Please sign in with Microsoft again.");
        return;
      }

      toast.error("Could not load Microsoft Calendar events.");
    } finally {
      setLoadingMs(false);
    }
  }, [user, msProviderToken, currentMonth, clearMsProviderToken]);

  useEffect(() => {
    loadMicrosoftEvents();
  }, [loadMicrosoftEvents]);

  useEffect(() => {
    if (!user || !msProviderToken) return;
    const intervalId = window.setInterval(loadMicrosoftEvents, 60000);
    return () => window.clearInterval(intervalId);
  }, [user, msProviderToken, loadMicrosoftEvents]);

  useEffect(() => {
    if (!user || !msProviderToken) return;

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadMicrosoftEvents();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [user, msProviderToken, loadMicrosoftEvents]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);

  const tasksForDay = (date: Date) =>
    tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), date));

  const msEventsForDay = (date: Date) =>
    msEvents.filter((e) => isSameDay(new Date(e.start.dateTime), date));

  const selectedTasks = selectedDate ? tasksForDay(selectedDate) : [];
  const selectedMsEvents = selectedDate ? msEventsForDay(selectedDate) : [];

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
                const dayMsEvents = msEventsForDay(day);
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
                    {(dayTasks.length > 0 || dayMsEvents.length > 0) && (
                      <div className="flex gap-0.5">
                        {dayTasks.slice(0, 2).map((_, i) => (
                          <span key={`t-${i}`} className={`h-1 w-1 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-primary"}`} />
                        ))}
                        {dayMsEvents.slice(0, 2).map((_, i) => (
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

                {selectedMsEvents.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase text-muted-foreground mb-1 flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" /> Microsoft Calendar
                    </p>
                    <ul className="space-y-3">
                      {selectedMsEvents.map((e) => (
                        <li key={e.id} className="text-sm">
                          <a href={e.webLink} target="_blank" rel="noopener noreferrer" className="font-medium text-orange-500 hover:underline">
                            {e.subject}
                          </a>
                          <div className="text-xs text-muted-foreground">
                            {e.isAllDay
                              ? "All day"
                              : `${format(new Date(e.start.dateTime), "h:mm a")} – ${format(new Date(e.end.dateTime), "h:mm a")}`}
                          </div>
                          {e.location?.displayName && (
                            <div className="text-xs text-muted-foreground truncate">📍 {e.location.displayName}</div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedTasks.length === 0 && selectedMsEvents.length === 0 && (
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