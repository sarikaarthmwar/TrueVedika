import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes.js";
import { ensureShopProductsTable } from "../server/shopBootstrap.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const httpServer = createServer(app);

// Vercel serves this entry point directly, bypassing server/index.ts.
// Initialize the shop table here so product requests do not fail on a fresh database.
const initialization = (async () => {
  await ensureShopProductsTable();
  await registerRoutes(httpServer, app);
})();

app.use(async (_req, _res, next) => {
  try {
    await initialization;
    next();
  } catch (error) {
    next(error);
  }
});

export default app;
