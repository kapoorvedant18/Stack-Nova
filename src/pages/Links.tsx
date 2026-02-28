import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Link2, ExternalLink, Filter } from "lucide-react";

export default function Links() {
  const { user } = useAuth();
  const [links, setLinks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [filterProject, setFilterProject] = useState("all");

  const fetchData = async () => {
    try {
      const [l, p] = await Promise.all([api.links.list(), api.projects.list()]);
      setLinks(l || []);
      setProjects((p || []).sort((a: any, b: any) => a.name.localeCompare(b.name)));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  useEffect(() => { if (user) fetchData(); }, [user]);

  const handleCreate = async () => {
    if (!url.trim() || !title.trim() || !projectId) return;
    try {
      await api.links.create({ url, title, description, projectId });
      toast.success("Link saved");
      setOpen(false); setUrl(""); setTitle(""); setDescription(""); setProjectId("");
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.links.delete(id);
      toast.success("Link deleted");
      fetchData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const filtered = filterProject === "all" ? links : links.filter((l) => l.projectId === filterProject);
  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Links</h1>
        <div className="flex items-center gap-2">
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-[160px]">
              <Filter className="mr-1 h-3.5 w-3.5" />
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Save Link</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Save Link</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>URL</Label><Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." /></div>
                <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Link title" /></div>
                <div className="space-y-2"><Label>Description</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description (optional)" /></div>
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>{projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCreate} className="w-full">Save Link</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Link2 className="mb-2 h-10 w-10" />
          <p>No saved links yet</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((link) => (
            <Card key={link.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary transition-colors flex items-center gap-1">
                    {link.title} <ExternalLink className="h-3 w-3" />
                  </a>
                  {link.description && <p className="text-xs text-muted-foreground truncate">{link.description}</p>}
                  {projectMap[link.projectId] && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: projectMap[link.projectId].color }} />
                      {projectMap[link.projectId].name}
                    </span>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => handleDelete(link.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
