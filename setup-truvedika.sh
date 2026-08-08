#!/usr/bin/env bash
set -e

echo "==> Writing shared/schema.ts"
cat > shared/schema.ts << 'EOF'
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  avatar: text("avatar").notNull().default(""),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const initiatives = pgTable("initiatives", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  image: text("image").notNull().default(""),
  location: text("location"),
  nextEvent: text("next_event"),
  creatorId: varchar("creator_id").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const initiativeMembers = pgTable("initiative_members", {
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  initiativeId: varchar("initiative_id").notNull().references(() => initiatives.id, { onDelete: "cascade" }),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
}, (table) => ({
  pk: primaryKey({ columns: [table.userId, table.initiativeId] }),
}));

export const posts = pgTable("posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  initiativeId: varchar("initiative_id").notNull().references(() => initiatives.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  authorId: varchar("author_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
  password: true,
  role: true,
  avatar: true,
});

export const insertInitiativeSchema = createInsertSchema(initiatives).pick({
  title: true,
  description: true,
  category: true,
  image: true,
  location: true,
  nextEvent: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Initiative = typeof initiatives.$inferSelect;
export type InsertInitiative = z.infer<typeof insertInitiativeSchema>;
export type Post = typeof posts.$inferSelect;
export type Comment = typeof comments.$inferSelect;
EOF

echo "==> Writing server/db.ts"
cat > server/db.ts << 'EOF'
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("neon.tech") ? { rejectUnauthorized: false } : undefined,
  max: 5,
});

export const db = drizzle(pool, { schema });
EOF

echo "==> Writing server/storage.ts"
cat > server/storage.ts << 'EOF'
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
EOF

echo "==> Writing server/auth.ts"
cat > server/auth.ts << 'EOF'
import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import connectPgSimple from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { pool } from "./db";
import { storage } from "./storage";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  if (hashedBuf.length !== suppliedBuf.length) return false;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function sanitize(user: any) {
  const { password, ...rest } = user;
  return rest;
}

const PgSession = connectPgSimple(session);

export function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(
    session({
      store: new PgSession({ pool, tableName: "session", createTableIfMissing: true }),
      secret: process.env.SESSION_SECRET || "truvedika-dev-secret-change-me",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user) return done(null, false, { message: "Invalid email or password" });
        const valid = await comparePasswords(password, user.password);
        if (!valid) return done(null, false, { message: "Invalid email or password" });
        return done(null, user);
      } catch (err) {
        return done(err as Error);
      }
    }),
  );

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || null);
    } catch (err) {
      done(err as Error);
    }
  });

  app.post("/api/auth/register", async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body || {};
      if (!name || !email || !password) {
        return res.status(400).json({ message: "Name, email and password are required" });
      }
      if (String(password).length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }
      const hashed = await hashPassword(password);
      const user = await storage.createUser({
        name,
        email,
        password: hashed,
        role: "user",
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      });
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(sanitize(user));
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/auth/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Invalid email or password" });
      req.login(user, (err2) => {
        if (err2) return next(err2);
        res.json(sanitize(user));
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req: Request, res: Response, next: NextFunction) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ message: "Logged out" });
    });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const authUser = req.user as any;
    const joinedInitiatives = await storage.getJoinedInitiativeIds(authUser.id);
    res.json({ ...sanitize(authUser), joinedInitiatives });
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  if ((req.user as any).role !== "admin") {
    return res.status(403).json({ message: "Admin access required" });
  }
  next();
}
EOF

echo "==> Writing server/routes.ts"
cat > server/routes.ts << 'EOF'
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireAdmin, hashPassword, sanitize } from "./auth";
import { insertInitiativeSchema } from "@shared/schema";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  setupAuth(app);

  app.get("/api/initiatives", async (_req, res, next) => {
    try {
      res.json(await storage.listInitiatives());
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/initiatives/:id", async (req, res, next) => {
    try {
      const initiative = await storage.getInitiative(req.params.id);
      if (!initiative) return res.status(404).json({ message: "Not found" });
      res.json(initiative);
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/initiatives", requireAuth, async (req, res) => {
    try {
      const parsed = insertInitiativeSchema.parse(req.body);
      const initiative = await storage.createInitiative({ ...parsed, creatorId: (req.user as any).id });
      res.status(201).json(initiative);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Invalid initiative data" });
    }
  });

  app.delete("/api/initiatives/:id", requireAdmin, async (req, res, next) => {
    try {
      await storage.deleteInitiative(req.params.id);
      res.json({ message: "Deleted" });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/initiatives/:id/join", requireAuth, async (req, res, next) => {
    try {
      await storage.joinInitiative((req.user as any).id, req.params.id);
      res.json({ message: "Joined" });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/initiatives/:id/leave", requireAuth, async (req, res, next) => {
    try {
      await storage.leaveInitiative((req.user as any).id, req.params.id);
      res.json({ message: "Left" });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/initiatives/:id/posts", async (req, res, next) => {
    try {
      res.json(await storage.listPostsByInitiative(req.params.id));
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/initiatives/:id/posts", requireAuth, async (req, res, next) => {
    try {
      const { content, image } = req.body || {};
      if (!content || !String(content).trim()) return res.status(400).json({ message: "Content is required" });
      const post = await storage.createPost({
        initiativeId: req.params.id,
        authorId: (req.user as any).id,
        content,
        image,
      });
      res.status(201).json(post);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/feed", requireAuth, async (req, res, next) => {
    try {
      const ids = await storage.getJoinedInitiativeIds((req.user as any).id);
      res.json(await storage.listFeedPosts(ids));
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/posts/:id/comments", async (req, res, next) => {
    try {
      res.json(await storage.listCommentsByPost(req.params.id));
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/posts/:id/comments", requireAuth, async (req, res, next) => {
    try {
      const { content } = req.body || {};
      if (!content || !String(content).trim()) return res.status(400).json({ message: "Content is required" });
      const comment = await storage.createComment({ postId: req.params.id, authorId: (req.user as any).id, content });
      res.status(201).json(comment);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/users", requireAdmin, async (_req, res, next) => {
    try {
      res.json((await storage.listUsers()).map(sanitize));
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const { name, email, password, role } = req.body || {};
      if (!name || !email || !password) return res.status(400).json({ message: "Name, email, password required" });
      const existing = await storage.getUserByEmail(email);
      if (existing) return res.status(400).json({ message: "Email already in use" });
      const hashed = await hashPassword(password);
      const user = await storage.createUser({
        name,
        email,
        password: hashed,
        role: role === "admin" ? "admin" : "user",
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`,
      });
      res.status(201).json(sanitize(user));
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to create user" });
    }
  });

  app.delete("/api/users/:id", requireAdmin, async (req, res, next) => {
    try {
      await storage.deleteUser(req.params.id);
      res.json({ message: "Deleted" });
    } catch (err) {
      next(err);
    }
  });

  return httpServer;
}
EOF

echo "==> Writing client/src/lib/mockData.ts (types only, dummy arrays removed)"
cat > client/src/lib/mockData.ts << 'EOF'
export type User = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  joinedInitiatives: string[];
  role: 'user' | 'admin';
};

export type Initiative = {
  id: string;
  title: string;
  description: string;
  category: string;
  image: string;
  participantsCount: number;
  nextEvent?: string | null;
  location?: string | null;
};

export type Comment = {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: string;
};

export type Post = {
  id: string;
  initiativeId: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  image?: string | null;
  likes: number;
  comments: Comment[];
  createdAt: string;
};
EOF

echo "==> Writing client/src/lib/authContext.tsx"
cat > client/src/lib/authContext.tsx << 'EOF'
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from './mockData';
import { useLocation } from 'wouter';
import { apiRequest } from './queryClient';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  joinInitiative: (initiativeId: string) => Promise<void>;
  leaveInitiative: (initiativeId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        setUser(await res.json());
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    fetchUser().finally(() => setIsLoading(false));
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiRequest('POST', '/api/auth/login', { email, password });
      const loggedInUser = await res.json();
      await fetchUser();
      setLocation('/');
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string) => {
    setIsLoading(true);
    try {
      await apiRequest('POST', '/api/auth/register', { name, email, password });
      await fetchUser();
      setLocation('/');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    await apiRequest('POST', '/api/auth/logout');
    setUser(null);
    setLocation('/auth');
  };

  const joinInitiative = async (initiativeId: string) => {
    if (!user) return;
    await apiRequest('POST', `/api/initiatives/${initiativeId}/join`);
    await fetchUser();
  };

  const leaveInitiative = async (initiativeId: string) => {
    if (!user) return;
    await apiRequest('POST', `/api/initiatives/${initiativeId}/leave`);
    await fetchUser();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, joinInitiative, leaveInitiative }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
EOF

echo "==> Writing client/src/pages/Auth.tsx"
cat > client/src/pages/Auth.tsx << 'EOF'
import React from 'react';
import { useAuth } from '@/lib/authContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';

import logoImg from '@/assets/logo.png';

export default function AuthPage() {
  const { login, register, isLoading, user } = useAuth();
  const [, setLocation] = useLocation();
  const [mode, setMode] = React.useState<'signin' | 'signup'>('signin');
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (user) {
      setLocation('/');
    }
  }, [user, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'signin') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (err: any) {
      setError(err.message?.replace(/^\d+:\s*/, '') || 'Something went wrong');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[20%] -right-[10%] w-[60%] h-[60%] rounded-full bg-primary/5 blur-3xl opacity-60" />
        <div className="absolute top-[40%] -left-[10%] w-[40%] h-[40%] rounded-full bg-secondary/5 blur-3xl opacity-60" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8 flex flex-col items-center">
          <img src={logoImg} alt="TrueVedika" className="w-24 h-24 object-contain mb-4" />
          <h1 className="text-4xl font-serif font-bold text-primary mb-2">TrueVedika</h1>
          <p className="text-muted-foreground italic font-serif">A Trusted Community for Wellness & Connection</p>
        </div>

        <Card className="border-border shadow-soft bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {mode === 'signin' ? 'Welcome back' : 'Create your account'}
            </CardTitle>
            <CardDescription className="text-center">
              {mode === 'signin' ? 'Enter your email and password to sign in' : 'Join the TrueVedika community'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Jane Doe"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 bg-white/50"
                    data-testid="input-name"
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-white/50"
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="********"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-white/50"
                  data-testid="input-password"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                className="w-full h-11 text-base"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 text-center text-sm text-muted-foreground">
            <button
              type="button"
              className="text-primary hover:underline text-sm"
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError('');
              }}
              data-testid="button-toggle-mode"
            >
              {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
            <p className="px-8 text-center text-xs text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
}
EOF

echo "==> Writing client/src/components/ui/PostCard.tsx"
cat > client/src/components/ui/PostCard.tsx << 'EOF'
import React, { useState } from 'react';
import { Post, Comment } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, Share2, MoreHorizontal, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/authContext';
import { apiRequest } from '@/lib/queryClient';

interface PostCardProps {
  post: Post;
  initiativeName?: string;
}

export function PostCard({ post, initiativeName }: PostCardProps) {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>(post.comments || []);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    setIsSubmitting(true);
    try {
      const res = await apiRequest('POST', `/api/posts/${post.id}/comments`, { content: newComment });
      const created = await res.json();
      setComments([...comments, { ...created, authorName: user.name, authorAvatar: user.avatar }]);
      setNewComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="border-border shadow-sm overflow-hidden bg-white">
        <CardHeader className="p-4 flex flex-row items-start gap-3 space-y-0">
          <Avatar className="w-10 h-10 border border-border">
            <AvatarImage src={post.authorAvatar} />
            <AvatarFallback>{post.authorName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm text-foreground">{post.authorName}</p>
                {initiativeName && (
                  <p className="text-xs text-muted-foreground">in <span className="font-medium text-primary">{initiativeName}</span></p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{post.createdAt}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-4 pt-0 space-y-3">
          <p className="text-sm leading-relaxed whitespace-pre-line">{post.content}</p>
          {post.image && (
            <div className="rounded-xl overflow-hidden mt-3 border border-border">
              <img src={post.image} alt="Post content" className="w-full h-auto object-cover max-h-[400px]" />
            </div>
          )}
        </CardContent>

        <CardFooter className="p-4 border-t flex flex-col gap-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={`gap-2 ${isLiked ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={handleLike}
                data-testid={`button-like-${post.id}`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                <span className="text-xs">{likesCount}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowComments(!showComments)}
                data-testid={`button-comment-${post.id}`}
              >
                <MessageCircle className="w-4 h-4" />
                <span className="text-xs">{comments.length}</span>
              </Button>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>

          <AnimatePresence>
            {showComments && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="w-full space-y-4 overflow-hidden"
              >
                <div className="space-y-3 pt-2">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 text-sm">
                      <Avatar className="w-8 h-8 mt-1">
                        <AvatarImage src={comment.authorAvatar} />
                        <AvatarFallback>{comment.authorName[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 bg-muted/50 p-3 rounded-lg rounded-tl-none">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs">{comment.authorName}</span>
                          <span className="text-[10px] text-muted-foreground">{comment.createdAt}</span>
                        </div>
                        <p className="text-muted-foreground">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {user && (
                  <form onSubmit={handleCommentSubmit} className="flex gap-2 items-end pt-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.avatar} />
                      <AvatarFallback>{user.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 relative">
                      <Textarea
                        placeholder="Add a comment..."
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="min-h-[40px] pr-10 resize-none py-2"
                      />
                      <Button
                        type="submit"
                        size="icon"
                        className="absolute right-1 bottom-1 h-7 w-7"
                        disabled={!newComment.trim() || isSubmitting}
                      >
                        <Send className="w-3 h-3" />
                      </Button>
                    </div>
                  </form>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
EOF

echo "==> Writing client/src/components/ui/InitiativeCard.tsx"
cat > client/src/components/ui/InitiativeCard.tsx << 'EOF'
import React from 'react';
import { Initiative } from '@/lib/mockData';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, MapPin, Calendar } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '@/lib/authContext';

interface InitiativeCardProps {
  initiative: Initiative;
}

export function InitiativeCard({ initiative }: InitiativeCardProps) {
  const { user, joinInitiative } = useAuth();
  const isJoined = user?.joinedInitiatives && user.joinedInitiatives.includes(initiative.id);

  const handleJoin = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isJoined) {
      await joinInitiative(initiative.id);
    }
  };

  return (
    <Card className="h-full flex flex-col overflow-hidden hover:shadow-md transition-shadow duration-300 border-border bg-white group">
      <div className="relative h-48 overflow-hidden">
        <img
          src={initiative.image}
          alt={initiative.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-white/90 backdrop-blur-sm text-foreground hover:bg-white">
            {initiative.category}
          </Badge>
        </div>
      </div>

      <CardHeader className="p-4 pb-2">
        <h3 className="font-serif text-xl font-bold leading-tight">{initiative.title}</h3>
      </CardHeader>

      <CardContent className="p-4 pt-2 flex-1 space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {initiative.description}
        </p>

        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            <span>{initiative.participantsCount} members</span>
          </div>
          {initiative.nextEvent && (
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              <span>Next: {initiative.nextEvent}</span>
            </div>
          )}
          {initiative.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5" />
              <span>{initiative.location}</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <div className="grid grid-cols-2 gap-3 w-full">
          <Button variant="outline" className="w-full" asChild>
            <Link href={`/initiative/${initiative.id}`}>View Details</Link>
          </Button>
          <Button
            className={`w-full ${isJoined ? 'bg-muted text-muted-foreground hover:bg-muted' : ''}`}
            onClick={handleJoin}
            disabled={isJoined}
          >
            {isJoined ? 'Joined' : 'Join'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
EOF

echo "==> Writing client/src/pages/Explore.tsx"
cat > client/src/pages/Explore.tsx << 'EOF'
import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Initiative } from '@/lib/mockData';
import { InitiativeCard } from '@/components/ui/InitiativeCard';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export default function Explore() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const queryClient = useQueryClient();

  const { data: initiatives = [], isLoading } = useQuery<Initiative[]>({
    queryKey: ['/api/initiatives'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/initiatives', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/initiatives'] });
      setIsCreateOpen(false);
      setFormError('');
    },
    onError: (err: any) => {
      setFormError(err.message?.replace(/^\d+:\s*/, '') || 'Failed to create initiative');
    },
  });

  const categories = Array.from(new Set(initiatives.map((i) => i.category)));

  const filteredInitiatives = initiatives.filter((i) => {
    const matchesSearch = i.title.toLowerCase().includes(search.toLowerCase()) ||
                          i.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory ? i.category === selectedCategory : true;
    return matchesSearch && matchesCategory;
  });

  const handleCreateInitiative = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as string,
      location: formData.get('location') as string,
      image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&q=80&w=1000',
    });
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-left space-y-2">
            <h1 className="text-3xl md:text-5xl font-serif font-bold text-foreground">
              Discover Your Tribe
            </h1>
            <p className="text-lg text-muted-foreground">
              Find people who share your passions and start your journey together.
            </p>
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full shadow-lg h-12 px-6 gap-2">
                <Plus className="w-5 h-5" />
                Create Initiative
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleCreateInitiative}>
                <DialogHeader>
                  <DialogTitle className="font-serif text-2xl">Start New Initiative</DialogTitle>
                  <DialogDescription>
                    Bring people together for a shared purpose. Fill in the details below.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Title</Label>
                    <Input id="title" name="title" placeholder="e.g. Sunday Morning Yoga" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="category">Category</Label>
                    <Select name="category" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Wellness">Wellness</SelectItem>
                        <SelectItem value="Social">Social</SelectItem>
                        <SelectItem value="Fitness">Fitness</SelectItem>
                        <SelectItem value="Mindfulness">Mindfulness</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" name="location" placeholder="e.g. City Park" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea id="description" name="description" placeholder="What is this initiative about?" required />
                  </div>
                  {formError && <p className="text-sm text-destructive">{formError}</p>}
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create Initiative'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(null)}
              className="rounded-full"
            >
              All
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category)}
                className="rounded-full"
              >
                {category}
              </Button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search initiatives..."
              className="pl-9 rounded-full bg-white shadow-sm border-border"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-muted-foreground">Loading initiatives...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredInitiatives.map((initiative) => (
              <InitiativeCard key={initiative.id} initiative={initiative} />
            ))}
          </div>
        )}

        {!isLoading && filteredInitiatives.length === 0 && (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No initiatives found matching your criteria.</p>
            <Button variant="link" onClick={() => { setSearch(''); setSelectedCategory(null); }}>
              Clear filters
            </Button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
EOF

echo "==> Writing client/src/pages/Dashboard.tsx"
cat > client/src/pages/Dashboard.tsx << 'EOF'
import React from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/lib/authContext';
import { Initiative, Post } from '@/lib/mockData';
import { PostCard } from '@/components/ui/PostCard';
import { InitiativeCard } from '@/components/ui/InitiativeCard';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';

export default function Dashboard() {
  const { user } = useAuth();

  const { data: initiatives = [] } = useQuery<Initiative[]>({
    queryKey: ['/api/initiatives'],
    enabled: !!user,
  });
  const { data: feedPosts = [] } = useQuery<Post[]>({
    queryKey: ['/api/feed'],
    enabled: !!user,
  });

  if (!user) return null;

  const joinedIds = user.joinedInitiatives || [];
  const joinedInitiatives = initiatives.filter((i) => joinedIds.includes(i.id));
  const suggested = initiatives.filter((i) => !joinedIds.includes(i.id)).slice(0, 2);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-10">
        <section className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-serif font-bold text-foreground" data-testid="text-welcome">
            Welcome back, {user.name.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground">
            Here's what's happening in your community today.
          </p>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">My Initiatives</h2>
            <Link href="/explore">
              <Button variant="ghost" className="text-primary hover:text-primary/80" size="sm">
                Find More <Plus className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          {joinedInitiatives.length > 0 ? (
            <ScrollArea className="w-full whitespace-nowrap rounded-xl pb-4">
              <div className="flex w-max space-x-4 p-1">
                {joinedInitiatives.map((initiative) => (
                  <div key={initiative.id} className="w-[300px]">
                    <InitiativeCard initiative={initiative} />
                  </div>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          ) : (
            <div className="bg-muted/30 border border-dashed rounded-xl p-8 text-center space-y-4">
              <p className="text-muted-foreground">You haven't joined any initiatives yet.</p>
              <Link href="/explore">
                <Button>Explore Communities</Button>
              </Link>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            <h2 className="text-xl font-semibold">Community Feed</h2>

            {feedPosts.length > 0 ? (
              <div className="space-y-6">
                {feedPosts.map((post) => {
                  const initiative = initiatives.find((i) => i.id === post.initiativeId);
                  return (
                    <PostCard
                      key={post.id}
                      post={post}
                      initiativeName={initiative?.title}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <p>No recent activity. Join an initiative to see posts!</p>
              </div>
            )}
          </div>

          <div className="hidden md:block space-y-6">
            <div className="bg-primary/5 rounded-xl p-6 border border-primary/10">
              <h3 className="font-serif font-bold text-lg mb-2 text-primary">Daily Inspiration</h3>
              <p className="text-sm text-muted-foreground italic">
                "The power of community is that we can do together what we cannot do alone."
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Suggested for you</h3>
              <div className="space-y-4">
                {suggested.map((initiative) => (
                  <div key={initiative.id} className="flex gap-3 items-start">
                    <img src={initiative.image} alt={initiative.title} className="w-12 h-12 rounded-lg object-cover" />
                    <div>
                      <h4 className="font-medium text-sm">{initiative.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-1">{initiative.category}</p>
                      <Link href={`/initiative/${initiative.id}`}>
                        <span className="text-xs text-primary hover:underline cursor-pointer">View</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
EOF

echo "==> Writing client/src/pages/InitiativeDetail.tsx"
cat > client/src/pages/InitiativeDetail.tsx << 'EOF'
import React, { useState } from 'react';
import { useRoute, Link } from 'wouter';
import { AppLayout } from '@/components/layout/AppLayout';
import { Initiative, Post } from '@/lib/mockData';
import { useAuth } from '@/lib/authContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PostCard } from '@/components/ui/PostCard';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, MapPin, Calendar, ArrowLeft, Image as ImageIcon, Send } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export default function InitiativeDetail() {
  const [, params] = useRoute('/initiative/:id');
  const { user, joinInitiative, leaveInitiative } = useAuth();
  const id = params?.id as string;
  const queryClient = useQueryClient();
  const [newPostContent, setNewPostContent] = useState('');

  const { data: initiative, isLoading: loadingInitiative } = useQuery<Initiative>({
    queryKey: ['/api/initiatives', id],
    queryFn: async () => {
      const res = await fetch(`/api/initiatives/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load initiative');
      return res.json();
    },
    enabled: !!id,
  });

  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ['/api/initiatives', id, 'posts'],
    queryFn: async () => {
      const res = await fetch(`/api/initiatives/${id}/posts`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load posts');
      return res.json();
    },
    enabled: !!id,
  });

  const postMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await apiRequest('POST', `/api/initiatives/${id}/posts`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/initiatives', id, 'posts'] });
      setNewPostContent('');
    },
  });

  if (loadingInitiative) {
    return <AppLayout><div className="p-8">Loading...</div></AppLayout>;
  }
  if (!initiative) return <AppLayout><div className="p-8">Initiative not found</div></AppLayout>;

  const isJoined = user?.joinedInitiatives?.includes(initiative.id);

  const handleJoinToggle = async () => {
    if (isJoined) {
      await leaveInitiative(initiative.id);
    } else {
      await joinInitiative(initiative.id);
    }
    queryClient.invalidateQueries({ queryKey: ['/api/initiatives'] });
  };

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !user) return;
    postMutation.mutate(newPostContent);
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto pb-20">
        <Link href="/explore">
          <Button variant="ghost" className="mb-4 pl-0 hover:bg-transparent hover:text-primary">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Explore
          </Button>
        </Link>

        <div className="relative h-[300px] md:h-[400px] rounded-3xl overflow-hidden mb-8 shadow-xl">
          <img
            src={initiative.image}
            alt={initiative.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6 md:p-10 text-white w-full">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <Badge className="mb-3 bg-primary/80 backdrop-blur hover:bg-primary border-none">
                  {initiative.category}
                </Badge>
                <h1 className="text-3xl md:text-5xl font-serif font-bold mb-2">{initiative.title}</h1>
                <div className="flex flex-wrap gap-4 text-sm md:text-base text-white/90">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span>{initiative.participantsCount} participants</span>
                  </div>
                  {initiative.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span>{initiative.location}</span>
                    </div>
                  )}
                </div>
              </div>
              <Button
                size="lg"
                className={`min-w-[120px] ${isJoined ? 'bg-white/20 hover:bg-white/30 text-white border-none' : 'bg-primary hover:bg-primary/90 text-white border-none'}`}
                onClick={handleJoinToggle}
              >
                {isJoined ? 'Leave' : 'Join Community'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <section className="bg-white rounded-2xl p-6 shadow-sm border border-border/50">
              <h2 className="text-xl font-bold mb-3 font-serif">About this Initiative</h2>
              <p className="text-muted-foreground leading-relaxed">
                {initiative.description}
              </p>
            </section>

            {isJoined && (
              <section className="bg-white rounded-2xl p-6 shadow-sm border border-border/50">
                <div className="flex gap-4">
                  <Avatar>
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback>{user?.name[0]}</AvatarFallback>
                  </Avatar>
                  <form onSubmit={handlePostSubmit} className="flex-1 space-y-3">
                    <Textarea
                      placeholder="Share your journey, updates, or photos..."
                      className="min-h-[100px] resize-none border-border/50 bg-muted/20 focus:bg-white transition-colors"
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                    />
                    <div className="flex justify-between items-center">
                      <Button type="button" variant="ghost" size="sm" className="text-muted-foreground">
                        <ImageIcon className="w-4 h-4 mr-2" /> Add Photo
                      </Button>
                      <Button type="submit" disabled={!newPostContent.trim() || postMutation.isPending}>
                        {postMutation.isPending ? 'Posting...' : 'Post'} <Send className="w-3 h-3 ml-2" />
                      </Button>
                    </div>
                  </form>
                </div>
              </section>
            )}

            <section>
              <h3 className="text-lg font-semibold mb-4">Community Posts</h3>
              {posts.length > 0 ? (
                <div>
                  {posts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-muted/20 rounded-xl border border-dashed border-muted">
                  <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <div className="bg-secondary/5 rounded-2xl p-6 border border-secondary/10 sticky top-24">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-secondary" />
                Upcoming Events
              </h3>
              {initiative.nextEvent ? (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-border/50 mb-3">
                  <p className="font-semibold text-lg text-primary">{initiative.nextEvent}</p>
                  <p className="text-sm text-muted-foreground">Regular Meetup</p>
                  <Button variant="outline" size="sm" className="w-full mt-3">Add to Calendar</Button>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No upcoming events scheduled.</p>
              )}

              <div className="mt-6">
                <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">Community Guidelines</h4>
                <ul className="text-sm space-y-2 text-muted-foreground list-disc pl-4">
                  <li>Be respectful and kind.</li>
                  <li>Keep posts relevant to the initiative.</li>
                  <li>Support each other's growth.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
EOF

echo "==> Writing client/src/pages/Admin.tsx"
cat > client/src/pages/Admin.tsx << 'EOF'
import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Initiative } from '@/lib/mockData';
import { useAuth } from '@/lib/authContext';
import { useLocation } from 'wouter';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, ShieldAlert, CheckCircle, UserPlus, Trash2, ShieldCheck as ShieldIcon } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
}

export default function Admin() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery<AdminUser[]>({
    queryKey: ['/api/users'],
    enabled: user?.role === 'admin',
  });
  const { data: initiatives = [] } = useQuery<Initiative[]>({
    queryKey: ['/api/initiatives'],
    enabled: user?.role === 'admin',
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest('POST', '/api/users', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setIsAddUserOpen(false);
      setFormError('');
    },
    onError: (err: any) => setFormError(err.message?.replace(/^\d+:\s*/, '') || 'Failed to create user'),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => apiRequest('DELETE', `/api/users/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/users'] }),
  });

  const deleteInitiativeMutation = useMutation({
    mutationFn: async (id: string) => apiRequest('DELETE', `/api/initiatives/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/initiatives'] }),
  });

  if (user?.role !== 'admin') {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <ShieldAlert className="w-16 h-16 text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">You do not have permission to view this page.</p>
          <Button onClick={() => setLocation('/')}>Return Home</Button>
        </div>
      </AppLayout>
    );
  }

  const handleAddUser = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createUserMutation.mutate({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      role: formData.get('role') as string,
    });
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Moderation Dashboard</h1>
            <p className="text-muted-foreground">Manage community safety, users, and initiatives.</p>
          </div>

          <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <UserPlus className="w-4 h-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAddUser}>
                <DialogHeader>
                  <DialogTitle className="font-serif">Add New User</DialogTitle>
                  <DialogDescription>Create a new community member profile.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" name="name" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Temporary Password</Label>
                    <Input id="password" name="password" type="password" minLength={6} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role">Role</Label>
                    <select name="role" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  {formError && <p className="text-sm text-destructive">{formError}</p>}
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createUserMutation.isPending}>
                    {createUserMutation.isPending ? 'Creating...' : 'Create User'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-morphism">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          <Card className="glass-morphism">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Initiatives</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{initiatives.length}</div>
            </CardContent>
          </Card>
          <Card className="glass-morphism">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">System Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500 flex items-center gap-2">
                <ShieldIcon className="w-5 h-5" /> Normal
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="initiatives" className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="initiatives">Initiatives</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="initiatives" className="mt-6">
            <Card className="glass-morphism">
              <CardHeader>
                <CardTitle>Manage Initiatives</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {initiatives.map((initiative) => (
                      <TableRow key={initiative.id}>
                        <TableCell className="font-medium">{initiative.title}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{initiative.category}</Badge>
                        </TableCell>
                        <TableCell>{initiative.participantsCount}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-green-600 text-sm">
                            <CheckCircle className="w-4 h-4" /> Active
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem className="text-destructive" onClick={() => deleteInitiativeMutation.mutate(initiative.id)}>
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card className="glass-morphism">
              <CardHeader>
                <CardTitle>Manage Users</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <Badge variant={u.role === 'admin' ? 'default' : 'outline'}>
                            {u.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => deleteUserMutation.mutate(u.id)}
                                disabled={u.id === user?.id}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
EOF

echo "==> Writing scripts/make-admin.ts"
mkdir -p scripts
cat > scripts/make-admin.ts << 'EOF'
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

const email = process.argv[2];
if (!email) {
  console.error("Usage: npx tsx scripts/make-admin.ts <email>");
  process.exit(1);
}

const [updated] = await db.update(users).set({ role: "admin" }).where(eq(users.email, email)).returning();
if (!updated) {
  console.error(`No user found with email ${email}. Make sure they've signed up first at /auth.`);
  process.exit(1);
}
console.log(`Done: ${updated.email} is now an admin.`);
process.exit(0);
EOF

echo ""
echo "All files written successfully."
echo "Next steps:"
echo "1. In Replit Secrets, make sure DATABASE_URL is set to your Neon connection string."
echo "2. Run: npm run db:push   (creates the tables)"
echo "3. Run: npm run dev, open the app, go to /auth, and sign up with sari.kaaa@gmail.com"
echo "4. Run: npx tsx scripts/make-admin.ts sari.kaaa@gmail.com"
echo "5. Commit and push."
