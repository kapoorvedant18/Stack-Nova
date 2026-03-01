import { useCallback, useEffect, useMemo, useState } from "react";
import { api, type EmailRecord } from "@/lib/api";
import { emailEvents } from "@/lib/emailEvents";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Mail, Plus, Pencil, Trash2, Search } from "lucide-react";
import { format } from "date-fns";

const CATEGORIES = ["Work", "Study", "Personal", "Meetings", "Projects", "Today", "Upcoming"];

export default function Emails() {
  const { user, googleProviderToken, msProviderToken } = useAuth();
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [sender, setSender] = useState("");
  const [subject, setSubject] = useState("");
  const [bodySummary, setBodySummary] = useState("");
  const [category, setCategory] = useState("Work");
  const [tags, setTags] = useState("");
  const [provider, setProvider] = useState("gmail");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  // Lightweight fetch — used for interval, rollbacks, and cross-tab refresh
  const fetchEmails = useCallback(async () => {
    try {
      const rows = await api.emails.list();
      setEmails(rows || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load emails";
      toast.error(message);
    }
  }, []);

  // Full sync + fetch — used only on initial mount
  const load = useCallback(async () => {
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

      await fetchEmails();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load emails";
      toast.error(message);
    }
  }, [googleProviderToken, msProviderToken, fetchEmails]);

  useEffect(() => {
    if (!user) return;
    load(); // full sync on mount

    // Lightweight poll every 30s — just re-fetches from DB, no provider sync
    const interval = window.setInterval(fetchEmails, 30000);

    // Stay in sync with the Dashboard tab
    const unsubDeleted = emailEvents.onDeleted((id) => {
      setEmails((prev) => prev.filter((e) => e.id !== id));
    });
    const unsubRefresh = emailEvents.onRefresh(() => {
      fetchEmails();
    });

    return () => {
      window.clearInterval(interval);
      unsubDeleted();
      unsubRefresh();
    };
  }, [load, fetchEmails]);

  const resetForm = () => {
    setEditId(null);
    setSender("");
    setSubject("");
    setBodySummary("");
    setCategory("Work");
    setTags("");
    setProvider("gmail");
  };

  const save = async () => {
    if (!sender.trim() || !subject.trim()) {
      toast.error("Sender and subject are required");
      return;
    }

    const payload = {
      sender: sender.trim(),
      subject: subject.trim(),
      bodySummary: bodySummary.trim(),
      category,
      tags,
      provider,
      externalId: editId ?? crypto.randomUUID(),
      source: "Email",
      receivedAt: new Date().toISOString(),
    };

    try {
      if (editId) {
        await api.emails.update(editId, payload);
        toast.success("Email updated");
      } else {
        await api.emails.create(payload);
        toast.success("Email saved");
      }
      setOpen(false);
      resetForm();
      await fetchEmails();
      emailEvents.emitRefresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save email";
      toast.error(message);
    }
  };

  const openEdit = (email: EmailRecord) => {
    setEditId(email.id);
    setSender(email.sender);
    setSubject(email.subject);
    setBodySummary(email.bodySummary ?? "");
    setCategory(email.category || "Work");
    setTags(email.tags || "");
    setProvider(email.provider || "gmail");
    setOpen(true);
  };

  const remove = async (id: string) => {
    // Optimistic remove
    setEmails((prev) => prev.filter((e) => e.id !== id));
    // Tell Dashboard immediately
    emailEvents.emitDeleted(id);
    try {
      await api.emails.delete(id);
      toast.success("Email deleted");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to delete email";
      toast.error(message);
      // Roll back
      fetchEmails();
      emailEvents.emitRefresh();
    }
  };

  const filtered = useMemo(() => {
    return emails.filter((email) => {
      const textMatch = `${email.subject} ${email.sender} ${email.bodySummary ?? ""}`
        .toLowerCase()
        .includes(search.toLowerCase());
      const categoryMatch = filterCategory === "all" || email.category === filterCategory;
      return textMatch && categoryMatch;
    });
  }, [emails, search, filterCategory]);

  const formatReceivedAt = (value?: string) => {
    if (!value) return "Unknown time";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Unknown time";
    return format(parsed, "MMM d, h:mm a");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold tracking-tight">Emails</h1>

        <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) resetForm(); }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />New Email</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editId ? "Edit Email" : "Add Email"}</DialogTitle>
              <DialogDescription>Create or update email metadata and category tags.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Sender</Label>
                <Input value={sender} onChange={(event) => setSender(event.target.value)} />
              </div>
              <div>
                <Label>Subject</Label>
                <Input value={subject} onChange={(event) => setSubject(event.target.value)} />
              </div>
              <div>
                <Label>Summary</Label>
                <Textarea value={bodySummary} onChange={(event) => setBodySummary(event.target.value)} rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Provider</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gmail">gmail</SelectItem>
                      <SelectItem value="outlook">outlook</SelectItem>
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
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
        <div className="relative">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-3" />
          <Input className="pl-9" placeholder="Search subject, sender..." value={search} onChange={(event) => setSearch(event.target.value)} />
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
            <Mail className="h-10 w-10 mx-auto mb-2" />
            No emails found
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((email) => (
            <Card key={email.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{email.subject}</CardTitle>
                    <p className="text-xs text-muted-foreground">{email.sender} • {formatReceivedAt(email.receivedAt)}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(email)}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => remove(email.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{email.bodySummary || "No summary"}</p>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">{email.category}</Badge>
                  <Badge variant="outline">{email.provider}</Badge>
                  {email.tags?.split(",").filter(Boolean).map((tag) => (
                    <Badge key={tag} variant="outline">#{tag.trim()}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}