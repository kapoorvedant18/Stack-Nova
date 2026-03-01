import { Router, Request, Response } from "express";
import { storage } from "./storage";
import {
  insertProjectSchema,
  insertTaskSchema,
  insertNoteSchema,
  insertLinkSchema,
  insertEmailSchema,
  insertCalendarEventSchema,
  insertFileSchema,
  insertCustomTagSchema,
} from "../shared/schema";
import msCalendarRouter from "../backend/routes/routemsCalendar";
import { categorizeItem } from "./categorization";
import { fetchMicrosoftCalendarEvents } from "../backend/integrations/msCalendar";
import {
  fetchGmailMessages,
  fetchGoogleDriveFiles,
  fetchGoogleCalendarEvents,
} from "../backend/integrations/googleWorkspace";
import {
  fetchOutlookMessages,
  fetchOneDriveItems,
} from "../backend/integrations/msWorkspace";
import { triageEmail } from "./emailTriage";
const router = Router();
router.use("/ms-calendar", msCalendarRouter);


function getUserId(req: Request): string | null {
  return (req as Request & { userId?: string }).userId ?? null;
}

function toMonthRange(year: number, month: number): { startDate: string; endDate: string } {
  const startDate = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const endDate = new Date(Date.UTC(year, month, 1) - 1).toISOString();
  return { startDate, endDate };
}

function toISODateOnly(value: string): string {
  return new Date(value).toISOString().slice(0, 10);
}

function shouldCreateTaskFromText(text: string): boolean {
  const normalized = text.toLowerCase();
  const keywords = ["todo", "task", "action", "deadline", "follow up", "follow-up"];
  return keywords.some((keyword) => normalized.includes(keyword));
}

function eventDateToIso(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
}

type ProjectSeed = { name: string; color: string };

const SYNC_PROJECT_ALIASES: Array<{ pattern: RegExp; name: string; color: string }> = [
  { pattern: /\bgsoc\b|\bgoogle\s*summer\s*of\s*code\b/i, name: "GSOC", color: "#3b82f6" },
  { pattern: /\bzulip\b/i, name: "Zulip", color: "#8b5cf6" },
  { pattern: /\bgithub\b|\bgh\b/i, name: "GitHub", color: "#111827" },
  { pattern: /\bgitlab\b/i, name: "GitLab", color: "#f97316" },
  { pattern: /\bhackathon\b|\bopen\s*source\b|\bopensource\b/i, name: "Open Source", color: "#10b981" },
  { pattern: /\bintern(ship)?\b/i, name: "Internship", color: "#06b6d4" },
  { pattern: /\bstartup\b|\bpitch\b|\bfundraising\b/i, name: "Startup", color: "#ec4899" },
];

const GENERIC_PROJECT_TERMS = new Set([
  "project",
  "projects",
  "task",
  "tasks",
  "todo",
  "email",
  "emails",
  "calendar",
  "meeting",
  "meetings",
  "work",
  "personal",
  "study",
  "today",
  "upcoming",
  "important",
  "urgent",
  "manual",
]);

function toDisplayProjectName(raw: string): string {
  const cleaned = raw
    .replace(/[^a-zA-Z0-9\s_-]/g, " ")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "General";
  if (cleaned.length <= 5) return cleaned.toUpperCase();

  return cleaned
    .split(" ")
    .map((word) => (word ? `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}` : ""))
    .join(" ");
}

function inferProjectSeed(params: {
  title?: string;
  description?: string;
  tags?: string[];
  source?: string;
  provider?: string;
}): ProjectSeed {
  const title = params.title ?? "";
  const description = params.description ?? "";
  const tags = params.tags ?? [];
  const combined = `${title} ${description} ${tags.join(" ")}`.toLowerCase();

  for (const alias of SYNC_PROJECT_ALIASES) {
    if (alias.pattern.test(combined)) {
      return { name: alias.name, color: alias.color };
    }
  }

  for (const tag of tags) {
    const normalized = tag.trim().toLowerCase();
    if (!normalized || normalized.startsWith("project:")) continue;
    if (GENERIC_PROJECT_TERMS.has(normalized)) continue;
    return { name: toDisplayProjectName(normalized), color: "#6366f1" };
  }

  if ((params.provider ?? "").toLowerCase().includes("google")) {
    return { name: "Google Workspace", color: "#4285f4" };
  }
  if ((params.provider ?? "").toLowerCase().includes("microsoft") || (params.provider ?? "").toLowerCase().includes("outlook")) {
    return { name: "Microsoft Workspace", color: "#2563eb" };
  }
  if ((params.source ?? "").toLowerCase().includes("calendar")) {
    return { name: "Calendar", color: "#f59e0b" };
  }

  return { name: "General", color: "#6366f1" };
}

async function createSyncProjectResolver(userId: string): Promise<(seed: ProjectSeed) => Promise<string>> {
  const existingProjects = await storage.getProjects(userId);
  const projectByName = new Map(existingProjects.map((project) => [project.name.toLowerCase(), project]));

  return async (seed: ProjectSeed): Promise<string> => {
    const normalized = seed.name.trim().toLowerCase();
    const existing = projectByName.get(normalized);
    if (existing) return existing.id;

    const created = await storage.createProject({
      userId,
      name: seed.name.trim() || "General",
      color: seed.color || "#6366f1",
    });
    projectByName.set(created.name.toLowerCase(), created);
    return created.id;
  };
}

router.get("/projects", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const data = await storage.getProjects(userId);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

router.post("/projects", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const parsed = insertProjectSchema.safeParse({ ...req.body, userId });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const project = await storage.createProject(parsed.data);
    res.status(201).json(project);
  } catch (e) {
    res.status(500).json({ error: "Failed to create project" });
  }
});

router.patch("/projects/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const project = await storage.updateProject(req.params.id as string, userId, req.body);
    if (!project) return res.status(404).json({ error: "Not found" });
    res.json(project);
  } catch (e) {
    res.status(500).json({ error: "Failed to update project" });
  }
});

router.delete("/projects/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const ok = await storage.deleteProject(req.params.id as string, userId);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete project" });
  }
});

router.get("/tasks", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const data = await storage.getTasks(userId);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

router.post("/tasks", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const payload = { ...req.body, userId };
  const categorized = await categorizeItem({
    title: payload.title ?? "",
    description: payload.description ?? "",
    source: typeof payload.source === "string" ? payload.source : "Manual",
  });
  const parsed = insertTaskSchema.safeParse({
    ...payload,
    category: payload.category ?? categorized.category,
    tags: payload.tags ?? categorized.tags.join(","),
    priority: payload.priority ?? categorized.priority,
    source: payload.source ?? "Manual",
  });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const task = await storage.createTask(parsed.data);
    res.status(201).json(task);
  } catch (e) {
    res.status(500).json({ error: "Failed to create task" });
  }
});

router.patch("/tasks/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const task = await storage.updateTask(req.params.id as string, userId, req.body);
    if (!task) return res.status(404).json({ error: "Not found" });
    res.json(task);
  } catch (e) {
    res.status(500).json({ error: "Failed to update task" });
  }
});

router.delete("/tasks/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const ok = await storage.deleteTask(req.params.id as string, userId);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete task" });
  }
});

router.get("/notes", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const data = await storage.getNotes(userId);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch notes" });
  }
});

router.post("/notes", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const payload = { ...req.body, userId };
  const categorized = await categorizeItem({
    title: payload.title ?? "",
    description: payload.content ?? "",
    source: "Notes",
  });
  const parsed = insertNoteSchema.safeParse({
    ...payload,
    category: payload.category ?? categorized.category,
    tags: payload.tags ?? categorized.tags.join(","),
    source: payload.source ?? "Notes",
  });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const note = await storage.createNote(parsed.data);
    res.status(201).json(note);
  } catch (e) {
    res.status(500).json({ error: "Failed to create note" });
  }
});

router.patch("/notes/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const note = await storage.updateNote(req.params.id as string, userId, req.body);
    if (!note) return res.status(404).json({ error: "Not found" });
    res.json(note);
  } catch (e) {
    res.status(500).json({ error: "Failed to update note" });
  }
});

router.delete("/notes/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const ok = await storage.deleteNote(req.params.id as string, userId);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete note" });
  }
});

router.get("/links", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const data = await storage.getLinks(userId);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch links" });
  }
});

router.post("/links", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const payload = { ...req.body, userId };
  const categorized = await categorizeItem({
    title: payload.title ?? "",
    description: payload.description ?? "",
    source: "Manual",
  });
  const parsed = insertLinkSchema.safeParse({
    ...payload,
    category: payload.category ?? categorized.category,
    tags: payload.tags ?? categorized.tags.join(","),
    source: payload.source ?? "Manual",
  });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const link = await storage.createLink(parsed.data);
    res.status(201).json(link);
  } catch (e) {
    res.status(500).json({ error: "Failed to create link" });
  }
});

router.patch("/links/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const link = await storage.updateLink(req.params.id as string, userId, req.body);
    if (!link) return res.status(404).json({ error: "Not found" });
    res.json(link);
  } catch {
    res.status(500).json({ error: "Failed to update link" });
  }
});

router.delete("/links/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const ok = await storage.deleteLink(req.params.id as string, userId);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Failed to delete link" });
  }
});

router.get("/emails", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const data = await storage.getEmails(userId);
    res.json(data);
  } catch {
    res.status(500).json({ error: "Failed to fetch emails" });
  }
});

router.post("/emails", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const payload = { ...req.body, userId };
  const categorized = await categorizeItem({
    title: payload.subject ?? payload.title ?? "",
    description: payload.bodySummary ?? "",
    source: "Email",
  });

  const parsed = insertEmailSchema.safeParse({
    ...payload,
    category: payload.category ?? categorized.category,
    tags: payload.tags ?? categorized.tags.join(","),
    source: payload.source ?? "Email",
  });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const email = await storage.createEmail(parsed.data);
    res.status(201).json(email);
  } catch {
    res.status(500).json({ error: "Failed to create email" });
  }
});

router.patch("/emails/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const email = await storage.updateEmail(req.params.id as string, userId, req.body);
    if (!email) return res.status(404).json({ error: "Not found" });
    res.json(email);
  } catch {
    res.status(500).json({ error: "Failed to update email" });
  }
});

router.delete("/emails/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const ok = await storage.deleteEmail(req.params.id as string, userId);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete email" });
  }
});

router.get("/calendar-events", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const data = await storage.getCalendarEvents(userId);
    res.json(data);
  } catch {
    res.status(500).json({ error: "Failed to fetch calendar events" });
  }
});

router.post("/calendar-events", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const body = req.body;
  if (!body.title || !body.startAt || !body.endAt || !body.provider || !body.externalId) {
    return res.status(400).json({ error: "Missing required fields: title, startAt, endAt, provider, externalId" });
  }

  const categorized = await categorizeItem({
    title: body.title ?? "",
    description: body.description ?? "",
    source: "Calendar",
  });

  try {
    const calendarEvent = await storage.createCalendarEvent({
      userId,
      externalId: body.externalId,
      provider: body.provider,
      title: body.title,
      description: body.description ?? "",
      location: body.location ?? "",
      isAllDay: body.isAllDay ?? false,
      startAt: new Date(body.startAt),
      endAt: new Date(body.endAt),
      category: body.category ?? categorized.category,
      tags: body.tags ?? categorized.tags.join(","),
      source: body.source ?? "Calendar",
    });
    res.status(201).json(calendarEvent);
  } catch (e) {
    console.error("[calendar-events POST]", e);
    res.status(500).json({ error: "Failed to create calendar event" });
  }
});

router.patch("/calendar-events/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const event = await storage.updateCalendarEvent(req.params.id as string, userId, req.body);
    if (!event) return res.status(404).json({ error: "Not found" });
    res.json(event);
  } catch {
    res.status(500).json({ error: "Failed to update calendar event" });
  }
});

router.delete("/calendar-events/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const ok = await storage.deleteCalendarEvent(req.params.id as string, userId);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete calendar event" });
  }
});

router.post("/sync/microsoft/calendar", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const providerToken = req.headers["x-provider-token"] as string | undefined;
  if (!providerToken) {
    return res.status(400).json({ error: "Missing X-Provider-Token header" });
  }

  const now = new Date();
  const year = parseInt((req.query.year as string) ?? String(now.getFullYear()), 10);
  const month = parseInt((req.query.month as string) ?? String(now.getMonth() + 1), 10);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: "Invalid year or month query params." });
  }

  try {
    const { startDate, endDate } = toMonthRange(year, month);
    const msEvents = await fetchMicrosoftCalendarEvents(providerToken, startDate, endDate);

    const existingCalendar = await storage.getCalendarEvents(userId);
    const existingMap = new Map(
      existingCalendar
        .filter((event) => event.provider === "microsoft")
        .map((event) => [`${event.externalId}::${event.provider}`, event])
    );

    let created = 0;
    let updated = 0;

    for (const msEvent of msEvents) {
      const description = msEvent.bodyPreview ?? "";
      const categoryResult = await categorizeItem({
        title: msEvent.subject ?? "Untitled event",
        description,
        source: "Calendar",
      });

      const payload = {
        userId,
        externalId: msEvent.id,
        provider: "microsoft",
        title: msEvent.subject ?? "Untitled event",
        description,
        location: msEvent.location?.displayName ?? "",
        isAllDay: Boolean(msEvent.isAllDay),
        startAt: new Date(msEvent.start.dateTime),
        endAt: new Date(msEvent.end.dateTime),
        category: categoryResult.category,
        tags: categoryResult.tags.join(","),
        source: "Calendar",
      };

      const key = `${payload.externalId}::${payload.provider}`;
      const existing = existingMap.get(key);

      if (existing) {
        await storage.updateCalendarEvent(existing.id, userId, {
          title: payload.title,
          description: payload.description,
          location: payload.location,
          isAllDay: payload.isAllDay,
          startAt: payload.startAt,
          endAt: payload.endAt,
          category: payload.category,
          tags: payload.tags,
          source: payload.source,
        });
        updated += 1;
      } else {
        const createdEvent = await storage.createCalendarEvent(payload);
        existingMap.set(key, createdEvent);
        created += 1;
      }
    }

    const resolveProjectId = await createSyncProjectResolver(userId);
    let tasksCreated = 0;
    const actionableEvents = msEvents.filter((event) => shouldCreateTaskFromText(event.subject ?? ""));
    if (actionableEvents.length > 0) {
      const existingTasks = await storage.getTasks(userId);

      for (const event of actionableEvents) {
        const dueDate = toISODateOnly(event.start.dateTime);
        const title = event.subject ?? "Calendar follow-up";
        const duplicate = existingTasks.some(
          (task) => task.source === "Calendar" && task.title === title && task.dueDate === dueDate
        );
        if (duplicate) continue;

        const categoryResult = await categorizeItem({
          title,
          description: event.bodyPreview ?? "",
          source: "Calendar",
        });

        const projectId = await resolveProjectId(
          inferProjectSeed({
            title,
            description: event.bodyPreview ?? "",
            tags: categoryResult.tags,
            source: "Calendar",
            provider: "microsoft",
          })
        );

        const createdTask = await storage.createTask({
          userId,
          projectId,
          title,
          description: event.bodyPreview ?? "",
          dueDate,
          status: "todo",
          category: categoryResult.category,
          tags: categoryResult.tags.join(","),
          priority: categoryResult.priority,
          source: "Calendar",
        });
        existingTasks.push(createdTask);
        tasksCreated += 1;
      }
    }

    res.json({
      success: true,
      period: { year, month },
      totals: {
        fetched: msEvents.length,
        created,
        updated,
        tasksCreated,
      },
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync Microsoft calendar";
    if (message.includes("401") || message.includes("InvalidAuthenticationToken")) {
      return res.status(401).json({ error: "Microsoft token is invalid or expired." });
    }
    return res.status(500).json({ error: message });
  }
});

router.post("/sync/google/workspace", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const providerToken = req.headers["x-provider-token"] as string | undefined;
  if (!providerToken) {
    return res.status(400).json({ error: "Missing X-Provider-Token header" });
  }

  const now = new Date();
  const year = parseInt((req.query.year as string) ?? String(now.getFullYear()), 10);
  const month = parseInt((req.query.month as string) ?? String(now.getMonth() + 1), 10);
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return res.status(400).json({ error: "Invalid year or month query params." });
  }

  try {
    const { startDate, endDate } = toMonthRange(year, month);

    const [gmailResult, driveResult, calendarResult] = await Promise.allSettled([
      fetchGmailMessages(providerToken, 25),
      fetchGoogleDriveFiles(providerToken, 25),
      fetchGoogleCalendarEvents(providerToken, startDate, endDate, 100),
    ]);

    const syncErrors: string[] = [];
    const gmailRows = gmailResult.status === "fulfilled" ? gmailResult.value : [];
    const driveRows = driveResult.status === "fulfilled" ? driveResult.value : [];
    const calendarRows = calendarResult.status === "fulfilled" ? calendarResult.value : [];

    if (gmailResult.status === "rejected") syncErrors.push(`gmail: ${String(gmailResult.reason)}`);
    if (driveResult.status === "rejected") syncErrors.push(`drive: ${String(driveResult.reason)}`);
    if (calendarResult.status === "rejected") syncErrors.push(`calendar: ${String(calendarResult.reason)}`);

    if (gmailRows.length === 0 && driveRows.length === 0 && calendarRows.length === 0 && syncErrors.length > 0) {
      const authFailure = syncErrors.some((entry) => entry.includes("401") || entry.includes("invalid_grant"));
      if (authFailure) {
        return res.status(401).json({ error: "Google token is invalid or expired.", syncErrors });
      }
    }

    const [existingEmails, existingFiles, existingCalendar, existingTasks] = await Promise.all([
      storage.getEmails(userId),
      storage.getFiles(userId),
      storage.getCalendarEvents(userId),
      storage.getTasks(userId),
    ]);

    const deletedEmailKeys = await storage.getDeletedEmailKeys(userId);
    const emailMap = new Map(
      existingEmails
        .filter((item) => item.provider === "gmail")
        .map((item) => [`${item.externalId}::${item.provider}`, item])
    );
    const fileMap = new Map(
      existingFiles
        .filter((item) => item.provider === "google-drive")
        .map((item) => [`${item.externalId}::${item.provider}`, item])
    );
    const calendarMap = new Map(
      existingCalendar
        .filter((item) => item.provider === "google-calendar")
        .map((item) => [`${item.externalId}::${item.provider}`, item])
    );

    let emailsCreated = 0;
    let emailsUpdated = 0;
    let emailsSkipped = 0;
    for (const row of gmailRows) {
      const triaged = await triageEmail({
        subject: row.subject,
        bodySummary: row.snippet,
        sender: row.from,
        provider: "gmail",
      });
      if (!triaged.keep) {
        emailsSkipped += 1;
        continue;
      }
      const isImportant =
        triaged.important ||
        row.labelIds.includes("IMPORTANT") ||
        row.labelIds.includes("STARRED") ||
        row.subject.toLowerCase().includes("urgent");
      const receivedAt = row.internalDate ? new Date(Number(row.internalDate)).toISOString() : new Date().toISOString();

      const payload = {
        userId,
        externalId: row.id,
        provider: "gmail",
        sender: row.from,
        subject: row.subject,
        bodySummary: row.snippet,
        attachments: "",
        isImportant,
        category: triaged.category,
        tags: triaged.tags.join(","),
        source: "Email",
        receivedAt: new Date(receivedAt),
      };

      const key = `${payload.externalId}::${payload.provider}`;
      if (deletedEmailKeys.has(key)) { emailsSkipped += 1; continue; }
      const existing = emailMap.get(key);
      if (existing) {
        await storage.updateEmail(existing.id, userId, {
          sender: payload.sender,
          subject: payload.subject,
          bodySummary: payload.bodySummary,
          isImportant: payload.isImportant,
          category: payload.category,
          tags: payload.tags,
          source: payload.source,
          receivedAt: payload.receivedAt,
        });
        emailsUpdated += 1;
      } else {
        const created = await storage.createEmail(payload);
        emailMap.set(key, created);
        emailsCreated += 1;
      }
    }

    let filesCreated = 0;
    let filesUpdated = 0;
    for (const row of driveRows) {
      const categorized = await categorizeItem({
        title: row.name,
        description: row.mimeType,
        source: "Files",
      });

      const payload = {
        userId,
        externalId: row.id,
        provider: "google-drive",
        name: row.name,
        mimeType: row.mimeType,
        webUrl: row.webViewLink ?? "",
        category: categorized.category,
        tags: categorized.tags.join(","),
        source: "Files",
        modifiedAt: new Date(row.modifiedTime),
      };

      const key = `${payload.externalId}::${payload.provider}`;
      const existing = fileMap.get(key);
      if (existing) {
        await storage.updateFile(existing.id, userId, {
          name: payload.name,
          mimeType: payload.mimeType,
          webUrl: payload.webUrl,
          category: payload.category,
          tags: payload.tags,
          source: payload.source,
          modifiedAt: payload.modifiedAt,
        });
        filesUpdated += 1;
      } else {
        const created = await storage.createFile(payload);
        fileMap.set(key, created);
        filesCreated += 1;
      }
    }

    let calendarCreated = 0;
    let calendarUpdated = 0;
    for (const row of calendarRows) {
      const title = row.summary || "Untitled event";
      const description = row.description ?? "";
      const categorized = await categorizeItem({
        title,
        description,
        source: "Calendar",
      });

      const startAt = eventDateToIso(row.start?.dateTime ?? row.start?.date);
      const endAt = eventDateToIso(row.end?.dateTime ?? row.end?.date);
      if (!startAt || !endAt) continue;

      const payload = {
        userId,
        externalId: row.id,
        provider: "google-calendar",
        title,
        description,
        location: row.location ?? "",
        isAllDay: Boolean(row.start?.date && !row.start?.dateTime),
        startAt: new Date(startAt),
        endAt: new Date(endAt),
        category: categorized.category,
        tags: categorized.tags.join(","),
        source: "Calendar",
      };

      const key = `${payload.externalId}::${payload.provider}`;
      const existing = calendarMap.get(key);
      if (existing) {
        await storage.updateCalendarEvent(existing.id, userId, {
          title: payload.title,
          description: payload.description,
          location: payload.location,
          isAllDay: payload.isAllDay,
          startAt: payload.startAt,
          endAt: payload.endAt,
          category: payload.category,
          tags: payload.tags,
          source: payload.source,
        });
        calendarUpdated += 1;
      } else {
        const created = await storage.createCalendarEvent(payload);
        calendarMap.set(key, created);
        calendarCreated += 1;
      }
    }

    const resolveProjectId = await createSyncProjectResolver(userId);
    let tasksCreated = 0;

    for (const row of gmailRows) {
      if (!shouldCreateTaskFromText(`${row.subject} ${row.snippet}`)) continue;
      const dueDate = toISODateOnly(new Date(Number(row.internalDate) || Date.now()).toISOString());
      const duplicate = existingTasks.some(
        (task) => task.source === "Email" && task.title === row.subject && task.dueDate === dueDate
      );
      if (duplicate) continue;

      const triaged = await triageEmail({
        subject: row.subject,
        bodySummary: row.snippet,
        sender: row.from,
        provider: "gmail",
      });
      if (!triaged.keep) continue;

      const projectId = await resolveProjectId(
        inferProjectSeed({
          title: row.subject,
          description: row.snippet,
          tags: triaged.tags,
          source: "Email",
          provider: "gmail",
        })
      );

      const createdTask = await storage.createTask({
        userId,
        projectId,
        title: row.subject,
        description: row.snippet,
        dueDate,
        status: "todo",
        category: triaged.category,
        tags: triaged.tags.join(","),
        priority: triaged.priority,
        source: "Email",
      });
      existingTasks.push(createdTask);
      tasksCreated += 1;
    }

    res.json({
      success: true,
      period: { year, month },
      totals: {
        gmailFetched: gmailRows.length,
        gmailCreated: emailsCreated,
        gmailUpdated: emailsUpdated,
        gmailSkipped: emailsSkipped,
        filesFetched: driveRows.length,
        filesCreated,
        filesUpdated,
        calendarFetched: calendarRows.length,
        calendarCreated,
        calendarUpdated,
        tasksCreated,
      },
      syncErrors,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync Google workspace";
    if (message.includes("401") || message.includes("invalid_grant")) {
      return res.status(401).json({ error: "Google token is invalid or expired." });
    }
    return res.status(500).json({ error: message });
  }
});

router.post("/sync/microsoft/workspace", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const providerToken = req.headers["x-provider-token"] as string | undefined;
  if (!providerToken) {
    return res.status(400).json({ error: "Missing X-Provider-Token header" });
  }

  try {
    const [mailResult, driveResult] = await Promise.allSettled([
      fetchOutlookMessages(providerToken, 25),
      fetchOneDriveItems(providerToken, 25),
    ]);

    const syncErrors: string[] = [];
    const mailRows = mailResult.status === "fulfilled" ? mailResult.value : [];
    const driveRows = driveResult.status === "fulfilled" ? driveResult.value : [];

    if (mailResult.status === "rejected") syncErrors.push(`outlook-mail: ${String(mailResult.reason)}`);
    if (driveResult.status === "rejected") syncErrors.push(`onedrive: ${String(driveResult.reason)}`);

    if (mailRows.length === 0 && driveRows.length === 0 && syncErrors.length > 0) {
      const authFailure = syncErrors.some((entry) => entry.includes("401") || entry.includes("InvalidAuthenticationToken"));
      if (authFailure) {
        return res.status(401).json({ error: "Microsoft token is invalid or expired.", syncErrors });
      }
    }

    const [existingEmails, existingFiles, existingTasks] = await Promise.all([
      storage.getEmails(userId),
      storage.getFiles(userId),
      storage.getTasks(userId),
    ]);

    const deletedEmailKeys = await storage.getDeletedEmailKeys(userId);
    const emailMap = new Map(
      existingEmails
        .filter((item) => item.provider === "outlook")
        .map((item) => [`${item.externalId}::${item.provider}`, item])
    );
    const fileMap = new Map(
      existingFiles
        .filter((item) => item.provider === "onedrive")
        .map((item) => [`${item.externalId}::${item.provider}`, item])
    );

    let emailsCreated = 0;
    let emailsUpdated = 0;
    let emailsSkipped = 0;

    for (const row of mailRows) {
      const subject = row.subject || "(no subject)";
      const sender = row.from?.emailAddress?.name || row.from?.emailAddress?.address || "Unknown sender";
      const bodySummary = row.bodyPreview ?? "";
      const triaged = await triageEmail({
        subject,
        bodySummary,
        sender,
        provider: "outlook",
      });
      if (!triaged.keep) {
        emailsSkipped += 1;
        continue;
      }

      const payload = {
        userId,
        externalId: row.id,
        provider: "outlook",
        sender,
        subject,
        bodySummary,
        attachments: "",
        isImportant: row.importance === "high" || triaged.important,
        category: triaged.category,
        tags: triaged.tags.join(","),
        source: "Email",
        receivedAt: new Date(row.receivedDateTime || new Date().toISOString()),
      };

      const key = `${payload.externalId}::${payload.provider}`;
      if (deletedEmailKeys.has(key)) { emailsSkipped += 1; continue; }
      const existing = emailMap.get(key);
      if (existing) {
        await storage.updateEmail(existing.id, userId, {
          sender: payload.sender,
          subject: payload.subject,
          bodySummary: payload.bodySummary,
          isImportant: payload.isImportant,
          category: payload.category,
          tags: payload.tags,
          source: payload.source,
          receivedAt: payload.receivedAt,
        });
        emailsUpdated += 1;
      } else {
        const created = await storage.createEmail(payload);
        emailMap.set(key, created);
        emailsCreated += 1;
      }
    }

    let filesCreated = 0;
    let filesUpdated = 0;

    for (const row of driveRows) {
      const categorized = await categorizeItem({ title: row.name, description: row.file?.mimeType ?? "", source: "Files" });

      const payload = {
        userId,
        externalId: row.id,
        provider: "onedrive",
        name: row.name,
        mimeType: row.file?.mimeType ?? "",
        webUrl: row.webUrl ?? "",
        category: categorized.category,
        tags: categorized.tags.join(","),
        source: "Files",
        modifiedAt: new Date(row.lastModifiedDateTime || new Date().toISOString()),
      };

      const key = `${payload.externalId}::${payload.provider}`;
      const existing = fileMap.get(key);
      if (existing) {
        await storage.updateFile(existing.id, userId, {
          name: payload.name,
          mimeType: payload.mimeType,
          webUrl: payload.webUrl,
          category: payload.category,
          tags: payload.tags,
          source: payload.source,
          modifiedAt: payload.modifiedAt,
        });
        filesUpdated += 1;
      } else {
        const created = await storage.createFile(payload);
        fileMap.set(key, created);
        filesCreated += 1;
      }
    }

    const resolveProjectId = await createSyncProjectResolver(userId);
    let tasksCreated = 0;
    for (const row of mailRows) {
      const subject = row.subject || "(no subject)";
      const bodySummary = row.bodyPreview ?? "";
      if (!shouldCreateTaskFromText(`${subject} ${bodySummary}`)) continue;

      const dueDate = toISODateOnly(row.receivedDateTime || new Date().toISOString());
      const duplicate = existingTasks.some(
        (task) => task.source === "Email" && task.title === subject && task.dueDate === dueDate
      );
      if (duplicate) continue;

      const triaged = await triageEmail({
        subject,
        bodySummary,
        sender: row.from?.emailAddress?.name || row.from?.emailAddress?.address || "Unknown sender",
        provider: "outlook",
      });
      if (!triaged.keep) continue;

      const projectId = await resolveProjectId(
        inferProjectSeed({
          title: subject,
          description: bodySummary,
          tags: triaged.tags,
          source: "Email",
          provider: "outlook",
        })
      );

      const createdTask = await storage.createTask({
        userId,
        projectId,
        title: subject,
        description: bodySummary,
        dueDate,
        status: "todo",
        category: triaged.category,
        tags: triaged.tags.join(","),
        priority: triaged.priority,
        source: "Email",
      });
      existingTasks.push(createdTask);
      tasksCreated += 1;
    }

    return res.json({
      success: true,
      totals: {
        outlookFetched: mailRows.length,
        outlookCreated: emailsCreated,
        outlookUpdated: emailsUpdated,
        outlookSkipped: emailsSkipped,
        oneDriveFetched: driveRows.length,
        oneDriveCreated: filesCreated,
        oneDriveUpdated: filesUpdated,
        tasksCreated,
      },
      syncErrors,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync Microsoft workspace";
    if (message.includes("401") || message.includes("InvalidAuthenticationToken")) {
      return res.status(401).json({ error: "Microsoft token is invalid or expired." });
    }
    return res.status(500).json({ error: message });
  }
});

router.get("/files", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const data = await storage.getFiles(userId);
    res.json(data);
  } catch {
    res.status(500).json({ error: "Failed to fetch files" });
  }
});

router.post("/files", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const payload = { ...req.body, userId };
  const normalizedPayload = {
    ...payload,
    name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim() : "Untitled File",
    provider: typeof payload.provider === "string" && payload.provider.trim() ? payload.provider.trim() : "manual",
    externalId:
      typeof payload.externalId === "string" && payload.externalId.trim()
        ? payload.externalId.trim()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    webUrl: typeof payload.webUrl === "string" ? payload.webUrl : "",
    mimeType: typeof payload.mimeType === "string" ? payload.mimeType : "",
  };
  const categorized = await categorizeItem({
    title: normalizedPayload.name ?? "",
    description: normalizedPayload.mimeType ?? "",
    source: "Files",
  });

  const parsed = insertFileSchema.safeParse({
    ...normalizedPayload,
    category: normalizedPayload.category ?? categorized.category,
    tags: normalizedPayload.tags ?? categorized.tags.join(","),
    source: normalizedPayload.source ?? "Files",
  });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const file = await storage.createFile(parsed.data);
    res.status(201).json(file);
  } catch {
    res.status(500).json({ error: "Failed to create file" });
  }
});

router.patch("/files/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const file = await storage.updateFile(req.params.id as string, userId, req.body);
    if (!file) return res.status(404).json({ error: "Not found" });
    res.json(file);
  } catch {
    res.status(500).json({ error: "Failed to update file" });
  }
});

router.delete("/files/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const ok = await storage.deleteFile(req.params.id as string, userId);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete file" });
  }
});

router.get("/custom-tags", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const data = await storage.getCustomTags(userId);
    res.json(data);
  } catch {
    res.status(500).json({ error: "Failed to fetch custom tags" });
  }
});

router.post("/custom-tags", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  const parsed = insertCustomTagSchema.safeParse({ ...req.body, userId });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const customTag = await storage.createCustomTag(parsed.data);
    res.status(201).json(customTag);
  } catch {
    res.status(500).json({ error: "Failed to create custom tag" });
  }
});

router.delete("/custom-tags/:id", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });
  try {
    const ok = await storage.deleteCustomTag(req.params.id as string, userId);
    if (!ok) return res.status(404).json({ error: "Not found" });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete custom tag" });
  }
});

router.get("/dashboard/summary", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [taskRows, calendarRows, emailRows, noteRows] = await Promise.all([
      storage.getTasks(userId),
      storage.getCalendarEvents(userId),
      storage.getEmails(userId),
      storage.getNotes(userId),
    ]);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const todaysTasks = taskRows.filter((task) => task.dueDate && new Date(task.dueDate) >= startOfToday && new Date(task.dueDate) < endOfToday);
    const todaysMeetings = calendarRows.filter((event) => new Date(event.startAt) >= startOfToday && new Date(event.startAt) < endOfToday);
    const importantEmails = emailRows.filter((email) => email.isImportant).slice(0, 8);
    const notesSummary = noteRows.slice(0, 8);
    const priorityTasks = taskRows.filter((task) => task.priority === "high").slice(0, 8);

    res.json({ todaysTasks, todaysMeetings, importantEmails, notesSummary, priorityTasks, updatedAt: new Date().toISOString() });
  } catch {
    res.status(500).json({ error: "Failed to fetch dashboard summary" });
  }
});

export default router;