import type { NextFunction, Request, Response } from "express";
import { createHmac } from "node:crypto";
import { env } from "../config/env.js";
import type { AuthUser, UserRole } from "../types/auth.js";

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

function decodePart(value: string): unknown {
  return JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
}

function verifyToken(token: string): AuthUser | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [header, payload, signature] = parts;
  const expected = createHmac("sha256", env.JWT_ACCESS_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");

  if (signature !== expected) return null;

  const body = decodePart(payload) as {
    sub?: string; email?: string; role?: UserRole; fullName?: string; exp?: number;
  };

  if (!body.sub || !body.email || !body.role || !body.fullName || !body.exp) return null;
  if (body.exp < Math.floor(Date.now() / 1000)) return null;

  return {
    id: body.sub,
    email: body.email,
    role: body.role,
    fullName: body.fullName
  };
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const value = req.headers.authorization;
  if (!value?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const user = verifyToken(value.slice(7));
    if (!user) {
      res.status(401).json({ error: "Invalid or expired access token" });
      return;
    }
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid access token" });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
