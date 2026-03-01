import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Plus, Trash2, CheckSquare, Filter, MoreVertical, Pencil, CalendarIcon } from "lucide-react";
import { format, parse, isValid } from "date-fns";

interface Task {
  id: string;
  title: string;
  status: "todo" | "completed";
  dueDate?: string | null;
  projectId?: string | null;
  category?: string;
  tags?: string;
  priority?: "low" | "medium" | "high";
  source?: string;
}

interface Project {
  id: string;
  name: string;
  color: string;
}

// Auto-inserts slashes: 0507202 → 05/07/2026
function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.slice(0, 2) + "/" + digits.slice(2);
  return digits.slice(0, 2) + "/" + digits.slice(2, 4) + "/" + digits.slice(4);
}

// DD/MM/YYYY → YYYY-MM-DD
function toISODate(input: string): string | null {
  if (!input || input.length < 10) return null;
  const parsed = parse(input, "dd/MM/yyyy", new Date());
  return isValid(parsed) ? format(parsed, "yyyy-MM-dd") : null;
}

// YYYY-MM-DD → DD/MM/YYYY
function toDisplayDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return isValid(d) ? format(d, "dd/MM/yyyy") : "";
}

/* ===========================
   DATE INPUT COMPONENT
   Type numbers (auto slash) OR click 📅 to open calendar
=========================== */
function DateInput({
  value,       // YYYY-MM-DD
  onChange,    // (YYYY-MM-DD) => void
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const hiddenRef = useRef<HTMLInputElement>(null);
  const [display, setDisplay] = useState(toDisplayDate(value));

  // Sync display when value changes from outside (e.g. calendar pick)
  useEffect(() => {
    setDisplay(toDisplayDate(value));
  }, [value]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatDateInput(e.target.value);
    setDisplay(formatted);
    // Only push to parent once fully typed
    if (formatted.length === 10) {
      const iso = toISODate(formatted);
      if (iso) onChange(iso);
    } else if (formatted.length === 0) {
      onChange("");
    }
  };

  const handleCalendarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value); // YYYY-MM-DD from native picker
  };

  return (
    <div className="relative flex items-center">
      <Input
        type="text"
        value={display}
        onChange={handleTextChange}
        placeholder="DD/MM/YYYY"
        maxLength={10}
        className="pr-10"
      />

      {/* Calendar icon triggers native date picker */}
      <button
        type="button"
        tabIndex={-1}
        onClick={() => hiddenRef.current?.showPicker?.()}
        className="absolute right-2.5 text-muted-foreground hover:text-foreground transition-colors"
      >
        <CalendarIcon className="h-4 w-4" />
      </button>

      {/* Hidden native date input — invisible, just for the picker popup */}
      <input
        ref={hiddenRef}
        type="date"
        value={value}
        onChange={handleCalendarChange}
        className="sr-only"
        tabIndex={-1}
      />
    </div>
  );
}

/* ===========================
   MAIN COMPONENT
=========================== */
export default function Tasks() {
  const { user } = useAuth();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(""); // YYYY-MM-DD internally
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [category, setCategory] = useState("Personal");
  const [tags, setTags] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [filterProject, setFilterProject] = useState("all");

  const [renameOpen, setRenameOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameCategory, setRenameCategory] = useState("Personal");
  const [renameTags, setRenameTags] = useState("");
  const [renamePriority, setRenamePriority] = useState<"low" | "medium" | "high">("medium");

  const fetchData = async () => {
    try {
      const [t, p] = await Promise.all([api.tasks.list(), api.projects.list()]);
      setTasks(t || []);
      setProjects((p || []).sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const resetForm = () => {
    setTitle("");
    setDueDate("");
    setSelectedProjectId(null);
    setCategory("Personal");
    setTags("");
    setPriority("medium");
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    try {
      const payload: { title: string; projectId?: string; dueDate?: string; category: string; tags: string; priority: "low" | "medium" | "high"; source: string } = {
        title: title.trim(),
        category,
        tags,
        priority,
        source: "Manual",
      };

      if (selectedProjectId) {
        payload.projectId = selectedProjectId;
      }

      if (dueDate) {
        payload.dueDate = dueDate;
      }

      await api.tasks.create(payload);
      toast.success("Task created");
      setOpen(false);
      resetForm();
      fetchData();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        (typeof e?.response?.data === "string" ? e.response.data : null) ||
        e?.message ||
        "Failed to create task";
      toast.error(typeof msg === "string" ? msg : JSON.stringify(msg));
      console.error("Task create error:", e?.response?.data || e);
    }
  };

  const handleRename = async () => {
    if (!renameId || !renameValue.trim()) return;
    try {
      await api.tasks.update(renameId, {
        title: renameValue.trim(),
        category: renameCategory,
        tags: renameTags,
        priority: renamePriority,
      });
      toast.success("Task updated");
      setRenameOpen(false);
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.tasks.delete(id);
      toast.success("Task deleted");
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const toggleStatus = async (task: Task) => {
    const newStatus = task.status === "todo" ? "completed" : "todo";
    try {
      await api.tasks.update(task.id, { status: newStatus });
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filtered =
    filterProject === "all"
      ? tasks
      : filterProject === "none"
      ? tasks.filter((t) => !t.projectId)
      : tasks.filter((t) => t.projectId === filterProject);

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Tasks</h1>

        <div className="flex items-center gap-2">
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-[170px]">
              <Filter className="mr-1 h-3.5 w-3.5" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              <SelectItem value="none">No project</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" />
                New Task
              </Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Task</DialogTitle>
                <DialogDescription>Create a task with optional project and due date.</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Title */}
                <div className="space-y-2">
                  <Label>Title <span className="text-destructive">*</span></Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task title"
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                    autoFocus
                  />
                </div>

                {/* Project — optional */}
                <div className="space-y-2">
                  <Label>
                    Project{" "}
                    <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Select
                    value={selectedProjectId ?? "__none__"}
                    onValueChange={(val) => setSelectedProjectId(val === "__none__" ? null : val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No project" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No project</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Due Date */}
                <div className="space-y-2">
                  <Label>
                    Due Date{" "}
                    <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <DateInput value={dueDate} onChange={setDueDate} />
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Work">Work</SelectItem>
                      <SelectItem value="Study">Study</SelectItem>
                      <SelectItem value="Personal">Personal</SelectItem>
                      <SelectItem value="Meetings">Meetings</SelectItem>
                      <SelectItem value="Projects">Projects</SelectItem>
                      <SelectItem value="Today">Today</SelectItem>
                      <SelectItem value="Upcoming">Upcoming</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tags (comma separated)</Label>
                  <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="client,urgent" />
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={priority} onValueChange={(value) => setPriority(value as "low" | "medium" | "high")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">low</SelectItem>
                      <SelectItem value="medium">medium</SelectItem>
                      <SelectItem value="high">high</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleCreate} className="w-full">
                  Create Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Task List */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CheckSquare className="mb-2 h-10 w-10" />
            <p>No tasks yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <Card key={task.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <Checkbox
                  checked={task.status === "completed"}
                  onCheckedChange={() => toggleStatus(task)}
                />

                <div className="flex-1">
                  <p className={`text-sm font-medium ${task.status === "completed" ? "line-through opacity-60" : ""}`}>
                    {task.title}
                  </p>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {task.projectId && projectMap[task.projectId] && (
                      <span className="flex items-center gap-1">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: projectMap[task.projectId].color }}
                        />
                        {projectMap[task.projectId].name}
                      </span>
                    )}
                    {task.dueDate && (
                      <span>{format(new Date(task.dueDate + "T00:00:00"), "dd/MM/yyyy")}</span>
                    )}
                    {task.category && <span>• {task.category}</span>}
                    {task.priority && <span>• {task.priority}</span>}
                    {task.tags && <span>• #{task.tags.split(",").map((tag) => tag.trim()).filter(Boolean).join(" #")}</span>}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => {
                      setRenameId(task.id);
                      setRenameValue(task.title);
                      setRenameCategory(task.category ?? "Personal");
                      setRenameTags(task.tags ?? "");
                      setRenamePriority((task.priority as "low" | "medium" | "high") ?? "medium");
                      setRenameOpen(true);
                    }}>
                      <Pencil className="mr-2 h-4 w-4" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(task.id)} className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>Update task title, category, tags, and priority.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={renameCategory} onValueChange={setRenameCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Work">Work</SelectItem>
                  <SelectItem value="Study">Study</SelectItem>
                  <SelectItem value="Personal">Personal</SelectItem>
                  <SelectItem value="Meetings">Meetings</SelectItem>
                  <SelectItem value="Projects">Projects</SelectItem>
                  <SelectItem value="Today">Today</SelectItem>
                  <SelectItem value="Upcoming">Upcoming</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <Input value={renameTags} onChange={(e) => setRenameTags(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={renamePriority} onValueChange={(value) => setRenamePriority(value as "low" | "medium" | "high")}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">low</SelectItem>
                  <SelectItem value="medium">medium</SelectItem>
                  <SelectItem value="high">high</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleRename} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}