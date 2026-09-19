import { createHash, randomBytes } from "node:crypto";
const ALPHABET="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateSerial(prefix="AC"){const bytes=randomBytes(12);let body="";for(const byte of bytes)body+=ALPHABET[byte%ALPHABET.length];return `${prefix}-${body.slice(0,6)}-${body.slice(6)}`;}
export function hashToken(token:string){return createHash("sha256").update(token).digest("hex");}
