import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { api, type FileRecord } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { File, Plus, Pencil, Trash2, Search, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const CATEGORIES = ["Work", "Study", "Personal", "Meetings", "Projects", "Today", "Upcoming"];

export default function FilesPage() {
  const { user, googleProviderToken, msProviderToken } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<FileRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [showChooseModal, setShowChooseModal] = useState(false);
  const [dbFiles, setDbFiles] = useState<FileRecord[]>([]);
  const [choosing, setChoosing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [mimeType, setMimeType] = useState("");
  const [webUrl, setWebUrl] = useState("");
  const [provider, setProvider] = useState("google-drive");
  const [category, setCategory] = useState("Projects");
  const [tags, setTags] = useState("");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  const fetchFiles = async () => {
    try {
      const data = await api.files.list();
      setRows(data || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load files";
      toast.error(message);
    }
  };

  const runProviderSync = async () => {
    try {
      const syncCalls: Array<Promise<unknown>> = [];

      if (googleProviderToken) {
        const now = new Date();
        syncCalls.push(
          api.sync.googleWorkspace({
            year: now.getFullYear(),
            month: now.getMonth() + 1,
            providerToken: googleProviderToken,
          })
        );
      }

      if (msProviderToken) {
        syncCalls.push(
          api.sync.microsoftWorkspace({
            providerToken: msProviderToken,
          })
        );
      }

      if (syncCalls.length > 0) {
        await Promise.allSettled(syncCalls);
      }

      await fetchFiles();
    } catch {
      // keep page responsive if provider sync fails
    }
  };

  const load = async () => {
    await fetchFiles();
  };

  useEffect(() => {
    if (!user) return;
    fetchFiles();
    runProviderSync();

    const interval = window.setInterval(fetchFiles, 30000);
    const syncInterval = window.setInterval(runProviderSync, 180000);
    return () => {
      window.clearInterval(interval);
      window.clearInterval(syncInterval);
    };
  }, [user, googleProviderToken, msProviderToken]);

  const resetForm = () => {
    setEditId(null);
    setName("");
    setMimeType("");
    setWebUrl("");
    setProvider("google-drive");
    setCategory("Projects");
    setTags("");
  };

  const handleCreateNote = () => {
    setQuickAddOpen(false);
    navigate("/notes");
  };

  const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (fileInputRef.current) fileInputRef.current.value = "";

    setUploading(true);
    setUploadError(null);

    const filePath = `files/${Date.now()}_${file.name}`;
    const { error: uploadErr } = await supabase.storage.from("files").upload(filePath, file);

    if (uploadErr) {
      setUploadError(uploadErr.message);
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
        tags: "",
      });
      await load();
      window.dispatchEvent(new CustomEvent("files:changed"));
      setQuickAddOpen(false);
    } catch (err: any) {
      setUploadError(err?.message || "Failed to save file record");
    } finally {
      setUploading(false);
    }
  };

  const openChooseFromDb = async () => {
    setChoosing(true);
    try {
      const all = await api.files.listAll();
      setDbFiles(all || []);
      setQuickAddOpen(false);
      setShowChooseModal(true);
    } catch (err) {
      console.error("Failed to load DB files", err);
      setDbFiles([]);
    } finally {
      setChoosing(false);
    }
  };

  const handleAttachFromDb = async (file: FileRecord) => {
    const raw = file as any;
    const path = raw.externalId || file.webUrl || crypto.randomUUID();
    try {
      await api.files.create({
        name: file.name,
        externalId: path,
        provider: file.provider || "manual",
        mimeType: file.mimeType || "",
        webUrl: file.webUrl || "",
        source: "Files",
        category: file.category || "Projects",
        tags: file.tags || "",
      });
      await load();
      window.dispatchEvent(new CustomEvent("files:changed"));
      setShowChooseModal(false);
    } catch (err) {
      console.error("Attach failed", err);
      toast.error("Failed to attach file");
    }
  };

  const handleDownloadFile = async (file: FileRecord) => {
    const raw = file as any;
    const path = raw.externalId || file.webUrl || "";
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
      toast.error("Download failed");
    }
  };

  const save = async () => {
    if (!name.trim()) {
      toast.error("File name is required");
      return;
    }

    const payload = {
      name: name.trim(),
      mimeType: mimeType.trim(),
      webUrl: webUrl.trim(),
      provider,
      category,
      tags,
      externalId: editId ?? crypto.randomUUID(),
      source: "Files",
      modifiedAt: new Date().toISOString(),
    };

    try {
      if (editId) {
        await api.files.update(editId, payload);
        toast.success("File updated");
      } else {
        await api.files.create(payload);
        toast.success("File saved");
      }
      setOpen(false);
      resetForm();
      load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save file";
      toast.error(message);
    }
  };

  const openEdit = (row: FileRecord) => {
    setEditId(row.id);
    setName(row.name);
    setMimeType(row.mimeType ?? "");
    setWebUrl(row.webUrl ?? "");
    setProvider(row.provider || "google-drive");
    setCategory(row.category || "Projects");
    setTags(row.tags || "");
    setOpen(true);
  };

  const remove = async (id: string) => {
    try {
      await api.files.delete(id);
      toast.success("File deleted");
      load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete file";
      toast.error(message);
    }
  };

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const textMatch = `${row.name} ${row.mimeType ?? ""}`.toLowerCase().includes(search.toLowerCase());
      const categoryMatch = filterCategory === "all" || row.category === filterCategory;
      return textMatch && categoryMatch;
    });
  }, [rows, search, filterCategory]);

  const formatModifiedAt = (value?: string) => {
    if (!value) return "Unknown time";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Unknown time";
    return format(parsed, "MMM d, h:mm a");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold tracking-tight">Files</h1>

        <Button size="sm" onClick={() => setQuickAddOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />New File
        </Button>

        <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) resetForm(); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Edit File" : "Add File"}</DialogTitle>
              <DialogDescription>Manage file metadata, provider, category, and tags.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(event) => setName(event.target.value)} />
              </div>
              <div>
                <Label>MIME Type</Label>
                <Input value={mimeType} onChange={(event) => setMimeType(event.target.value)} placeholder="application/pdf" />
              </div>
              <div>
                <Label>Web URL</Label>
                <Input value={webUrl} onChange={(event) => setWebUrl(event.target.value)} placeholder="https://..." />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Provider</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google-drive">google-drive</SelectItem>
                      <SelectItem value="onedrive">onedrive</SelectItem>
                      <SelectItem value="manual">manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Tags (comma separated)</Label>
                <Input value={tags} onChange={(event) => setTags(event.target.value)} />
              </div>
              <Button className="w-full" onClick={save}>{editId ? "Update" : "Save"}</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add File</DialogTitle>
              <DialogDescription>Choose how you want to add files.</DialogDescription>
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

              <button
                onClick={() => { setQuickAddOpen(false); setOpen(true); }}
                disabled={uploading}
                className="w-full py-3 border rounded-lg hover:bg-gray-100"
              >
                Add Metadata Manually
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
              <DialogDescription>Pick an existing file record and duplicate it into this files list.</DialogDescription>
            </DialogHeader>
            {choosing ? <div>Loading…</div> : (
              <div className="grid gap-2">
                {dbFiles.length === 0 ? <div className="text-sm text-muted-foreground">No files found</div> :
                  dbFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{file.name}</div>
                        <div className="text-xs text-muted-foreground">{file.provider || "manual"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleDownloadFile(file)} className="px-2 py-1 text-sm border rounded">Download</button>
                        <button onClick={() => handleAttachFromDb(file)} className="px-2 py-1 text-sm bg-blue-500 text-white rounded">Attach</button>
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
        <div className="relative">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
          <Input className="pl-9" placeholder="Search files..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger><SelectValue placeholder="Filter category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <File className="h-10 w-10 mx-auto mb-2" />
            No files found
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((row) => (
            <Card key={row.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{row.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{row.mimeType || "unknown"} • {formatModifiedAt(row.modifiedAt)}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(row)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(row.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">{row.category}</Badge>
                  <Badge variant="outline">{row.provider}</Badge>
                  {row.tags?.split(",").filter(Boolean).map((tag) => (
                    <Badge key={tag} variant="outline">#{tag.trim()}</Badge>
                  ))}
                </div>
                {row.webUrl && (
                  <a href={row.webUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                    Open file <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
