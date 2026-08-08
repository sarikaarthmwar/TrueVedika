import { db } from "./db";
import { users, initiatives, initiativeMembers, posts, comments } from "@shared/schema";
import type { InsertUser, InsertInitiative } from "@shared/schema";
import { eq, and, inArray, desc, asc } from "drizzle-orm";

async function attachComments(rows: any[]) {
  return Promise.all(
    rows.map(async (p) => ({
      ...p,
      comments: await storage.listCommentsByPost(p.id),
    })),
  );
}

async function attachAuthors(rows: any[]) {
  const authorIds = Array.from(new Set(rows.map((r) => r.authorId)));
  const authorRows = authorIds.length
    ? await db.select().from(users).where(inArray(users.id, authorIds))
    : [];
  const authorMap = new Map(authorRows.map((u) => [u.id, u]));
  const withAuthors = rows.map((p) => ({
    ...p,
    authorName: authorMap.get(p.authorId)?.name || "Unknown",
    authorAvatar: authorMap.get(p.authorId)?.avatar || "",
    likes: 0,
  }));
  return attachComments(withAuthors);
}

export const storage = {
  async getUser(id: string) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  },
  async getUserByEmail(email: string) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  },
  async createUser(data: InsertUser) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  },
  async listUsers() {
    return db.select().from(users).orderBy(desc(users.createdAt));
  },
  async deleteUser(id: string) {
    await db.delete(users).where(eq(users.id, id));
  },
  async listInitiatives() {
    const rows = await db.select().from(initiatives).orderBy(desc(initiatives.createdAt));
    const counts = await db.select().from(initiativeMembers);
    const countMap = new Map<string, number>();
    for (const row of counts) {
      countMap.set(row.initiativeId, (countMap.get(row.initiativeId) || 0) + 1);
    }
    return rows.map((r) => ({ ...r, participantsCount: countMap.get(r.id) || 0 }));
  },
  async getInitiative(id: string) {
    const [initiative] = await db.select().from(initiatives).where(eq(initiatives.id, id));
    if (!initiative) return undefined;
    const members = await db.select().from(initiativeMembers).where(eq(initiativeMembers.initiativeId, id));
    return { ...initiative, participantsCount: members.length };
  },
  async createInitiative(data: InsertInitiative & { creatorId: string }) {
    const [initiative] = await db.insert(initiatives).values(data).returning();
    await db.insert(initiativeMembers).values({ userId: data.creatorId, initiativeId: initiative.id });
    return initiative;
  },
  async deleteInitiative(id: string) {
    await db.delete(initiatives).where(eq(initiatives.id, id));
  },
  async joinInitiative(userId: string, initiativeId: string) {
    await db.insert(initiativeMembers).values({ userId, initiativeId }).onConflictDoNothing();
  },
  async leaveInitiative(userId: string, initiativeId: string) {
    await db
      .delete(initiativeMembers)
      .where(and(eq(initiativeMembers.userId, userId), eq(initiativeMembers.initiativeId, initiativeId)));
  },
  async getJoinedInitiativeIds(userId: string) {
    const rows = await db.select().from(initiativeMembers).where(eq(initiativeMembers.userId, userId));
    return rows.map((r) => r.initiativeId);
  },
  async listPostsByInitiative(initiativeId: string) {
    const rows = await db.select().from(posts).where(eq(posts.initiativeId, initiativeId)).orderBy(desc(posts.createdAt));
    return attachAuthors(rows);
  },
  async listFeedPosts(initiativeIds: string[]) {
    if (initiativeIds.length === 0) return [];
    const rows = await db.select().from(posts).where(inArray(posts.initiativeId, initiativeIds)).orderBy(desc(posts.createdAt));
    return attachAuthors(rows);
  },
  async createPost(data: { initiativeId: string; authorId: string; content: string; image?: string }) {
    const [post] = await db.insert(posts).values(data).returning();
    return post;
  },
  async listCommentsByPost(postId: string) {
    const rows = await db.select().from(comments).where(eq(comments.postId, postId)).orderBy(asc(comments.createdAt));
    const authorIds = Array.from(new Set(rows.map((r) => r.authorId)));
    const authorRows = authorIds.length ? await db.select().from(users).where(inArray(users.id, authorIds)) : [];
    const authorMap = new Map(authorRows.map((u) => [u.id, u]));
    return rows.map((c) => ({
      ...c,
      authorName: authorMap.get(c.authorId)?.name || "Unknown",
      authorAvatar: authorMap.get(c.authorId)?.avatar || "",
    }));
  },
  async createComment(data: { postId: string; authorId: string; content: string }) {
    const [comment] = await db.insert(comments).values(data).returning();
    return comment;
  },
};
