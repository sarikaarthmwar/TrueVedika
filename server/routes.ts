import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage.js";
import { setupAuth, requireAuth, requireAdmin, hashPassword, sanitize } from "./auth.js";
import { insertInitiativeSchema } from "../shared/schema.js";

function extractMeta(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const a = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i").exec(html);
  const b = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i").exec(html);
  return (a?.[1] || b?.[1] || "").replace(/&amp;/g, "&").trim();
}
async function unfurlProduct(url: string) {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only web links are supported');
  const hostname = parsed.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname.endsWith('.local')) throw new Error('Invalid product link');
  const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 TrueVedikaShop/1.0' }, redirect: 'follow', signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Could not read product page (${response.status})`);
  const html = await response.text();
  const name = extractMeta(html, 'og:title') || extractMeta(html, 'twitter:title') || /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1]?.trim() || 'TrueVedika Pick';
  const image = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image');
  if (!image) throw new Error('This retailer did not provide a product image. Please send a product link with a visible image.');
  return { name, image };
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  setupAuth(app);
  app.get("/api/initiatives", async (_req, res, next) => { try { res.json(await storage.listInitiatives()); } catch (err) { next(err); } });
  app.get("/api/initiatives/:id", async (req, res, next) => { try { const initiative = await storage.getInitiative(req.params.id); if (!initiative) return res.status(404).json({ message: "Not found" }); res.json(initiative); } catch (err) { next(err); } });
  app.post("/api/initiatives", requireAuth, async (req, res) => { try { const parsed = insertInitiativeSchema.parse(req.body); res.status(201).json(await storage.createInitiative({ ...parsed, creatorId: (req.user as any).id })); } catch (err: any) { res.status(400).json({ message: err.message || "Invalid initiative data" }); } });
  app.delete("/api/initiatives/:id", requireAdmin, async (req, res, next) => { try { await storage.deleteInitiative(req.params.id); res.json({ message: "Deleted" }); } catch (err) { next(err); } });
  app.post("/api/initiatives/:id/join", requireAuth, async (req, res, next) => { try { await storage.joinInitiative((req.user as any).id, req.params.id); res.json({ message: "Joined" }); } catch (err) { next(err); } });
  app.post("/api/initiatives/:id/leave", requireAuth, async (req, res, next) => { try { await storage.leaveInitiative((req.user as any).id, req.params.id); res.json({ message: "Left" }); } catch (err) { next(err); } });
  app.get("/api/initiatives/:id/posts", async (req, res, next) => { try { res.json(await storage.listPostsByInitiative(req.params.id)); } catch (err) { next(err); } });
  app.post("/api/initiatives/:id/posts", requireAuth, async (req, res, next) => { try { const { content, image } = req.body || {}; if (!content || !String(content).trim()) return res.status(400).json({ message: "Content is required" }); res.status(201).json(await storage.createPost({ initiativeId: req.params.id, authorId: (req.user as any).id, content, image })); } catch (err) { next(err); } });
  app.get("/api/feed", requireAuth, async (req, res, next) => { try { const ids = await storage.getJoinedInitiativeIds((req.user as any).id); res.json(await storage.listFeedPosts(ids)); } catch (err) { next(err); } });
  app.get("/api/posts/:id/comments", async (req, res, next) => { try { res.json(await storage.listCommentsByPost(req.params.id)); } catch (err) { next(err); } });
  app.post("/api/posts/:id/comments", requireAuth, async (req, res, next) => { try { const { content } = req.body || {}; if (!content || !String(content).trim()) return res.status(400).json({ message: "Content is required" }); res.status(201).json(await storage.createComment({ postId: req.params.id, authorId: (req.user as any).id, content })); } catch (err) { next(err); } });

  app.get("/api/shop/products", async (_req, res, next) => { try { res.json(await storage.listShopProducts()); } catch (err) { next(err); } });
  app.get("/api/shop/products/:id/click", async (req, res, next) => { try { const product = await storage.getShopProduct(req.params.id); if (!product) return res.status(404).send('Product not found'); await storage.incrementShopClick(req.params.id); res.redirect(product.affiliateUrl); } catch (err) { next(err); } });
  app.get("/api/shop/admin", requireAdmin, async (_req, res, next) => { try { res.json({ products: await storage.listShopProducts(), summary: await storage.shopSummary() }); } catch (err) { next(err); } });
  app.post("/api/shop/products", requireAdmin, async (req, res) => { try { const { affiliateUrl, category } = req.body || {}; if (!affiliateUrl || !category) return res.status(400).json({ message: 'Affiliate link and category are required' }); const meta = await unfurlProduct(String(affiliateUrl)); const product = await storage.createShopProduct({ affiliateUrl: String(affiliateUrl), category: String(category), ...meta }); res.status(201).json(product); } catch (err: any) { res.status(400).json({ message: err.message || 'Could not add product' }); } });
  app.delete("/api/shop/products/:id", requireAdmin, async (req, res, next) => { try { await storage.deleteShopProduct(req.params.id); res.json({ message: 'Deleted' }); } catch (err) { next(err); } });

  app.get("/api/users", requireAdmin, async (_req, res, next) => { try { res.json((await storage.listUsers()).map(sanitize)); } catch (err) { next(err); } });
  app.post("/api/users", requireAdmin, async (req, res) => { try { const { name, email, password, role } = req.body || {}; if (!name || !email || !password) return res.status(400).json({ message: "Name, email, password required" }); if (await storage.getUserByEmail(email)) return res.status(400).json({ message: "Email already in use" }); const user = await storage.createUser({ name, email, password: await hashPassword(password), role: role === "admin" ? "admin" : "user", avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}` }); res.status(201).json(sanitize(user)); } catch (err: any) { res.status(400).json({ message: err.message || "Failed to create user" }); } });
  app.delete("/api/users/:id", requireAdmin, async (req, res, next) => { try { await storage.deleteUser(req.params.id); res.json({ message: "Deleted" }); } catch (err) { next(err); } });
  return httpServer;
}
