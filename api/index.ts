import express from "express";
import { createServer } from "http";
import { registerRoutes } from "../server/routes.js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const httpServer = createServer(app);
registerRoutes(httpServer, app);

export default app;