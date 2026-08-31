import { db } from "./db.js";
import { users, initiatives, initiativeMembers, posts, comments, shopProducts } from "../shared/schema.js";
import type { InsertUser, InsertInitiative } from "../shared/schema.js";
import { eq, and, inArray, desc, asc, sql } from "drizzle-orm";
async function attachComments(rows: any[]) { return Promise.all(rows.map(async (p) => ({ ...p, comments: await storage.listCommentsByPost(p.id) }))); }
async function attachAuthors(rows: any[]) { const ids = Array.from(new Set(rows.map((r) => r.authorId))); const usersRows = ids.length ? await db.select().from(users).where(inArray(users.id, ids)) : []; const map = new Map(usersRows.map((u) => [u.id, u])); return attachComments(rows.map((p) => ({ ...p, authorName: map.get(p.authorId)?.name || "Unknown", authorAvatar: map.get(p.authorId)?.avatar || "", likes: 0 }))); }
export const storage = {
  async getUser(id: string) { const [user] = await db.select().from(users).where(eq(users.id, id)); return user; },
  async getUserByEmail(email: string) { const [user] = await db.select().from(users).where(eq(users.email, email)); return user; },
  async createUser(data: InsertUser) { const [user] = await db.insert(users).values(data).returning(); return user; },
  async listUsers() { return db.select().from(users).orderBy(desc(users.createdAt)); },
  async deleteUser(id: string) { await db.delete(users).where(eq(users.id, id)); },
  async listInitiatives() { const rows = await db.select().from(initiatives).orderBy(desc(initiatives.createdAt)); const counts = await db.select().from(initiativeMembers); const map = new Map<string, number>(); for (const r of counts) map.set(r.initiativeId, (map.get(r.initiativeId) || 0) + 1); return rows.map((r) => ({ ...r, participantsCount: map.get(r.id) || 0 })); },
  async getInitiative(id: string) { const [initiative] = await db.select().from(initiatives).where(eq(initiatives.id, id)); if (!initiative) return undefined; const members = await db.select().from(initiativeMembers).where(eq(initiativeMembers.initiativeId, id)); return { ...initiative, participantsCount: members.length }; },
  async createInitiative(data: InsertInitiative & { creatorId: string }) { const [initiative] = await db.insert(initiatives).values(data).returning(); await db.insert(initiativeMembers).values({ userId: data.creatorId, initiativeId: initiative.id }); return initiative; },
  async deleteInitiative(id: string) { await db.delete(initiatives).where(eq(initiatives.id, id)); },
  async joinInitiative(userId: string, initiativeId: string) { await db.insert(initiativeMembers).values({ userId, initiativeId }).onConflictDoNothing(); },
  async leaveInitiative(userId: string, initiativeId: string) { await db.delete(initiativeMembers).where(and(eq(initiativeMembers.userId, userId), eq(initiativeMembers.initiativeId, initiativeId))); },
  async getJoinedInitiativeIds(userId: string) { const rows = await db.select().from(initiativeMembers).where(eq(initiativeMembers.userId, userId)); return rows.map((r) => r.initiativeId); },
  async listPostsByInitiative(initiativeId: string) { return attachAuthors(await db.select().from(posts).where(eq(posts.initiativeId, initiativeId)).orderBy(desc(posts.createdAt))); },
  async listFeedPosts(initiativeIds: string[]) { if (!initiativeIds.length) return []; return attachAuthors(await db.select().from(posts).where(inArray(posts.initiativeId, initiativeIds)).orderBy(desc(posts.createdAt))); },
  async createPost(data: { initiativeId: string; authorId: string; content: string; image?: string }) { const [post] = await db.insert(posts).values(data).returning(); return post; },
  async listCommentsByPost(postId: string) { const rows = await db.select().from(comments).where(eq(comments.postId, postId)).orderBy(asc(comments.createdAt)); const ids = Array.from(new Set(rows.map((r) => r.authorId))); const authors = ids.length ? await db.select().from(users).where(inArray(users.id, ids)) : []; const map = new Map(authors.map((u) => [u.id, u])); return rows.map((c) => ({ ...c, authorName: map.get(c.authorId)?.name || "Unknown", authorAvatar: map.get(c.authorId)?.avatar || "" })); },
  async createComment(data: { postId: string; authorId: string; content: string }) { const [comment] = await db.insert(comments).values(data).returning(); return comment; },
  async listShopProducts() { return db.select().from(shopProducts).orderBy(desc(shopProducts.createdAt)); },
  async getShopProduct(id: string) { const [p] = await db.select().from(shopProducts).where(eq(shopProducts.id, id)); return p; },
  async createShopProduct(data: { name: string; image: string; category: string; affiliateUrl: string }) { const [p] = await db.insert(shopProducts).values(data).returning(); return p; },
  async deleteShopProduct(id: string) { await db.delete(shopProducts).where(eq(shopProducts.id, id)); },
  async incrementShopClick(id: string) { const [p] = await db.update(shopProducts).set({ clicks: sql`${shopProducts.clicks} + 1` }).where(eq(shopProducts.id, id)).returning(); return p; },
  async shopSummary() { const rows = await db.select().from(shopProducts).orderBy(desc(shopProducts.clicks)); return { products: rows.length, clicks: rows.reduce((s, p) => s + p.clicks, 0), topProduct: rows[0]?.name || '' }; },
};
