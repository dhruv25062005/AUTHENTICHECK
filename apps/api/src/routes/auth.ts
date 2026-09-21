import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { createAccessToken } from "../utils/jwt.js";
import type { UserRole } from "../types/auth.js";

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

router.post("/register", async (req, res) => {
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

router.post("/login", async (req, res) => {
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

router.post("/forgot-password", async (req, res) => {
  const parsed = forgotSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }
  // Do not reveal whether an account exists. Email delivery can be connected
  // to a provider later without changing the public API contract.
  res.json({ message: "If an account exists for this email, recovery instructions will be sent." });
});

export default router;
