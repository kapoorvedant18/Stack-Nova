import { pgTable, text, timestamp, date, uuid, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#10b981"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull().default("Personal"),
  tags: text("tags").notNull().default(""),
  priority: text("priority").notNull().default("medium"),
  source: text("source").notNull().default("Manual"),
  dueDate: date("due_date"),
  status: text("status").notNull().default("todo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").default(""),
  category: text("category").notNull().default("Personal"),
  tags: text("tags").notNull().default(""),
  source: text("source").notNull().default("Notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const links = pgTable("links", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  title: text("title").notNull(),
  description: text("description").default(""),
  category: text("category").notNull().default("Personal"),
  tags: text("tags").notNull().default(""),
  source: text("source").notNull().default("Manual"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const emails = pgTable("emails", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  externalId: text("external_id").notNull(),
  provider: text("provider").notNull(),
  sender: text("sender").notNull(),
  subject: text("subject").notNull(),
  bodySummary: text("body_summary").default(""),
  attachments: text("attachments").notNull().default(""),
  isImportant: boolean("is_important").notNull().default(false),
  category: text("category").notNull().default("Work"),
  tags: text("tags").notNull().default(""),
  source: text("source").notNull().default("Email"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const calendarEvents = pgTable("calendar_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  externalId: text("external_id").notNull(),
  provider: text("provider").notNull(),
  title: text("title").notNull(),
  description: text("description").default(""),
  location: text("location").default(""),
  isAllDay: boolean("is_all_day").notNull().default(false),
  startAt: timestamp("start_at", { withTimezone: true }).notNull(),
  endAt: timestamp("end_at", { withTimezone: true }).notNull(),
  category: text("category").notNull().default("Meetings"),
  tags: text("tags").notNull().default(""),
  source: text("source").notNull().default("Calendar"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  externalId: text("external_id").notNull(),
  provider: text("provider").notNull(),
  name: text("name").notNull(),
  mimeType: text("mime_type").default(""),
  webUrl: text("web_url").default(""),
  category: text("category").notNull().default("Projects"),
  tags: text("tags").notNull().default(""),
  source: text("source").notNull().default("Files"),
  modifiedAt: timestamp("modified_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customTags = pgTable("custom_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  category: text("category").notNull().default("Personal"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTaskSchema = createInsertSchema(tasks).omit({ id: true, createdAt: true, updatedAt: true });
export const insertNoteSchema = createInsertSchema(notes).omit({ id: true, createdAt: true, updatedAt: true });
export const insertLinkSchema = createInsertSchema(links).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEmailSchema = createInsertSchema(emails).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFileSchema = createInsertSchema(files).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCustomTagSchema = createInsertSchema(customTags).omit({ id: true, createdAt: true, updatedAt: true });

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type InsertNote = typeof notes.$inferInsert;
export type Link = typeof links.$inferSelect;
export type InsertLink = typeof links.$inferInsert;
export type Email = typeof emails.$inferSelect;
export type InsertEmail = typeof emails.$inferInsert;
export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;
export type FileRecord = typeof files.$inferSelect;
export type InsertFileRecord = typeof files.$inferInsert;
export type CustomTag = typeof customTags.$inferSelect;
export type InsertCustomTag = typeof customTags.$inferInsert;