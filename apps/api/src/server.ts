import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { Pool } from "pg";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";

const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : null;

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: webOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({
    service: "authenticheck-api",
    status: "ok",
    version: "0.1.0",
    databaseConfigured: Boolean(pool),
    timestamp: new Date().toISOString()
  });
});

app.get("/health/db", async (_req, res) => {
  if (!pool) {
    res.status(503).json({ status: "unconfigured", message: "DATABASE_URL is not configured" });
    return;
  }

  try {
    const result = await pool.query("SELECT NOW() AS now");
    res.json({ status: "ok", databaseTime: result.rows[0].now });
  } catch {
    res.status(503).json({ status: "error", message: "Database connection failed" });
  }
});

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
