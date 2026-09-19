import { createHmac, randomBytes, randomUUID } from "node:crypto";

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: "CONSUMER" | "MANUFACTURER";
  organizationName?: string;
}

export interface Product {
  id: string;
  userId: string;
  name: string;
  brand: string;
  category: string;
  description?: string;
  createdAt: string;
  instanceCount: number;
  batchCount: number;
}

export interface ProductInstance {
  id: string;
  productId: string;
  serialNumber: string;
  status: "ACTIVE" | "BLOCKED" | "RETIRED";
  scanCount: number;
}

// Global in-memory store so it survives across requests in dev mode
const globalStore = globalThis as unknown as {
  __authenticheck_users?: Map<string, User>;
  __authenticheck_products?: Map<string, Product>;
  __authenticheck_instances?: Map<string, ProductInstance>;
};

if (!globalStore.__authenticheck_users) {
  globalStore.__authenticheck_users = new Map();
  // Pre-seed demo manufacturer
  const demoUserId = "user-demo-manufacturer-1";
  globalStore.__authenticheck_users.set("manufacturer@example.com", {
    id: demoUserId,
    email: "manufacturer@example.com",
    passwordHash: "scrypt:demo:hash",
    fullName: "Apex Goods Corp",
    role: "MANUFACTURER",
    organizationName: "Apex Manufacturing Global"
  });
}

if (!globalStore.__authenticheck_products) {
  globalStore.__authenticheck_products = new Map();
  const demoUserId = "user-demo-manufacturer-1";
  globalStore.__authenticheck_products.set("prod-1", {
    id: "prod-1",
    userId: demoUserId,
    name: "Aura Chronograph Ref. 101",
    brand: "Aura Horology",
    category: "Luxury Watches",
    description: "Handcrafted Swiss-movement automatic chronograph",
    createdAt: new Date().toISOString(),
    batchCount: 2,
    instanceCount: 150
  });
  globalStore.__authenticheck_products.set("prod-2", {
    id: "prod-2",
    userId: demoUserId,
    name: "Apex Studio Hi-Fi Headphones",
    brand: "Apex Audio",
    category: "Consumer Audio",
    description: "Planar magnetic reference headphones",
    createdAt: new Date().toISOString(),
    batchCount: 3,
    instanceCount: 450
  });
}

if (!globalStore.__authenticheck_instances) {
  globalStore.__authenticheck_instances = new Map();
  // Seed sample instances
  globalStore.__authenticheck_instances.set("AC-DEMO-001", {
    id: "inst-1",
    productId: "prod-1",
    serialNumber: "AC-DEMO-001",
    status: "ACTIVE",
    scanCount: 1
  });
  globalStore.__authenticheck_instances.set("AC-LUX-78291", {
    id: "inst-2",
    productId: "prod-1",
    serialNumber: "AC-LUX-78291",
    status: "ACTIVE",
    scanCount: 2
  });
  globalStore.__authenticheck_instances.set("AC-SUS-44102", {
    id: "inst-3",
    productId: "prod-2",
    serialNumber: "AC-SUS-44102",
    status: "ACTIVE",
    scanCount: 26
  });
}

export const users = globalStore.__authenticheck_users;
export const products = globalStore.__authenticheck_products;
export const instances = globalStore.__authenticheck_instances;

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || "authenticheck_in_memory_jwt_secret_dev_32chars_min";

export function createToken(user: { id: string; email: string; fullName: string; role: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      iat: now,
      exp: now + 86400,
      jti: randomUUID()
    })
  ).toString("base64url");
  const signature = createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

export function verifyToken(token: string): { id: string; email: string; fullName: string; role: string } | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const expected = createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
    if (signature !== expected) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;
    return {
      id: data.sub,
      email: data.email,
      fullName: data.fullName,
      role: data.role
    };
  } catch {
    return null;
  }
}
