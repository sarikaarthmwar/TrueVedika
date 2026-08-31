import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, primaryKey, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`), name: text("name").notNull(), email: text("email").notNull().unique(), password: text("password").notNull(), avatar: text("avatar").notNull().default(""), role: text("role").notNull().default("user"), createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const initiatives = pgTable("initiatives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`), title: text("title").notNull(), description: text("description").notNull(), category: text("category").notNull(), image: text("image").notNull().default(""), location: text("location"), nextEvent: text("next_event"), creatorId: varchar("creator_id").references(() => users.id), createdAt: timestamp("created_at").notNull().defaultNow(),
});
export const initiativeMembers = pgTable("initiative_members", { userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), initiativeId: varchar("initiative_id").notNull().references(() => initiatives.id, { onDelete: "cascade" }), joinedAt: timestamp("joined_at").notNull().defaultNow() }, (table) => ({ pk: primaryKey({ columns: [table.userId, table.initiativeId] }) }));
export const posts = pgTable("posts", { id: varchar("id").primaryKey().default(sql`gen_random_uuid()`), initiativeId: varchar("initiative_id").notNull().references(() => initiatives.id, { onDelete: "cascade" }), authorId: varchar("author_id").notNull().references(() => users.id), content: text("content").notNull(), image: text("image"), createdAt: timestamp("created_at").notNull().defaultNow() });
export const comments = pgTable("comments", { id: varchar("id").primaryKey().default(sql`gen_random_uuid()`), postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }), authorId: varchar("author_id").notNull().references(() => users.id), content: text("content").notNull(), createdAt: timestamp("created_at").notNull().defaultNow() });
export const shopProducts = pgTable("shop_products", { id: varchar("id").primaryKey().default(sql`gen_random_uuid()`), name: text("name").notNull(), image: text("image").notNull(), category: text("category").notNull(), affiliateUrl: text("affiliate_url").notNull(), clicks: integer("clicks").notNull().default(0), createdAt: timestamp("created_at").notNull().defaultNow() });

export const insertUserSchema = createInsertSchema(users).pick({ name: true, email: true, password: true, role: true, avatar: true });
export const insertInitiativeSchema = createInsertSchema(initiatives).pick({ title: true, description: true, category: true, image: true, location: true, nextEvent: true });
export type InsertUser = z.infer<typeof insertUserSchema>; export type User = typeof users.$inferSelect; export type Initiative = typeof initiatives.$inferSelect; export type InsertInitiative = z.infer<typeof insertInitiativeSchema>; export type Post = typeof posts.$inferSelect; export type Comment = typeof comments.$inferSelect; export type ShopProduct = typeof shopProducts.$inferSelect;
