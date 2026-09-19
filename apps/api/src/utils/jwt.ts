import { createHmac, randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import type { AuthUser } from "../types/auth.js";

function base64url(input: string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: object, secret: string): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify(payload));
  const signature = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

export function createAccessToken(user: AuthUser): string {
  const now = Math.floor(Date.now() / 1000);
  return sign({
    sub: user.id,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    iat: now,
    exp: now + 15 * 60,
    jti: randomUUID()
  }, env.JWT_ACCESS_SECRET);
}
