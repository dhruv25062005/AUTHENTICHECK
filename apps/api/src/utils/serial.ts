import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateSerial(prefix = "AC"): string {
  const bytes = randomBytes(12);
  let body = "";
  for (const byte of bytes) body += ALPHABET[byte % ALPHABET.length];
  return `${prefix}-${body.slice(0, 6)}-${body.slice(6)}`;
}

export function hashToken(token: string): string {
  return require("node:crypto").createHash("sha256").update(token).digest("hex");
}
