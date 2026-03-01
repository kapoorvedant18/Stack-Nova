import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api, type CalendarEventRecord } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Circle, CalendarDays, Plus, X, Loader2 } from "lucide-react";
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingEvent, setAddingEvent] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", startTime: "09:00", endTime: "10:00", location: "" });

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

  const resetAddForm = () => {
    setNewEvent({ title: "", startTime: "09:00", endTime: "10:00", location: "" });
    setShowAddForm(false);
  };

  const handleAddEvent = async () => {
    if (!selectedDate || !newEvent.title.trim()) return;
    setAddingEvent(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const startAt = new Date(`${dateStr}T${newEvent.startTime}:00`).toISOString();
      const endAt = new Date(`${dateStr}T${newEvent.endTime}:00`).toISOString();

      await api.calendarEvents.create({
        title: newEvent.title.trim(),
        description: "",
        location: newEvent.location.trim(),
        isAllDay: false,
        startAt,
        endAt,
        provider: "manual",
        externalId: `manual-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        source: "Manual",
        category: "Personal",
        tags: "",
      });

      resetAddForm();
      const rows = await api.calendarEvents.list();
      setCalendarEvents(rows || []);
      toast.success("Event added!");
    } catch (err) {
      console.error("[CalendarPage] Failed to add event:", err);
      toast.error("Failed to add event.");
    } finally {
      setAddingEvent(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        {loadingMs && (
          <span className="text-xs text-muted-foreground animate-pulse">
            Syncing Calendar…
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
                    onClick={() => { setSelectedDate(day); resetAddForm(); }}
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
                      <CalendarDays className="h-3 w-3" /> Events
                    </p>
                    <ul className="space-y-3">
                      {selectedCalendarEvents.map((e) => (
                        <li key={e.id} className="text-sm">
                          <p className="font-medium text-orange-500">{e.title}</p>
                          <div className="text-xs text-muted-foreground">
                            {`${format(new Date(e.startAt), "h:mm a")} – ${format(new Date(e.endAt), "h:mm a")}`}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {e.provider === "manual" ? "Manual" : e.provider}
                            {e.category ? ` • ${e.category}` : ""}
                          </div>
                          {(e as any).location && (
                            <div className="text-xs text-muted-foreground truncate">
                              📍 {(e as any).location}
                            </div>
                          )}
                          {e.description && (
                            <div className="text-xs text-muted-foreground truncate">
                              {e.description}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedTasks.length === 0 && selectedCalendarEvents.length === 0 && (
                  <p className="text-sm text-muted-foreground">No events for this day</p>
                )}

                {!showAddForm ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2 gap-1.5"
                    onClick={() => setShowAddForm(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add event
                  </Button>
                ) : (
                  <div className="mt-2 space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">New Event</p>
                      <button onClick={resetAddForm} className="text-muted-foreground hover:text-foreground">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Input
                      placeholder="Event title"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent((p) => ({ ...p, title: e.target.value }))}
                      onKeyDown={(e) => e.key === "Enter" && handleAddEvent()}
                      className="h-8 text-sm"
                      autoFocus
                    />
                    <Input
                      placeholder="Location (optional)"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent((p) => ({ ...p, location: e.target.value }))}
                      className="h-8 text-sm"
                    />
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">Start</p>
                        <Input
                          type="time"
                          value={newEvent.startTime}
                          onChange={(e) => setNewEvent((p) => ({ ...p, startTime: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-muted-foreground mb-1">End</p>
                        <Input
                          type="time"
                          value={newEvent.endTime}
                          onChange={(e) => setNewEvent((p) => ({ ...p, endTime: e.target.value }))}
                          className="h-8 text-sm"
                        />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full h-8"
                      onClick={handleAddEvent}
                      disabled={addingEvent || !newEvent.title.trim()}
                    >
                      {addingEvent ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}