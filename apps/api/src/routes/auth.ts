import { Router } from "express";
import { z } from "zod";
import { createHash, randomBytes } from "node:crypto";
import { db } from "../db.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { createAccessToken } from "../utils/jwt.js";
import type { UserRole } from "../types/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";
import { env } from "../config/env.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email().transform(v => v.toLowerCase()),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(2).max(100),
  role: z.enum(["CONSUMER", "MANUFACTURER"]).default("CONSUMER"),
  organizationName: z.string().trim().min(2).max(150).optional()
});

const loginSchema = z.object({
  email: z.string().email().transform(v => v.toLowerCase()),
  password: z.string().min(1).max(128)
});

router.post("/register", rateLimit({ windowMs: 15 * 60_000, max: 10, keyPrefix: "register" }), async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid registration data", details: parsed.error.flatten() });
    return;
  }

  const { email, password, fullName, role, organizationName } = parsed.data;
  if (role === "MANUFACTURER" && !organizationName) {
    res.status(400).json({ error: "organizationName is required for manufacturers" });
    return;
  }

  try {
    const passwordHash = await hashPassword(password);
    const result = await db.query(
      `INSERT INTO users (email, password_hash, full_name, role)
       VALUES ($1, $2, $3, $4::user_role)
       RETURNING id, email, full_name, role`,
      [email, passwordHash, fullName, role]
    );

    const user = result.rows[0] as { id:string; email:string; full_name:string; role:UserRole };

    if (role === "MANUFACTURER") {
      await db.query(
        `INSERT INTO manufacturers (user_id, organization_name)
         VALUES ($1, $2)`,
        [user.id, organizationName]
      );
    }

    const authUser = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role
    };

    res.status(201).json({ user: authUser, accessToken: createAccessToken(authUser) });
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", rateLimit({ windowMs: 15 * 60_000, max: 20, keyPrefix: "login" }), async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid login data" });
    return;
  }

  try {
    const result = await db.query(
      `SELECT id, email, full_name, role, is_active, password_hash
       FROM users WHERE email = $1 LIMIT 1`,
      [parsed.data.email]
    );

    const user = result.rows[0] as {
      id:string; email:string; full_name:string; role:UserRole; is_active:boolean; password_hash:string;
    } | undefined;

    if (!user || !user.is_active || !(await verifyPassword(parsed.data.password, user.password_hash))) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const authUser = {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      role: user.role
    };

    res.json({ user: authUser, accessToken: createAccessToken(authUser) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Login failed" });
  }
});

const forgotSchema = z.object({ email: z.string().email().transform(v => v.toLowerCase()) });

router.post("/forgot-password", rateLimit({ windowMs: 15 * 60_000, max: 10, keyPrefix: "forgot-password" }), async (req, res) => {
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }
  try {
    const user = await db.query("SELECT id FROM users WHERE email = $1 AND is_active = TRUE LIMIT 1", [parsed.data.email]);
    if (user.rows[0]) {
      const rawToken = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      await db.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL", [user.rows[0].id]);
      await db.query("INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, NOW() + INTERVAL '30 minutes')", [user.rows[0].id, tokenHash]);
      if (env.NODE_ENV !== "production") {
        console.info("Password reset token generated for development:", rawToken);
      }
    }
    res.json({ message: "If an account exists for this email, recovery instructions will be sent." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Password recovery request failed" });
  }
});

const resetRequestSchema = z.object({ token: z.string().min(32).max(200), newPassword: z.string().min(8).max(128) });

router.post("/reset-password", rateLimit({ windowMs: 15 * 60_000, max: 10, keyPrefix: "reset-password" }), async (req, res) => {
  const parsed = resetRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid password reset request" });
    return;
  }
  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query("SELECT id, user_id FROM password_reset_tokens WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW() LIMIT 1 FOR UPDATE", [tokenHash]);
    if (!found.rows[0]) {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }
    const passwordHash = await hashPassword(parsed.data.newPassword);
    await client.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [passwordHash, found.rows[0].user_id]);
    await client.query("UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL", [found.rows[0].user_id]);
    await client.query("COMMIT");
    res.json({ message: "Password updated successfully. Please sign in again." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Password reset failed" });
  } finally {
    client.release();
  }
});

export default router;
