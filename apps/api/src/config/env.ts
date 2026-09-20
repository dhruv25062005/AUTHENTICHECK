import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { z } from "zod";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(currentDir, "../../../../");
dotenv.config({ path: resolve(repositoryRoot, ".env") });

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32)
});

const parsed = schema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  WEB_ORIGIN: process.env.WEB_ORIGIN,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET
});

if (!parsed.success) {
  console.error("Invalid AuthentiCheck environment configuration.");
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment configuration");
}

export const env = parsed.data;
