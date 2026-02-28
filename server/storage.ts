import { db } from "./db";
import { projects, tasks, notes, links } from "../shared/schema";
import { eq, and, desc } from "drizzle-orm";
import type { Project, InsertProject, Task, InsertTask, Note, InsertNote, Link, InsertLink } from "../shared/schema";

export interface IStorage {
  getProjects(userId: string): Promise<Project[]>;
  createProject(data: InsertProject): Promise<Project>;
  updateProject(id: string, userId: string, data: Partial<InsertProject>): Promise<Project | null>;
  deleteProject(id: string, userId: string): Promise<boolean>;

  getTasks(userId: string): Promise<Task[]>;
  createTask(data: InsertTask): Promise<Task>;
  updateTask(id: string, userId: string, data: Partial<InsertTask>): Promise<Task | null>;
  deleteTask(id: string, userId: string): Promise<boolean>;

  getNotes(userId: string): Promise<Note[]>;
  createNote(data: InsertNote): Promise<Note>;
  updateNote(id: string, userId: string, data: Partial<InsertNote>): Promise<Note | null>;
  deleteNote(id: string, userId: string): Promise<boolean>;

  getLinks(userId: string): Promise<Link[]>;
  createLink(data: InsertLink): Promise<Link>;
  deleteLink(id: string, userId: string): Promise<boolean>;
}

export type StorageMode = "database" | "memory-fallback";

type DbClient = NonNullable<typeof db>;

export class DatabaseStorage implements IStorage {
  constructor(private readonly database: DbClient) {}

  async getProjects(userId: string): Promise<Project[]> {
    return this.database.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt));
  }

  async createProject(data: InsertProject): Promise<Project> {
    const [project] = await this.database.insert(projects).values(data).returning();
    return project;
  }

  async updateProject(id: string, userId: string, data: Partial<InsertProject>): Promise<Project | null> {
    const [project] = await this.database.update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(projects.id, id), eq(projects.userId, userId)))
      .returning();
    return project ?? null;
  }

  async deleteProject(id: string, userId: string): Promise<boolean> {
    const result = await this.database.delete(projects).where(and(eq(projects.id, id), eq(projects.userId, userId))).returning();
    return result.length > 0;
  }

  async getTasks(userId: string): Promise<Task[]> {
    return this.database.select().from(tasks).where(eq(tasks.userId, userId)).orderBy(desc(tasks.createdAt));
  }

  async createTask(data: InsertTask): Promise<Task> {
    const [task] = await this.database.insert(tasks).values(data).returning();
    return task;
  }

  async updateTask(id: string, userId: string, data: Partial<InsertTask>): Promise<Task | null> {
    const [task] = await this.database.update(tasks)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
      .returning();
    return task ?? null;
  }

  async deleteTask(id: string, userId: string): Promise<boolean> {
    const result = await this.database.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId))).returning();
    return result.length > 0;
  }

  async getNotes(userId: string): Promise<Note[]> {
    return this.database.select().from(notes).where(eq(notes.userId, userId)).orderBy(desc(notes.updatedAt));
  }

  async createNote(data: InsertNote): Promise<Note> {
    const [note] = await this.database.insert(notes).values(data).returning();
    return note;
  }

  async updateNote(id: string, userId: string, data: Partial<InsertNote>): Promise<Note | null> {
    const [note] = await this.database.update(notes)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning();
    return note ?? null;
  }

  async deleteNote(id: string, userId: string): Promise<boolean> {
    const result = await this.database.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, userId))).returning();
    return result.length > 0;
  }

  async getLinks(userId: string): Promise<Link[]> {
    return this.database.select().from(links).where(eq(links.userId, userId)).orderBy(desc(links.createdAt));
  }

  async createLink(data: InsertLink): Promise<Link> {
    const [link] = await this.database.insert(links).values(data).returning();
    return link;
  }

  async deleteLink(id: string, userId: string): Promise<boolean> {
    const result = await this.database.delete(links).where(and(eq(links.id, id), eq(links.userId, userId))).returning();
    return result.length > 0;
  }
}

export class MemoryStorage implements IStorage {
  private projectRows: Project[] = [];
  private taskRows: Task[] = [];
  private noteRows: Note[] = [];
  private linkRows: Link[] = [];

  private getId(): string {
    return crypto.randomUUID();
  }

  private getNow(): Date {
    return new Date();
  }

  async getProjects(userId: string): Promise<Project[]> {
    return this.projectRows
      .filter((row) => row.userId === userId)
      .sort((left, right) => new Date(right.createdAt as unknown as string).getTime() - new Date(left.createdAt as unknown as string).getTime());
  }

  async createProject(data: InsertProject): Promise<Project> {
    const now = this.getNow();
    const project = {
      ...data,
      id: this.getId(),
      createdAt: now,
      updatedAt: now,
    } as Project;
    this.projectRows.unshift(project);
    return project;
  }

  async updateProject(id: string, userId: string, data: Partial<InsertProject>): Promise<Project | null> {
    const row = this.projectRows.find((item) => item.id === id && item.userId === userId);
    if (!row) return null;
    Object.assign(row, data, { updatedAt: this.getNow() });
    return row;
  }

  async deleteProject(id: string, userId: string): Promise<boolean> {
    const before = this.projectRows.length;
    this.projectRows = this.projectRows.filter((item) => !(item.id === id && item.userId === userId));
    return this.projectRows.length < before;
  }

  async getTasks(userId: string): Promise<Task[]> {
    return this.taskRows
      .filter((row) => row.userId === userId)
      .sort((left, right) => new Date(right.createdAt as unknown as string).getTime() - new Date(left.createdAt as unknown as string).getTime());
  }

  async createTask(data: InsertTask): Promise<Task> {
    const now = this.getNow();
    const task = {
      ...data,
      id: this.getId(),
      createdAt: now,
      updatedAt: now,
    } as Task;
    this.taskRows.unshift(task);
    return task;
  }

  async updateTask(id: string, userId: string, data: Partial<InsertTask>): Promise<Task | null> {
    const row = this.taskRows.find((item) => item.id === id && item.userId === userId);
    if (!row) return null;
    Object.assign(row, data, { updatedAt: this.getNow() });
    return row;
  }

  async deleteTask(id: string, userId: string): Promise<boolean> {
    const before = this.taskRows.length;
    this.taskRows = this.taskRows.filter((item) => !(item.id === id && item.userId === userId));
    return this.taskRows.length < before;
  }

  async getNotes(userId: string): Promise<Note[]> {
    return this.noteRows
      .filter((row) => row.userId === userId)
      .sort((left, right) => new Date(right.updatedAt as unknown as string).getTime() - new Date(left.updatedAt as unknown as string).getTime());
  }

  async createNote(data: InsertNote): Promise<Note> {
    const now = this.getNow();
    const note = {
      ...data,
      id: this.getId(),
      createdAt: now,
      updatedAt: now,
    } as Note;
    this.noteRows.unshift(note);
    return note;
  }

  async updateNote(id: string, userId: string, data: Partial<InsertNote>): Promise<Note | null> {
    const row = this.noteRows.find((item) => item.id === id && item.userId === userId);
    if (!row) return null;
    Object.assign(row, data, { updatedAt: this.getNow() });
    return row;
  }

  async deleteNote(id: string, userId: string): Promise<boolean> {
    const before = this.noteRows.length;
    this.noteRows = this.noteRows.filter((item) => !(item.id === id && item.userId === userId));
    return this.noteRows.length < before;
  }

  async getLinks(userId: string): Promise<Link[]> {
    return this.linkRows
      .filter((row) => row.userId === userId)
      .sort((left, right) => new Date(right.createdAt as unknown as string).getTime() - new Date(left.createdAt as unknown as string).getTime());
  }

  async createLink(data: InsertLink): Promise<Link> {
    const now = this.getNow();
    const link = {
      ...data,
      id: this.getId(),
      createdAt: now,
      updatedAt: now,
    } as Link;
    this.linkRows.unshift(link);
    return link;
  }

  async deleteLink(id: string, userId: string): Promise<boolean> {
    const before = this.linkRows.length;
    this.linkRows = this.linkRows.filter((item) => !(item.id === id && item.userId === userId));
    return this.linkRows.length < before;
  }
}

class ResilientStorage implements IStorage {
  private warned = false;

  constructor(
    private readonly primary: IStorage,
    private readonly fallback: IStorage,
  ) {}

  private async run<T>(action: string, operation: (storage: IStorage) => Promise<T>): Promise<T> {
    try {
      return await operation(this.primary);
    } catch (error) {
      if (!this.warned) {
        this.warned = true;
        console.warn(`Database operation failed (${action}). Falling back to in-memory storage.`, error);
      }
      return operation(this.fallback);
    }
  }

  getProjects(userId: string): Promise<Project[]> {
    return this.run("getProjects", (storage) => storage.getProjects(userId));
  }

  createProject(data: InsertProject): Promise<Project> {
    return this.run("createProject", (storage) => storage.createProject(data));
  }

  updateProject(id: string, userId: string, data: Partial<InsertProject>): Promise<Project | null> {
    return this.run("updateProject", (storage) => storage.updateProject(id, userId, data));
  }

  deleteProject(id: string, userId: string): Promise<boolean> {
    return this.run("deleteProject", (storage) => storage.deleteProject(id, userId));
  }

  getTasks(userId: string): Promise<Task[]> {
    return this.run("getTasks", (storage) => storage.getTasks(userId));
  }

  createTask(data: InsertTask): Promise<Task> {
    return this.run("createTask", (storage) => storage.createTask(data));
  }

  updateTask(id: string, userId: string, data: Partial<InsertTask>): Promise<Task | null> {
    return this.run("updateTask", (storage) => storage.updateTask(id, userId, data));
  }

  deleteTask(id: string, userId: string): Promise<boolean> {
    return this.run("deleteTask", (storage) => storage.deleteTask(id, userId));
  }

  getNotes(userId: string): Promise<Note[]> {
    return this.run("getNotes", (storage) => storage.getNotes(userId));
  }

  createNote(data: InsertNote): Promise<Note> {
    return this.run("createNote", (storage) => storage.createNote(data));
  }

  updateNote(id: string, userId: string, data: Partial<InsertNote>): Promise<Note | null> {
    return this.run("updateNote", (storage) => storage.updateNote(id, userId, data));
  }

  deleteNote(id: string, userId: string): Promise<boolean> {
    return this.run("deleteNote", (storage) => storage.deleteNote(id, userId));
  }

  getLinks(userId: string): Promise<Link[]> {
    return this.run("getLinks", (storage) => storage.getLinks(userId));
  }

  createLink(data: InsertLink): Promise<Link> {
    return this.run("createLink", (storage) => storage.createLink(data));
  }

  deleteLink(id: string, userId: string): Promise<boolean> {
    return this.run("deleteLink", (storage) => storage.deleteLink(id, userId));
  }
}

if (!db) {
  console.warn("DATABASE_URL not found. Using in-memory storage for API data.");
}

const memoryStorage = new MemoryStorage();
export const storage: IStorage = db
  ? new ResilientStorage(new DatabaseStorage(db), memoryStorage)
  : memoryStorage;

export const storageMode: StorageMode = db ? "database" : "memory-fallback";
