import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { db } from "./server/db";
import authRouter from "./server/auth";
import productsRouter from "./server/products";
import ordersRouter from "./server/orders";
import aiRouter from "./server/ai";
import adminRouter from "./server/admin";

// Load environment configurations from .env
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // Body parsers
  app.use(express.json({ limit: "50mb" })); // raised limits for base64 image searches
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Debug logger middleware
  app.use((req, res, next) => {
    console.log(`[ShopEZ AI Server] ${req.method} ${req.path}`);
    next();
  });

  // 1. PUBLIC ENDPOINTS
  app.get("/api/public/announcements", (req, res) => {
    try {
      res.json(db.announcements);
    } catch (e: any) {
      res.status(500).json({ error: "Failed to load public announcements" });
    }
  });

  app.get("/api/public/featured-products", async (req, res) => {
    try {
      const catalog = await db.getProducts();
      // Return first 4 items as guest-landing featured highlights
      res.json(catalog.slice(0, 4));
    } catch (e) {
      res.status(500).json({ error: "Failed to load featured products" });
    }
  });

  // 2. MODULAR API SUBROUTERS
  app.use("/api/auth", authRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/admin", adminRouter);

  // Health check API
  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      database: "connected",
      time: new Date().toISOString(),
      aiEngine: process.env.GEMINI_API_KEY ? "Gemini Enabled" : "Simulated Local"
    });
  });

  // 3. VITE MIDDLEWARE OR STATIC SERVING LAYER
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting development server. Hooking Vite middleware mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving static production assets from /dist...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Platform Online] ShopEZ AI standard server is live!`);
    console.log(`- Web Client URL: http://localhost:${PORT}`);
    console.log(`- Database Status: Dual-Mode enabled (MongoDB Atlas fallback to Local JSON files)`);
  });
}

startServer().catch((error) => {
  console.error("Fatal exception during server boot:", error);
});
