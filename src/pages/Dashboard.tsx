import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CheckSquare,
  FolderKanban,
  Plus,
  Circle,
  RefreshCw,
} from "lucide-react";
import {
  format,
  addDays,
  startOfDay,
} from "date-fns";

/* ===========================
   TYPES
=========================== */

interface Task {
  id: string;
  title: string;
  dueDate?: string | null;
  status: "todo" | "completed";
}

interface Note {
  id: string;
  title: string;
  updatedAt: string;
}

interface Project {
  id: string;
  name: string;
  color: string;
}

/* ===========================
   COMPONENT
=========================== */

export default function Dashboard() {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = startOfDay(new Date());
  const nextWeek = addDays(today, 7);

  /* ===========================
     FETCH DATA
  =========================== */

  const fetchAll = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const [t, n, p] = await Promise.all([
        api.tasks.list(),
        api.notes.list(),
        api.projects.list(),
      ]);

      const sortedTasks =
        (t || [])
          .filter((task: Task) => task.status === "todo")
          .sort((a: Task, b: Task) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;

            const aDate = new Date(a.dueDate);
            const bDate = new Date(b.dueDate);

            return aDate.getTime() - bDate.getTime();
          }) ?? [];

      setTasks(sortedTasks);
      setNotes((n || []).slice(0, 5));
      setProjects(p || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* ===========================
     TODAY TASKS
  =========================== */

  const todayTasks = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");

    return tasks.filter((t) => {
      if (!t.dueDate) return false;

      const parsed = new Date(t.dueDate);
      if (isNaN(parsed.getTime())) return false;

      return format(parsed, "yyyy-MM-dd") === todayStr;
    });
  }, [tasks]);

  /* ===========================
     UPCOMING TASKS
  =========================== */

  const upcomingTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (!t.dueDate) return false;

      const parsed = new Date(t.dueDate);
      if (isNaN(parsed.getTime())) return false;

      const taskDate = startOfDay(parsed);

      return (
        taskDate.getTime() > today.getTime() &&
        taskDate.getTime() <= nextWeek.getTime()
      );
    });
  }, [tasks, today, nextWeek]);

  /* ===========================
     COMPLETION RATE
  =========================== */

  const completionRate = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(
      (t) => t.status === "completed"
    ).length;

    return total ? Math.round((completed / total) * 100) : 0;
  }, [tasks]);

  /* ===========================
     GREETING
  =========================== */

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Good morning"
      : hour < 18
      ? "Good afternoon"
      : "Good evening";

  /* ===========================
     LOADING & ERROR
  =========================== */

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="p-6 text-red-500">
        {error}
        <div className="mt-4">
          <Button onClick={fetchAll}>Retry</Button>
        </div>
      </div>
    );
  }

  /* ===========================
     UI
  =========================== */

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}, {user?.name ?? "User"} 👋
          </h1>
          <p className="text-muted-foreground">
            Here's your productivity overview.
          </p>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={fetchAll}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>

          <Link to="/projects">
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" /> New Project
            </Button>
          </Link>

          <Link to="/tasks">
            <Button size="sm" variant="outline">
              <Plus className="mr-1 h-4 w-4" /> New Task
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Projects"
          value={projects.length}
          icon={<FolderKanban className="h-4 w-4" />}
        />
        <StatCard
          title="Open Tasks"
          value={tasks.length}
          icon={<CheckSquare className="h-4 w-4" />}
        />
        <StatCard
          title="Completion"
          value={`${completionRate}%`}
          icon={<CheckSquare className="h-4 w-4" />}
        />
      </div>

      {/* Task Sections */}
      <div className="grid gap-6 md:grid-cols-2">
        <TaskSection title="Today's Tasks" tasks={todayTasks} />
        <TaskSection
          title="Upcoming (7 Days)"
          tasks={upcomingTasks.slice(0, 5)}
          showDate
        />
      </div>

      {/* Notes LEFT, Projects RIGHT */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Notes</CardTitle>
          </CardHeader>
          <CardContent>
            {notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No notes yet
              </p>
            ) : (
              <ul className="space-y-2">
                {notes.map((n) => (
                  <li key={n.id}>
                    <Link
                      to="/notes"
                      className="font-medium hover:text-primary"
                    >
                      {n.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(n.updatedAt), "MMM d, yyyy")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Projects */}
        <Card>
          <CardHeader>
            <CardTitle>Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No projects yet.{" "}
                <Link
                  to="/projects"
                  className="text-primary hover:underline"
                >
                  Create one
                </Link>
              </p>
            ) : (
              <ul className="space-y-2">
                {projects.slice(0, 5).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    <Link
                      to="/projects"
                      className="hover:text-primary"
                    >
                      {p.name}
                    </Link>
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

/* ===========================
   SUB COMPONENTS
=========================== */

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function TaskSection({
  title,
  tasks,
  showDate,
}: {
  title: string;
  tasks: Task[];
  showDate?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing here 🎉
          </p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2">
                  <Circle className="h-3 w-3" />
                  {t.title}
                </span>
                {showDate && t.dueDate && (
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(t.dueDate), "MMM d")}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}