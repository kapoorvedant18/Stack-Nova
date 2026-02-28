import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, StickyNote, Search } from "lucide-react";
import { format } from "date-fns";

export default function Notes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [projectId, setProjectId] = useState("");
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      const [n, p] = await Promise.all([api.notes.list(), api.projects.list()]);
      setNotes(n || []);
      setProjects((p || []).sort((a: any, b: any) => a.name.localeCompare(b.name)));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  useEffect(() => { if (user) fetchData(); }, [user]);

  const handleSave = async () => {
    if (!title.trim() || !projectId) return;
    try {
      if (editId) {
        await api.notes.update(editId, { title, content, projectId });
        toast.success("Note updated");
      } else {
        await api.notes.create({ title, content, projectId });
        toast.success("Note created");
      }
      setOpen(false); resetForm(); fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.notes.delete(id);
      toast.success("Note deleted");
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const openEdit = (n: any) => {
    setEditId(n.id); setTitle(n.title); setContent(n.content || ""); setProjectId(n.projectId); setOpen(true);
  };

  const resetForm = () => { setEditId(null); setTitle(""); setContent(""); setProjectId(""); };

  const filtered = notes.filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    (n.content || "").toLowerCase().includes(search.toLowerCase())
  );
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Notes</h1>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" /> New Note</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editId ? "Edit Note" : "New Note"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title" /></div>
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                  <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Content</Label><Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Write your note..." rows={6} /></div>
              <Button onClick={handleSave} className="w-full">{editId ? "Update" : "Create"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search notes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <StickyNote className="mb-2 h-10 w-10" />
          <p>{search ? "No matching notes" : "No notes yet"}</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((note) => (
            <Card key={note.id} className="group">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-sm">{note.title}</h3>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(note)}><Pencil className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(note.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
                {note.content && <p className="text-xs text-muted-foreground line-clamp-3">{note.content}</p>}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {projectMap[note.projectId] && (
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: projectMap[note.projectId].color }} />
                      {projectMap[note.projectId].name}
                    </span>
                  )}
                  <span>{format(new Date(note.updatedAt), "MMM d")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
