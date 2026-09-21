import express from "express";
import cors from "cors";
import helmet from "helmet";
import authRoutes from "./routes/auth.js";
import meRoutes from "./routes/me.js";
import { env } from "./config/env.js";
import { db } from "./db.js";

const app = express();
const port = env.PORT;
const webOrigin = env.WEB_ORIGIN;

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: webOrigin, credentials: true }));
app.use(express.json({ limit: "256kb" }));

app.get("/health", (_req, res) => {
  res.json({
    service: "authenticheck-api",
    status: "ok",
    version: "0.2.0",
    databaseConfigured: true,
    timestamp: new Date().toISOString()
  });
});

app.get("/health/db", async (_req, res) => {
  try {
    const result = await db.query("SELECT NOW() AS now");
    res.json({ status: "ok", databaseTime: result.rows[0].now });
  } catch {
    res.status(503).json({ status: "error", message: "Database connection failed" });
  }
});

import productRoutes from "./routes/products.js";
import verifyRoutes from "./routes/verify.js";
import qrRoutes from "./routes/qr.js";
import batchRoutes from "./routes/batches.js";
import reportRoutes from "./routes/reports.js";
import analyticsRoutes from "./routes/analytics.js";
import aiRoutes from "./routes/ai.js";
import adminRoutes from "./routes/admin.js";

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/me", meRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/verify", verifyRoutes);
app.use("/api/v1/qr", qrRoutes);
app.use("/api/v1/batches", batchRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/admin", adminRoutes);

app.get("/api/v1", (_req, res) => {
  res.json({
    name: "AuthentiCheck API",
    version: "v1",
    status: "foundation"
  });
});

app.listen(port, () => {
  console.log(`AuthentiCheck API listening on http://localhost:${port}`);
});
