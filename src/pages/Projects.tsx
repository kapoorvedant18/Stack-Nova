import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ComponentType, type ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FolderKanban, FileText, Mail, Link2, CalendarDays, CheckSquare, StickyNote } from "lucide-react";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];

interface Project {
  id: string;
  name: string;
  color: string;
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
  projectId?: string;
  priority?: "low" | "medium" | "high";
  source?: string;
}

interface NoteItem {
  id: string;
  title: string;
  projectId?: string;
}

interface LinkItem {
  id: string;
  title: string;
  url: string;
  projectId?: string;
}

interface EmailItem {
  id: string;
  subject: string;
  sender: string;
  bodySummary?: string;
  tags?: string;
}

interface FileItem {
  id: string;
  name: string;
  provider: string;
  externalId?: string;
  projectId?: string;
  path?: string;
  webUrl?: string;
  tags?: string;
}

interface CalendarItem {
  id: string;
  title: string;
  provider: string;
  startAt: string;
  tags?: string;
}

function hasProjectTag(tags: string | undefined, project: Project): boolean {
  if (!tags) return false;
  const normalized = tags.toLowerCase();
  return normalized.includes(project.name.toLowerCase()) || normalized.includes(`project:${project.id.toLowerCase()}`);
}

export default function Projects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [projectModalOpen, setProjectModalOpen] = useState(false);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarItem[]>([]);

  const [loadingDetails, setLoadingDetails] = useState(false);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addType, setAddType] = useState<"tasks" | "notes" | "links" | "emails" | "files" | "calendar">("tasks");
  const [addTitle, setAddTitle] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [addSender, setAddSender] = useState("");
  const [addProvider, setAddProvider] = useState("manual");
  const [addMimeType, setAddMimeType] = useState("");
  const [addStartAt, setAddStartAt] = useState("");
  const [addEndAt, setAddEndAt] = useState("");

  const [showPopup, setShowPopup] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showChooseModal, setShowChooseModal] = useState(false);
  const [dbFiles, setDbFiles] = useState<any[]>([]);
  const [choosing, setChoosing] = useState(false);

  const fetchProjects = async () => {
    try {
      const data = await api.projects.list();
      setProjects(data || []);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  useEffect(() => { if (user) fetchProjects(); }, [user]);

  const fetchProjectDetails = async () => {
    if (!user || !selectedProjectId) return;
    setLoadingDetails(true);
    try {
      const [taskRows, noteRows, linkRows, emailRows, fileRows, calendarRows] = await Promise.all([
        api.tasks.list(),
        api.notes.list(),
        api.links.list(),
        api.emails.list(),
        api.files.list(),
        api.calendarEvents.list(),
      ]);

      setTasks(taskRows || []);
      setNotes(noteRows || []);
      setLinks(linkRows || []);
      setEmails(emailRows || []);
      setFiles(fileRows || []);
      setCalendarEvents(calendarRows || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load project details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const loadFiles = async () => {
    try {
      const fileRows = await api.files.list();
      setFiles(fileRows || []);
    } catch (e: any) {
      toast.error(e.message || "Failed to load files");
    }
  };

  useEffect(() => {
    if (selectedProjectId && projectModalOpen) fetchProjectDetails();
  }, [selectedProjectId, projectModalOpen, user]);

  const handleSave = async () => {
    if (!name.trim()) return;
    try {
      if (editId) {
        await api.projects.update(editId, { name, color });
        toast.success("Project updated");
      } else {
        await api.projects.create({ name, color });
        toast.success("Project created");
      }
      setOpen(false); setName(""); setColor(COLORS[0]); setEditId(null);
      fetchProjects();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.projects.delete(id);
      toast.success("Project deleted");
      fetchProjects();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const openEdit = (p: any) => {
    setEditId(p.id); setName(p.name); setColor(p.color); setOpen(true);
  };

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId]
  );

  const relatedTasks = useMemo(
    () => tasks.filter((item) => item.projectId === selectedProjectId),
    [tasks, selectedProjectId]
  );

  const displayTasks = useMemo(
    () => relatedTasks.filter((item) => item.priority !== "high"),
    [relatedTasks]
  );

  const relatedNotes = useMemo(
    () => notes.filter((item) => item.projectId === selectedProjectId),
    [notes, selectedProjectId]
  );

  const relatedLinks = useMemo(
    () => links.filter((item) => item.projectId === selectedProjectId),
    [links, selectedProjectId]
  );

  const relatedEmails = useMemo(() => {
    if (!selectedProject) return [];
    return emails.filter((item) => hasProjectTag(item.tags, selectedProject));
  }, [emails, selectedProject]);

  const relatedFiles = useMemo(() => {
    if (!selectedProject) return [];
    return files.filter((item) => hasProjectTag(item.tags, selectedProject));
  }, [files, selectedProject]);

  const relatedCalendar = useMemo(() => {
    if (!selectedProject) return [];
    return calendarEvents.filter((item) => hasProjectTag(item.tags, selectedProject));
  }, [calendarEvents, selectedProject]);

  const openAddDialog = (type: "tasks" | "notes" | "links" | "emails" | "files" | "calendar") => {
    setAddType(type);
    setAddTitle("");
    setAddDescription("");
    setAddUrl("");
    setAddSender("");
    setAddProvider(type === "emails" ? "manual" : type === "files" ? "manual" : type === "calendar" ? "manual" : "manual");
    setAddMimeType("");
    setAddStartAt("");
    setAddEndAt("");
    setAddDialogOpen(true);
  };

  const handleCreateNote = () => {
    if (!selectedProjectId) return;
    setShowPopup(false);
    const prefillTitle = "Untitled Note";
    navigate(`/projects/${selectedProjectId}/note-editor?title=${encodeURIComponent(prefillTitle)}`);
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    setUploading(true);
    setUploadError(null);

    const filePath = `${selectedProject.id}/${Date.now()}_${file.name}`;

    const { error: uploadError } = await supabase.storage.from("files").upload(filePath, file);
    if (uploadError) {
      setUploadError(uploadError.message);
      setUploading(false);
      return;
    }

    try {
      await api.files.create({
        name: file.name,
        externalId: filePath,
        provider: "supabase",
        mimeType: file.type || "",
        webUrl: "",
        source: "Files",
        category: "Projects",
        tags: `${selectedProject.name},project:${selectedProject.id}`,
      });
      await loadFiles();
      window.dispatchEvent(new CustomEvent("files:changed"));
    } catch (err: any) {
      setUploadError(err?.message || "Failed to save file record");
    } finally {
      setUploading(false);
      setShowPopup(false);
    }
  };

  const openChooseFromDb = async () => {
    setChoosing(true);
    try {
      const all = await api.files.listAll();
      setDbFiles(all || []);
      setShowPopup(false);
      setShowChooseModal(true);
    } catch (err) {
      console.error("Failed to load DB files", err);
      setDbFiles([]);
    } finally {
      setChoosing(false);
    }
  };

  const handleAttachFromDb = async (file: any) => {
    if (!selectedProject) return;
    const path = file.path || file.externalId || file.webUrl || "";
    try {
      await api.files.create({
        name: file.name,
        externalId: path || crypto.randomUUID(),
        provider: file.provider || "supabase",
        mimeType: file.mimeType || "",
        webUrl: file.webUrl || "",
        source: "Files",
        category: "Projects",
        tags: `${selectedProject.name},project:${selectedProject.id}`,
      });
      await loadFiles();
      window.dispatchEvent(new CustomEvent("files:changed"));
      setShowChooseModal(false);
      setShowPopup(false);
    } catch (err) {
      console.error("Attach failed", err);
    }
  };

  const handleDownloadFile = async (file: any) => {
    const path = file.path || file.externalId || file.webUrl || "";
    if (!path) {
      toast.error("No file path available for download");
      return;
    }

    try {
      const { data, error } = await supabase.storage.from("files").download(path);
      if (error || !data) throw error ?? new Error("Download failed");
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download error", err);
    }
  };

  const handleDeleteFile = async (file: any, removeFromStorage = false) => {
    const path = file.path || file.externalId || file.webUrl || "";
    try {
      if (removeFromStorage && path) {
        await supabase.storage.from("files").remove([path]).catch(() => {});
      }
      await api.files.delete(file.id);
      await loadFiles();
      window.dispatchEvent(new CustomEvent("files:changed"));
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleAddBySection = async () => {
    if (!selectedProject) return;
    const tags = `${selectedProject.name},project:${selectedProject.id}`;

    try {
      if (addType === "tasks") {
        if (!addTitle.trim()) return toast.error("Task title is required");
        await api.tasks.create({
          title: addTitle.trim(),
          description: addDescription.trim(),
          projectId: selectedProject.id,
          status: "todo",
          category: "Projects",
          tags,
          priority: "medium",
          source: "Manual",
        });
      }

      if (addType === "notes") {
        if (!addTitle.trim()) return toast.error("Note title is required");
        await api.notes.create({
          title: addTitle.trim(),
          content: addDescription.trim(),
          projectId: selectedProject.id,
          category: "Projects",
          tags,
          source: "Notes",
        });
      }

      if (addType === "links") {
        if (!addTitle.trim() || !addUrl.trim()) return toast.error("Link title and URL are required");
        await api.links.create({
          title: addTitle.trim(),
          url: addUrl.trim(),
          description: addDescription.trim(),
          projectId: selectedProject.id,
          category: "Projects",
          tags,
          source: "Manual",
        });
      }

      if (addType === "emails") {
        if (!addTitle.trim()) return toast.error("Email subject is required");
        await api.emails.create({
          sender: addSender.trim() || "Manual",
          subject: addTitle.trim(),
          bodySummary: addDescription.trim(),
          provider: addProvider || "manual",
          externalId: crypto.randomUUID(),
          source: "Email",
          category: "Projects",
          tags,
          isImportant: false,
          receivedAt: new Date().toISOString(),
        });
      }

      if (addType === "files") {
        if (!addTitle.trim()) return toast.error("File name is required");
        await api.files.create({
          name: addTitle.trim(),
          mimeType: addMimeType.trim(),
          webUrl: addUrl.trim(),
          provider: addProvider || "manual",
          externalId: crypto.randomUUID(),
          source: "Files",
          category: "Projects",
          tags,
          modifiedAt: new Date().toISOString(),
        });
      }

      if (addType === "calendar") {
        if (!addTitle.trim()) return toast.error("Event title is required");
        const startAt = addStartAt ? new Date(addStartAt).toISOString() : new Date().toISOString();
        const endAt = addEndAt ? new Date(addEndAt).toISOString() : new Date(Date.now() + 60 * 60 * 1000).toISOString();
        await api.calendarEvents.create({
          title: addTitle.trim(),
          description: addDescription.trim(),
          provider: addProvider || "manual",
          externalId: crypto.randomUUID(),
          source: "Calendar",
          category: "Projects",
          tags,
          location: "",
          isAllDay: false,
          startAt,
          endAt,
        });
      }

      toast.success(`${addType.slice(0, 1).toUpperCase()}${addType.slice(1)} item added`);
      setAddDialogOpen(false);
      fetchProjectDetails();
    } catch (e: any) {
      toast.error(e.message || "Failed to add item");
    }
  };

  const openProjectWorkspace = (projectId: string) => {
    setSelectedProjectId(projectId);
    setProjectModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditId(null); setName(""); setColor(COLORS[0]); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" /> New Project</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Project" : "New Project"}</DialogTitle>
              <DialogDescription>Create or update project details.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button key={c} className={`h-8 w-8 rounded-full transition-transform ${color === c ? "scale-125 ring-2 ring-ring ring-offset-2" : ""}`} style={{ backgroundColor: c }} onClick={() => setColor(c)} />
                  ))}
                </div>
              </div>
              <Button onClick={handleSave} className="w-full">{editId ? "Update" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {projects.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <FolderKanban className="mb-2 h-10 w-10" />
          <p>No projects yet. Create your first one!</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card
              key={p.id}
              className="group relative cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
              onClick={() => openProjectWorkspace(p.id)}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div className="h-4 w-4 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">Open workspace</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEdit(p); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={projectModalOpen} onOpenChange={setProjectModalOpen}>
        <DialogContent className="max-w-6xl w-[96vw] max-h-[90vh] overflow-y-auto border-border/60 bg-background/95 p-0 backdrop-blur-sm">
          <DialogDescription className="sr-only">Project workspace details with tasks, notes, links, emails, files, and calendar.</DialogDescription>
          {selectedProject ? (
            <div className="flex flex-col">
              <div className="border-b bg-gradient-to-r from-muted/30 to-transparent px-6 py-4">
                <div className="flex items-center gap-3 pr-10">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: selectedProject.color }} />
                    <div>
                      <h2 className="text-lg font-semibold leading-tight">{selectedProject.name} Workspace</h2>
                      <p className="text-xs text-muted-foreground">Tasks, notes, links, emails, files, and calendar in one clean view</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  <SummaryPill icon={CheckSquare} label="Tasks" count={displayTasks.length} />
                  <SummaryPill icon={StickyNote} label="Notes" count={relatedNotes.length} />
                  <SummaryPill icon={Link2} label="Links" count={relatedLinks.length} />
                  <SummaryPill icon={Mail} label="Emails" count={relatedEmails.length} />
                  <SummaryPill icon={FileText} label="Files" count={relatedFiles.length} />
                  <SummaryPill icon={CalendarDays} label="Events" count={relatedCalendar.length} />
                </div>
              </div>

              <div className="px-6 py-5 pb-8">
                {loadingDetails ? (
                  <p className="text-sm text-muted-foreground">Loading project details...</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
                    <WorkspaceSection title="Tasks" icon={CheckSquare} emptyText="No tasks" onAdd={() => openAddDialog("tasks")}>
                      {displayTasks.slice(0, 8).map((item) => (
                        <div key={item.id} className="rounded-md border bg-muted/25 px-3 py-2 text-sm leading-6">
                          {item.title}
                        </div>
                      ))}
                    </WorkspaceSection>

                    <WorkspaceSection title="Notes" icon={StickyNote} emptyText="No notes" onAdd={() => openAddDialog("notes")}>
                      {relatedNotes.slice(0, 8).map((item) => (
                        <div key={item.id} className="rounded-md border bg-muted/25 px-3 py-2 text-sm leading-6">
                          {item.title}
                        </div>
                      ))}
                    </WorkspaceSection>

                    <WorkspaceSection title="Links" icon={Link2} emptyText="No links" onAdd={() => openAddDialog("links")}>
                      {relatedLinks.slice(0, 8).map((item) => (
                        <a key={item.id} className="block rounded-md border bg-muted/25 px-3 py-2 text-sm leading-6 hover:text-primary" href={item.url} target="_blank" rel="noreferrer">{item.title}</a>
                      ))}
                    </WorkspaceSection>

                    <WorkspaceSection title="Emails" icon={Mail} emptyText="No related emails" onAdd={() => openAddDialog("emails")}>
                      {relatedEmails.slice(0, 8).map((item) => (
                        <div key={item.id} className="rounded-md border bg-muted/25 px-3 py-2 text-sm leading-6">
                          {item.subject}
                        </div>
                      ))}
                    </WorkspaceSection>

                    <WorkspaceSection title="Files" icon={FileText} emptyText="No related files" onAdd={() => setShowPopup(true)}>
                      {relatedFiles.slice(0, 8).map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded-md border bg-muted/25 px-3 py-2 text-sm leading-6">
                          <div className="truncate pr-2">{item.name}</div>
                          <div className="flex shrink-0 items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleDownloadFile(item)}>
                              Download
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteFile(item)}>
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </WorkspaceSection>

                    <WorkspaceSection title="Calendar" icon={CalendarDays} emptyText="No related events" onAdd={() => openAddDialog("calendar")}>
                      {relatedCalendar.slice(0, 8).map((item) => (
                        <div key={item.id} className="rounded-md border bg-muted/25 px-3 py-2 text-sm leading-6">
                          {item.title}
                        </div>
                      ))}
                    </WorkspaceSection>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select a project to view details.</p>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showPopup} onOpenChange={setShowPopup}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add File to Project</DialogTitle>
            <DialogDescription>Choose how to add content to this project: create note, reuse database file, or upload from computer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <button
              onClick={handleCreateNote}
              disabled={uploading}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg"
            >
              Create Note on Website
            </button>

            <button
              onClick={openChooseFromDb}
              disabled={choosing}
              className="w-full py-3 border rounded-lg hover:bg-gray-100"
            >
              Choose from Database
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full py-3 border rounded-lg hover:bg-gray-100"
            >
              Upload from Computer
            </button>

            <input type="file" ref={fileInputRef} onChange={handleFileSelect} hidden />

            {uploadError && <p className="text-sm text-red-500">{uploadError}</p>}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showChooseModal} onOpenChange={setShowChooseModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto z-[60]">
          <DialogHeader>
            <DialogTitle>Choose File from Database</DialogTitle>
            <DialogDescription>Select any existing DB file and attach it to this project.</DialogDescription>
          </DialogHeader>
          {choosing ? <div>Loading…</div> : (
            <div className="grid gap-2">
              {dbFiles.length === 0 ? <div className="text-sm text-muted-foreground">No files found</div> :
                dbFiles.map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-2 border rounded">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{f.name}</div>
                      <div className="text-xs text-muted-foreground">{f.projectId ? `From project ${f.projectId}` : ""}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleDownloadFile(f)} className="px-2 py-1 text-sm border rounded">Download</button>
                      <button onClick={() => handleAttachFromDb(f)} className="px-2 py-1 text-sm bg-blue-500 text-white rounded">Attach to project</button>
                    </div>
                  </div>
                ))
              }
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to {addType.charAt(0).toUpperCase() + addType.slice(1)}</DialogTitle>
            <DialogDescription>Fill the details and save this item to the selected project workspace.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{addType === "emails" ? "Subject" : addType === "files" ? "File Name" : addType === "calendar" ? "Event Title" : "Title"}</Label>
              <Input value={addTitle} onChange={(e) => setAddTitle(e.target.value)} />
            </div>

            {addType !== "links" && addType !== "files" && (
              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea value={addDescription} onChange={(e) => setAddDescription(e.target.value)} rows={3} />
              </div>
            )}

            {(addType === "links" || addType === "files") && (
              <div className="space-y-1">
                <Label>URL</Label>
                <Input value={addUrl} onChange={(e) => setAddUrl(e.target.value)} placeholder="https://..." />
              </div>
            )}

            {addType === "emails" && (
              <div className="space-y-1">
                <Label>Sender</Label>
                <Input value={addSender} onChange={(e) => setAddSender(e.target.value)} placeholder="sender@example.com" />
              </div>
            )}

            {(addType === "emails" || addType === "files" || addType === "calendar") && (
              <div className="space-y-1">
                <Label>Provider</Label>
                <Input value={addProvider} onChange={(e) => setAddProvider(e.target.value)} placeholder="manual / gmail / outlook / google-drive / onedrive" />
              </div>
            )}

            {addType === "files" && (
              <div className="space-y-1">
                <Label>MIME Type</Label>
                <Input value={addMimeType} onChange={(e) => setAddMimeType(e.target.value)} placeholder="application/pdf" />
              </div>
            )}

            {addType === "calendar" && (
              <>
                <div className="space-y-1">
                  <Label>Start (ISO or datetime)</Label>
                  <Input value={addStartAt} onChange={(e) => setAddStartAt(e.target.value)} placeholder="2026-03-01T10:00:00Z" />
                </div>
                <div className="space-y-1">
                  <Label>End (ISO or datetime)</Label>
                  <Input value={addEndAt} onChange={(e) => setAddEndAt(e.target.value)} placeholder="2026-03-01T11:00:00Z" />
                </div>
              </>
            )}

            <Button className="w-full" onClick={handleAddBySection}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryPill({ icon: Icon, label, count }: { icon: ComponentType<{ className?: string }>; label: string; count: number }) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span>{label}</span>
      </div>
      <p className="mt-1 text-lg font-semibold leading-none">{count}</p>
    </div>
  );
}

function WorkspaceSection({
  title,
  icon: Icon,
  emptyText,
  children,
  onAdd,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  emptyText: string;
  children: ReactNode;
  onAdd?: () => void;
}) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : Boolean(children);

  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium text-base">
            <Icon className="h-4 w-4" />
            <span>{title}</span>
          </div>
          {onAdd && (
            <Button size="sm" variant="outline" className="h-8" onClick={onAdd}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Add
            </Button>
          )}
        </div>
        <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
          {hasChildren ? children : <p className="text-xs text-muted-foreground">{emptyText}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
