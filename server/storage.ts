import { db } from "./db";
import { projects, tasks, notes, links, emails, calendarEvents, files, customTags } from "../shared/schema";
import { eq, and, desc } from "drizzle-orm";
import type {
  Project,
  InsertProject,
  Task,
  InsertTask,
  Note,
  InsertNote,
  Link,
  InsertLink,
  Email,
  InsertEmail,
  CalendarEvent,
  InsertCalendarEvent,
  FileRecord,
  InsertFileRecord,
  CustomTag,
  InsertCustomTag,
} from "../shared/schema";

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
  updateLink(id: string, userId: string, data: Partial<InsertLink>): Promise<Link | null>;
  deleteLink(id: string, userId: string): Promise<boolean>;

  getEmails(userId: string): Promise<Email[]>;
  createEmail(data: InsertEmail): Promise<Email>;
  updateEmail(id: string, userId: string, data: Partial<InsertEmail>): Promise<Email | null>;
  deleteEmail(id: string, userId: string): Promise<boolean>;

  getCalendarEvents(userId: string): Promise<CalendarEvent[]>;
  createCalendarEvent(data: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: string, userId: string, data: Partial<InsertCalendarEvent>): Promise<CalendarEvent | null>;
  deleteCalendarEvent(id: string, userId: string): Promise<boolean>;

  getFiles(userId: string): Promise<FileRecord[]>;
  createFile(data: InsertFileRecord): Promise<FileRecord>;
  updateFile(id: string, userId: string, data: Partial<InsertFileRecord>): Promise<FileRecord | null>;
  deleteFile(id: string, userId: string): Promise<boolean>;

  getCustomTags(userId: string): Promise<CustomTag[]>;
  createCustomTag(data: InsertCustomTag): Promise<CustomTag>;
  deleteCustomTag(id: string, userId: string): Promise<boolean>;
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

  async updateLink(id: string, userId: string, data: Partial<InsertLink>): Promise<Link | null> {
    const [link] = await this.database
      .update(links)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(links.id, id), eq(links.userId, userId)))
      .returning();
    return link ?? null;
  }

  async deleteLink(id: string, userId: string): Promise<boolean> {
    const result = await this.database.delete(links).where(and(eq(links.id, id), eq(links.userId, userId))).returning();
    return result.length > 0;
  }

  async getEmails(userId: string): Promise<Email[]> {
    return this.database.select().from(emails).where(eq(emails.userId, userId)).orderBy(desc(emails.receivedAt));
  }

  async createEmail(data: InsertEmail): Promise<Email> {
    const [email] = await this.database.insert(emails).values(data).returning();
    return email;
  }

  async updateEmail(id: string, userId: string, data: Partial<InsertEmail>): Promise<Email | null> {
    const [email] = await this.database
      .update(emails)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(emails.id, id), eq(emails.userId, userId)))
      .returning();
    return email ?? null;
  }

  async deleteEmail(id: string, userId: string): Promise<boolean> {
    const result = await this.database.delete(emails).where(and(eq(emails.id, id), eq(emails.userId, userId))).returning();
    return result.length > 0;
  }

  async getCalendarEvents(userId: string): Promise<CalendarEvent[]> {
    return this.database.select().from(calendarEvents).where(eq(calendarEvents.userId, userId)).orderBy(desc(calendarEvents.startAt));
  }

  async createCalendarEvent(data: InsertCalendarEvent): Promise<CalendarEvent> {
    const [event] = await this.database.insert(calendarEvents).values(data).returning();
    return event;
  }

  async updateCalendarEvent(id: string, userId: string, data: Partial<InsertCalendarEvent>): Promise<CalendarEvent | null> {
    const [event] = await this.database
      .update(calendarEvents)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)))
      .returning();
    return event ?? null;
  }

  async deleteCalendarEvent(id: string, userId: string): Promise<boolean> {
    const result = await this.database
      .delete(calendarEvents)
      .where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async getFiles(userId: string): Promise<FileRecord[]> {
    return this.database.select().from(files).where(eq(files.userId, userId)).orderBy(desc(files.modifiedAt));
  }

  async createFile(data: InsertFileRecord): Promise<FileRecord> {
    const [file] = await this.database.insert(files).values(data).returning();
    return file;
  }

  async updateFile(id: string, userId: string, data: Partial<InsertFileRecord>): Promise<FileRecord | null> {
    const [file] = await this.database
      .update(files)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(files.id, id), eq(files.userId, userId)))
      .returning();
    return file ?? null;
  }

  async deleteFile(id: string, userId: string): Promise<boolean> {
    const result = await this.database.delete(files).where(and(eq(files.id, id), eq(files.userId, userId))).returning();
    return result.length > 0;
  }

  async getCustomTags(userId: string): Promise<CustomTag[]> {
    return this.database.select().from(customTags).where(eq(customTags.userId, userId)).orderBy(desc(customTags.createdAt));
  }

  async createCustomTag(data: InsertCustomTag): Promise<CustomTag> {
    const [tag] = await this.database.insert(customTags).values(data).returning();
    return tag;
  }

  async deleteCustomTag(id: string, userId: string): Promise<boolean> {
    const result = await this.database
      .delete(customTags)
      .where(and(eq(customTags.id, id), eq(customTags.userId, userId)))
      .returning();
    return result.length > 0;
  }
}

export class MemoryStorage implements IStorage {
  private projectRows: Project[] = [];
  private taskRows: Task[] = [];
  private noteRows: Note[] = [];
  private linkRows: Link[] = [];
  private emailRows: Email[] = [];
  private calendarRows: CalendarEvent[] = [];
  private fileRows: FileRecord[] = [];
  private customTagRows: CustomTag[] = [];

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

  async updateLink(id: string, userId: string, data: Partial<InsertLink>): Promise<Link | null> {
    const row = this.linkRows.find((item) => item.id === id && item.userId === userId);
    if (!row) return null;
    Object.assign(row, data, { updatedAt: this.getNow() });
    return row;
  }

  async deleteLink(id: string, userId: string): Promise<boolean> {
    const before = this.linkRows.length;
    this.linkRows = this.linkRows.filter((item) => !(item.id === id && item.userId === userId));
    return this.linkRows.length < before;
  }

  async getEmails(userId: string): Promise<Email[]> {
    return this.emailRows
      .filter((row) => row.userId === userId)
      .sort((left, right) => new Date(right.receivedAt as unknown as string).getTime() - new Date(left.receivedAt as unknown as string).getTime());
  }

  async createEmail(data: InsertEmail): Promise<Email> {
    const now = this.getNow();
    const email = {
      ...data,
      id: this.getId(),
      createdAt: now,
      updatedAt: now,
    } as Email;
    this.emailRows.unshift(email);
    return email;
  }

  async updateEmail(id: string, userId: string, data: Partial<InsertEmail>): Promise<Email | null> {
    const row = this.emailRows.find((item) => item.id === id && item.userId === userId);
    if (!row) return null;
    Object.assign(row, data, { updatedAt: this.getNow() });
    return row;
  }

  async deleteEmail(id: string, userId: string): Promise<boolean> {
    const before = this.emailRows.length;
    this.emailRows = this.emailRows.filter((item) => !(item.id === id && item.userId === userId));
    return this.emailRows.length < before;
  }

  async getCalendarEvents(userId: string): Promise<CalendarEvent[]> {
    return this.calendarRows
      .filter((row) => row.userId === userId)
      .sort((left, right) => new Date(right.startAt as unknown as string).getTime() - new Date(left.startAt as unknown as string).getTime());
  }

  async createCalendarEvent(data: InsertCalendarEvent): Promise<CalendarEvent> {
    const now = this.getNow();
    const calendarEvent = {
      ...data,
      id: this.getId(),
      createdAt: now,
      updatedAt: now,
    } as CalendarEvent;
    this.calendarRows.unshift(calendarEvent);
    return calendarEvent;
  }

  async updateCalendarEvent(id: string, userId: string, data: Partial<InsertCalendarEvent>): Promise<CalendarEvent | null> {
    const row = this.calendarRows.find((item) => item.id === id && item.userId === userId);
    if (!row) return null;
    Object.assign(row, data, { updatedAt: this.getNow() });
    return row;
  }

  async deleteCalendarEvent(id: string, userId: string): Promise<boolean> {
    const before = this.calendarRows.length;
    this.calendarRows = this.calendarRows.filter((item) => !(item.id === id && item.userId === userId));
    return this.calendarRows.length < before;
  }

  async getFiles(userId: string): Promise<FileRecord[]> {
    return this.fileRows
      .filter((row) => row.userId === userId)
      .sort((left, right) => new Date(right.modifiedAt as unknown as string).getTime() - new Date(left.modifiedAt as unknown as string).getTime());
  }

  async createFile(data: InsertFileRecord): Promise<FileRecord> {
    const now = this.getNow();
    const file = {
      ...data,
      id: this.getId(),
      createdAt: now,
      updatedAt: now,
    } as FileRecord;
    this.fileRows.unshift(file);
    return file;
  }

  async updateFile(id: string, userId: string, data: Partial<InsertFileRecord>): Promise<FileRecord | null> {
    const row = this.fileRows.find((item) => item.id === id && item.userId === userId);
    if (!row) return null;
    Object.assign(row, data, { updatedAt: this.getNow() });
    return row;
  }

  async deleteFile(id: string, userId: string): Promise<boolean> {
    const before = this.fileRows.length;
    this.fileRows = this.fileRows.filter((item) => !(item.id === id && item.userId === userId));
    return this.fileRows.length < before;
  }

  async getCustomTags(userId: string): Promise<CustomTag[]> {
    return this.customTagRows
      .filter((row) => row.userId === userId)
      .sort((left, right) => new Date(right.createdAt as unknown as string).getTime() - new Date(left.createdAt as unknown as string).getTime());
  }

  async createCustomTag(data: InsertCustomTag): Promise<CustomTag> {
    const now = this.getNow();
    const customTag = {
      ...data,
      id: this.getId(),
      createdAt: now,
      updatedAt: now,
    } as CustomTag;
    this.customTagRows.unshift(customTag);
    return customTag;
  }

  async deleteCustomTag(id: string, userId: string): Promise<boolean> {
    const before = this.customTagRows.length;
    this.customTagRows = this.customTagRows.filter((item) => !(item.id === id && item.userId === userId));
    return this.customTagRows.length < before;
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

  updateLink(id: string, userId: string, data: Partial<InsertLink>): Promise<Link | null> {
    return this.run("updateLink", (storage) => storage.updateLink(id, userId, data));
  }

  deleteLink(id: string, userId: string): Promise<boolean> {
    return this.run("deleteLink", (storage) => storage.deleteLink(id, userId));
  }

  getEmails(userId: string): Promise<Email[]> {
    return this.run("getEmails", (storage) => storage.getEmails(userId));
  }

  createEmail(data: InsertEmail): Promise<Email> {
    return this.run("createEmail", (storage) => storage.createEmail(data));
  }

  updateEmail(id: string, userId: string, data: Partial<InsertEmail>): Promise<Email | null> {
    return this.run("updateEmail", (storage) => storage.updateEmail(id, userId, data));
  }

  deleteEmail(id: string, userId: string): Promise<boolean> {
    return this.run("deleteEmail", (storage) => storage.deleteEmail(id, userId));
  }

  getCalendarEvents(userId: string): Promise<CalendarEvent[]> {
    return this.run("getCalendarEvents", (storage) => storage.getCalendarEvents(userId));
  }

  createCalendarEvent(data: InsertCalendarEvent): Promise<CalendarEvent> {
    return this.run("createCalendarEvent", (storage) => storage.createCalendarEvent(data));
  }

  updateCalendarEvent(id: string, userId: string, data: Partial<InsertCalendarEvent>): Promise<CalendarEvent | null> {
    return this.run("updateCalendarEvent", (storage) => storage.updateCalendarEvent(id, userId, data));
  }

  deleteCalendarEvent(id: string, userId: string): Promise<boolean> {
    return this.run("deleteCalendarEvent", (storage) => storage.deleteCalendarEvent(id, userId));
  }

  getFiles(userId: string): Promise<FileRecord[]> {
    return this.run("getFiles", (storage) => storage.getFiles(userId));
  }

  createFile(data: InsertFileRecord): Promise<FileRecord> {
    return this.run("createFile", (storage) => storage.createFile(data));
  }

  updateFile(id: string, userId: string, data: Partial<InsertFileRecord>): Promise<FileRecord | null> {
    return this.run("updateFile", (storage) => storage.updateFile(id, userId, data));
  }

  deleteFile(id: string, userId: string): Promise<boolean> {
    return this.run("deleteFile", (storage) => storage.deleteFile(id, userId));
  }

  getCustomTags(userId: string): Promise<CustomTag[]> {
    return this.run("getCustomTags", (storage) => storage.getCustomTags(userId));
  }

  createCustomTag(data: InsertCustomTag): Promise<CustomTag> {
    return this.run("createCustomTag", (storage) => storage.createCustomTag(data));
  }

  deleteCustomTag(id: string, userId: string): Promise<boolean> {
    return this.run("deleteCustomTag", (storage) => storage.deleteCustomTag(id, userId));
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
