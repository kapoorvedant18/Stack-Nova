import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Circle } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, getDay } from "date-fns";

export default function CalendarPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    if (!user) return;
    api.tasks.list().then((data) => setTasks(data || [])).catch(console.error);
  }, [user]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPad = getDay(monthStart);

  const tasksForDay = (date: Date) => tasks.filter((t) => t.dueDate && isSameDay(new Date(t.dueDate), date));
  const selectedTasks = selectedDate ? tasksForDay(selectedDate) : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{format(currentMonth, "MMMM yyyy")}</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px text-center text-xs font-medium text-muted-foreground mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-px">
              {Array.from({ length: startPad }).map((_, i) => <div key={`pad-${i}`} />)}
              {days.map((day) => {
                const dayTasks = tasksForDay(day);
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
                    {dayTasks.length > 0 && (
                      <div className="flex gap-0.5">
                        {dayTasks.slice(0, 3).map((_, i) => (
                          <span key={i} className={`h-1 w-1 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-primary"}`} />
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
          <CardContent>
            {!selectedDate ? (
              <p className="text-sm text-muted-foreground">Click on a date to view tasks</p>
            ) : selectedTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks for this day</p>
            ) : (
              <ul className="space-y-2">
                {selectedTasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 text-sm">
                    <Circle className={`h-3 w-3 ${t.status === "completed" ? "text-muted-foreground" : "text-primary"}`} />
                    <span className={t.status === "completed" ? "line-through text-muted-foreground" : ""}>{t.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
