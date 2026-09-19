import { Pool } from "pg";
import { env } from "./config/env.js";

let db: any;
try {
  db = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000
  });
} catch {
  console.warn("DB not connected — mock active");
  db = {
    query: async () => ({ rows: [] }),
    connect: async () => ({
      query: async () => ({ rows: [] }),
      release: () => {}
    })
  };
}

export { db };
