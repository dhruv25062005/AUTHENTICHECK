import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";

const app = express();
const port = Number(process.env.PORT ?? 4000);
const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:3000";

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({ origin: webOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({
    service: "authenticheck-api",
    status: "ok",
    version: "0.1.0",
    timestamp: new Date().toISOString()
  });
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
