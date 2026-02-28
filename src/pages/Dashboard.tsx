import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckSquare, FolderKanban, StickyNote, Plus, Circle } from "lucide-react";
import { format, isToday, addDays, isBefore, isAfter, startOfDay } from "date-fns";

export default function Dashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const [t, n, p] = await Promise.all([
        api.tasks.list(),
        api.notes.list(),
        api.projects.list(),
      ]);
      setTasks((t || []).filter((task: any) => task.status === "todo").sort((a: any, b: any) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }));
      setNotes((n || []).slice(0, 5));
      setProjects(p || []);
    };
    fetchAll().catch(console.error);
  }, [user]);

  const today = startOfDay(new Date());
  const nextWeek = addDays(today, 7);
  const todayTasks = tasks.filter((t) => t.dueDate && isToday(new Date(t.dueDate)));
  const upcomingTasks = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const d = startOfDay(new Date(t.dueDate));
    return isAfter(d, today) && isBefore(d, nextWeek);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your overview.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/projects"><Button size="sm"><Plus className="mr-1 h-4 w-4" /> New Project</Button></Link>
          <Link to="/tasks"><Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" /> New Task</Button></Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{projects.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{tasks.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Notes</CardTitle>
            <StickyNote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-3xl font-bold">{notes.length}</div></CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-lg">Today's Tasks</CardTitle></CardHeader>
          <CardContent>
            {todayTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks due today 🎉</p>
            ) : (
              <ul className="space-y-2">
                {todayTasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 text-sm">
                    <Circle className="h-3 w-3 text-primary" />
                    {t.title}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Upcoming (7 days)</CardTitle></CardHeader>
          <CardContent>
            {upcomingTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming tasks</p>
            ) : (
              <ul className="space-y-2">
                {upcomingTasks.slice(0, 5).map((t) => (
                  <li key={t.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Circle className="h-3 w-3 text-muted-foreground" />
                      {t.title}
                    </span>
                    <span className="text-xs text-muted-foreground">{t.dueDate && format(new Date(t.dueDate), "MMM d")}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Recent Notes</CardTitle></CardHeader>
          <CardContent>
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes yet</p>
            ) : (
              <ul className="space-y-2">
                {notes.map((n) => (
                  <li key={n.id} className="text-sm">
                    <Link to="/notes" className="hover:text-primary transition-colors font-medium">{n.title}</Link>
                    <p className="text-xs text-muted-foreground">{format(new Date(n.updatedAt), "MMM d, yyyy")}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Projects</CardTitle></CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">No projects yet. <Link to="/projects" className="text-primary hover:underline">Create one</Link></p>
            ) : (
              <ul className="space-y-2">
                {projects.slice(0, 5).map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: p.color }} />
                    <Link to="/projects" className="hover:text-primary transition-colors">{p.name}</Link>
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
