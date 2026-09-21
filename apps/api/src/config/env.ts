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
  JWT_REFRESH_SECRET: z.string().min(32),
  PUBLIC_VERIFY_URL: z.string().url().default("http://localhost:3000/verify"),
  AI_SERVICE_URL: z.string().url().default("http://localhost:8000"),
  REDIS_URL: z.string().url().optional(),
  RESET_URL: z.string().url().default("http://localhost:3000/reset-password"),
  RESEND_API_KEY: z.string().min(1).optional(),
  RESEND_FROM_EMAIL: z.string().email().optional()
});

const parsedEnv = schema.safeParse({
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  WEB_ORIGIN: process.env.WEB_ORIGIN,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  PUBLIC_VERIFY_URL: process.env.PUBLIC_VERIFY_URL,
  AI_SERVICE_URL: process.env.AI_SERVICE_URL,
  REDIS_URL: process.env.REDIS_URL,
  RESET_URL: process.env.RESET_URL,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL
});

if (!parsedEnv.success) throw parsedEnv.error;
if (parsedEnv.data.NODE_ENV === "production" && (!parsedEnv.data.RESEND_API_KEY || !parsedEnv.data.RESEND_FROM_EMAIL)) {
  throw new Error("RESEND_API_KEY and RESEND_FROM_EMAIL are required in production");
}
export const env = parsedEnv.data;
