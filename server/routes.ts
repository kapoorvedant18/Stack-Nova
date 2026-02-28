import { Router, Request, Response } from "express";
import { storage } from "./storage";
import { insertProjectSchema, insertTaskSchema, insertNoteSchema, insertLinkSchema } from "../shared/schema";
import msCalendarRouter from "../backend/routes/routemsCalendar";
const router = Router();
router.use("/ms-calendar", msCalendarRouter);


function getUserId(req: Request): string | null {
  return (req as any).userId ?? null;
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
  const parsed = insertTaskSchema.safeParse({ ...req.body, userId });
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
  const parsed = insertNoteSchema.safeParse({ ...req.body, userId });
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
  const parsed = insertLinkSchema.safeParse({ ...req.body, userId });
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  try {
    const link = await storage.createLink(parsed.data);
    res.status(201).json(link);
  } catch (e) {
    res.status(500).json({ error: "Failed to create link" });
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

export default router;
