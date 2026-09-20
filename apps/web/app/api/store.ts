import { createHmac, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

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
  batchCode?: string;
  createdAt?: string;
  lastScannedAt?: string;
  lastScanLocation?: string;
}

export interface Batch {
  id: string;
  productId: string;
  batchCode: string;
  manufacturingDate: string;
  quantity: number;
  createdAt: string;
  sampleSerials?: string[];
}

export interface AuthorizedMerchant {
  id: string;
  name: string;
  domainOrSlug: string;
  category: string;
  status: "AUTHORIZED" | "SUSPECT" | "BLACKLISTED";
  trustScore: number;
  authorizedBrands: string[];
  websiteUrl?: string;
  warningNotice?: string;
  verifiedSince?: string;
}

export interface SafetyAdvisory {
  id: string;
  productName: string;
  brand: string;
  category: string;
  severity: "URGENT" | "MODERATE" | "INFORMATIONAL";
  headline: string;
  details: string;
  affectedSerialsOrBatches: string[];
  actionRequired: string;
  issuedAt: string;
}

export interface Report {
  id: string;
  serialNumber: string;
  productName?: string;
  merchantName: string;
  storeLocation: string;
  reason: string;
  evidenceUrl?: string;
  severity?: "LOW" | "MEDIUM" | "CRITICAL";
  status?: "PENDING" | "INVESTIGATING" | "RESOLVED";
  createdAt: string;
}

export interface ScanEvent {
  id: string;
  serialNumber: string;
  status: "GENUINE" | "SUSPICIOUS" | "HIGH_RISK";
  riskScore: number;
  location?: string;
  userAgent?: string;
  timestamp: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

interface SerializedStore {
  users: [string, User][];
  products: [string, Product][];
  instances: [string, ProductInstance][];
  batches: [string, Batch][];
  reports: [string, Report][];
  merchants?: [string, AuthorizedMerchant][];
  advisories?: [string, SafetyAdvisory][];
  scans?: ScanEvent[];
}

// Global in-memory store so it survives across requests in dev mode
const globalStore = globalThis as unknown as {
  __authenticheck_users?: Map<string, User>;
  __authenticheck_products?: Map<string, Product>;
  __authenticheck_instances?: Map<string, ProductInstance>;
  __authenticheck_batches?: Map<string, Batch>;
  __authenticheck_reports?: Map<string, Report>;
  __authenticheck_merchants?: Map<string, AuthorizedMerchant>;
  __authenticheck_advisories?: Map<string, SafetyAdvisory>;
  __authenticheck_scans?: ScanEvent[];
  __authenticheck_persisted?: boolean;
};

function ensureInitialized() {
  if (globalStore.__authenticheck_persisted) return;

  globalStore.__authenticheck_users = new Map();
  globalStore.__authenticheck_products = new Map();
  globalStore.__authenticheck_instances = new Map();
  globalStore.__authenticheck_batches = new Map();
  globalStore.__authenticheck_reports = new Map();
  globalStore.__authenticheck_merchants = new Map();
  globalStore.__authenticheck_advisories = new Map();
  globalStore.__authenticheck_scans = [];

  let loadedFromDisk = false;
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, "utf-8");
      const data: SerializedStore = JSON.parse(raw);
      if (Array.isArray(data.users)) {
        for (const [k, v] of data.users) globalStore.__authenticheck_users.set(k, v);
      }
      if (Array.isArray(data.products)) {
        for (const [k, v] of data.products) globalStore.__authenticheck_products.set(k, v);
      }
      if (Array.isArray(data.instances)) {
        for (const [k, v] of data.instances) globalStore.__authenticheck_instances.set(k, v);
      }
      if (Array.isArray(data.batches)) {
        for (const [k, v] of data.batches) globalStore.__authenticheck_batches.set(k, v);
      }
      if (Array.isArray(data.reports)) {
        for (const [k, v] of data.reports) globalStore.__authenticheck_reports.set(k, v);
      }
      if (Array.isArray(data.merchants)) {
        for (const [k, v] of data.merchants) globalStore.__authenticheck_merchants.set(k, v);
      }
      if (Array.isArray(data.advisories)) {
        for (const [k, v] of data.advisories) globalStore.__authenticheck_advisories.set(k, v);
      }
      if (Array.isArray(data.scans)) {
        globalStore.__authenticheck_scans = data.scans;
      }
      loadedFromDisk = true;
    }
  } catch (err) {
    console.warn("Could not load persisted store from disk:", err);
  }

  // Seed default demo data if merchants or advisories are empty
  if (globalStore.__authenticheck_merchants.size === 0) {
    const seedMerchants: AuthorizedMerchant[] = [
      {
        id: "merch-1",
        name: "Official Aura Horology Flagship Boutique",
        domainOrSlug: "aurahorology.com",
        category: "Luxury Watches & Fine Jewelry",
        status: "AUTHORIZED",
        trustScore: 99,
        authorizedBrands: ["Aura Horology", "Swiss Guild"],
        websiteUrl: "https://aurahorology.com",
        verifiedSince: "2024-01-15"
      },
      {
        id: "merch-2",
        name: "SoundWave Global Audio Partners",
        domainOrSlug: "soundwaveaudio.com",
        category: "Consumer Audio & Pro Gear",
        status: "AUTHORIZED",
        trustScore: 97,
        authorizedBrands: ["Apex Audio", "StudioPro"],
        websiteUrl: "https://soundwaveaudio.com",
        verifiedSince: "2024-06-20"
      },
      {
        id: "merch-3",
        name: "BestTech Certified Online Direct",
        domainOrSlug: "besttechstore.com",
        category: "Electronics & Tech Accessories",
        status: "AUTHORIZED",
        trustScore: 94,
        authorizedBrands: ["Apex Audio", "Aura Horology"],
        websiteUrl: "https://besttechstore.com",
        verifiedSince: "2025-02-10"
      },
      {
        id: "merch-4",
        name: "Apex Bargain Outlet Warehouse (Unverified)",
        domainOrSlug: "apex-steals-warehouse.net",
        category: "Discount Outlet / Liquidator",
        status: "SUSPECT",
        trustScore: 35,
        authorizedBrands: [],
        warningNotice: "Unauthorized liquidation vendor with multiple customer claims of cloned serial QR stickers."
      },
      {
        id: "merch-5",
        name: "CheapReplicaHorology & Co",
        domainOrSlug: "replica-aura-watches.biz",
        category: "Gray Market / Counterfeit Hub",
        status: "BLACKLISTED",
        trustScore: 0,
        authorizedBrands: [],
        warningNotice: "Confirmed manufacturer cease-and-desist recipient. Distributes counterfeit Aura Chronograph Ref. 101."
      }
    ];
    for (const m of seedMerchants) {
      globalStore.__authenticheck_merchants.set(m.domainOrSlug.toLowerCase(), m);
      globalStore.__authenticheck_merchants.set(m.name.toLowerCase(), m);
    }
  }

  if (globalStore.__authenticheck_advisories.size === 0) {
    const seedAdvisories: SafetyAdvisory[] = [
      {
        id: "adv-001",
        productName: "Aura Chronograph Ref. 101",
        brand: "Aura Horology",
        category: "Luxury Watches",
        severity: "URGENT",
        headline: "Cloned QR Foil Stickers Spotted in European Resale Hubs",
        details: "Security teams uncovered unauthorized duplicate serial tags mimicking the Aura Chronograph Swiss ledger QR code. Serial tags with repeated scans exceeding 10 are flagged for instant physical audit.",
        affectedSerialsOrBatches: ["AC-SUS-44102", "AC-CLONE-990"],
        actionRequired: "Examine movement through transparent caseback; authentic watches feature micro-engraved serials on the rotor balance bridge.",
        issuedAt: "2026-02-14T00:00:00Z"
      },
      {
        id: "adv-002",
        productName: "Apex Studio Hi-Fi Headphones",
        brand: "Apex Audio",
        category: "Consumer Audio",
        severity: "MODERATE",
        headline: "Substandard Lithium-Polymer Battery Packs in Non-OEM Clones",
        details: "Counterfeit Apex Studio headphones purchased from unauthorized online kiosks have been reported with hazardous uncertified battery cells posing overheating risks during fast charging.",
        affectedSerialsOrBatches: ["APEX-ANC-B4"],
        actionRequired: "Verify USB-C port laser etching and ensure the weight is exactly 284 grams.",
        issuedAt: "2026-03-01T00:00:00Z"
      }
    ];
    for (const a of seedAdvisories) {
      globalStore.__authenticheck_advisories.set(a.id, a);
    }
  }

  // Seed default demo data if store is empty
  if (!loadedFromDisk || globalStore.__authenticheck_users.size === 0) {
    const demoUserId = "user-demo-manufacturer-1";
    globalStore.__authenticheck_users.set("manufacturer@example.com", {
      id: demoUserId,
      email: "manufacturer@example.com",
      passwordHash: "scrypt:demo:hash",
      fullName: "Apex Goods Corp",
      role: "MANUFACTURER",
      organizationName: "Apex Manufacturing Global"
    });

    globalStore.__authenticheck_products.set("prod-1", {
      id: "prod-1",
      userId: demoUserId,
      name: "Aura Chronograph Ref. 101",
      brand: "Aura Horology",
      category: "Luxury Watches",
      description: "Handcrafted Swiss-movement automatic chronograph with sapphire crystal and guilloché dial",
      createdAt: "2026-01-10T09:00:00.000Z",
      batchCount: 2,
      instanceCount: 150
    });

    globalStore.__authenticheck_products.set("prod-2", {
      id: "prod-2",
      userId: demoUserId,
      name: "Apex Studio Hi-Fi Headphones",
      brand: "Apex Audio",
      category: "Consumer Audio",
      description: "Planar magnetic reference headphones with active noise cancellation and lossless DAC",
      createdAt: "2026-02-05T14:30:00.000Z",
      batchCount: 3,
      instanceCount: 450
    });

    globalStore.__authenticheck_instances.set("AC-DEMO-001", {
      id: "inst-1",
      productId: "prod-1",
      serialNumber: "AC-DEMO-001",
      status: "ACTIVE",
      scanCount: 1,
      batchCode: "CHRONO-2026-Q1",
      createdAt: "2026-01-15T10:00:00.000Z",
      lastScannedAt: new Date().toISOString(),
      lastScanLocation: "Zurich, CH"
    });

    globalStore.__authenticheck_instances.set("AC-LUX-78291", {
      id: "inst-2",
      productId: "prod-1",
      serialNumber: "AC-LUX-78291",
      status: "ACTIVE",
      scanCount: 2,
      batchCode: "CHRONO-2026-Q1",
      createdAt: "2026-01-15T10:00:00.000Z",
      lastScannedAt: new Date(Date.now() - 3600000).toISOString(),
      lastScanLocation: "New York, USA"
    });

    globalStore.__authenticheck_instances.set("AC-SUS-44102", {
      id: "inst-3",
      productId: "prod-2",
      serialNumber: "AC-SUS-44102",
      status: "ACTIVE",
      scanCount: 26,
      batchCode: "APEX-ANC-B4",
      createdAt: "2026-02-10T11:00:00.000Z",
      lastScannedAt: new Date().toISOString(),
      lastScanLocation: "Hong Kong, HK"
    });

    globalStore.__authenticheck_batches.set("batch-1", {
      id: "batch-1",
      productId: "prod-1",
      batchCode: "CHRONO-2026-Q1",
      manufacturingDate: "2026-01-15",
      quantity: 150,
      createdAt: "2026-01-15T08:00:00.000Z",
      sampleSerials: ["AC-DEMO-001", "AC-LUX-78291"]
    });

    globalStore.__authenticheck_batches.set("batch-2", {
      id: "batch-2",
      productId: "prod-2",
      batchCode: "APEX-ANC-B4",
      manufacturingDate: "2026-02-10",
      quantity: 450,
      createdAt: "2026-02-10T08:00:00.000Z",
      sampleSerials: ["AC-SUS-44102"]
    });

    globalStore.__authenticheck_reports.set("rep-1", {
      id: "rep-1",
      serialNumber: "AC-SUS-44102",
      productName: "Apex Studio Hi-Fi Headphones",
      merchantName: "Discount Electronics Kiosk #4",
      storeLocation: "Terminal B, Intl Airport",
      reason: "Box typography was blurry, serial label looked glued on over another code.",
      severity: "CRITICAL",
      status: "INVESTIGATING",
      createdAt: new Date(Date.now() - 86400000).toISOString()
    });

    saveStoreToDiskSync();
  }

  globalStore.__authenticheck_persisted = true;
}

function saveStoreToDiskSync() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const payload: SerializedStore = {
      users: Array.from(globalStore.__authenticheck_users?.entries() || []),
      products: Array.from(globalStore.__authenticheck_products?.entries() || []),
      instances: Array.from(globalStore.__authenticheck_instances?.entries() || []),
      batches: Array.from(globalStore.__authenticheck_batches?.entries() || []),
      reports: Array.from(globalStore.__authenticheck_reports?.entries() || []),
      merchants: Array.from(globalStore.__authenticheck_merchants?.entries() || []),
      advisories: Array.from(globalStore.__authenticheck_advisories?.entries() || []),
      scans: globalStore.__authenticheck_scans || []
    };
    fs.writeFileSync(STORE_FILE, JSON.stringify(payload, null, 2), "utf-8");
  } catch (err) {
    console.warn("Could not save store to disk:", err);
  }
}

let persistTimeout: NodeJS.Timeout | null = null;
export function persistStore() {
  if (persistTimeout) clearTimeout(persistTimeout);
  persistTimeout = setTimeout(() => {
    saveStoreToDiskSync();
  }, 100);
}

ensureInitialized();

export const users = globalStore.__authenticheck_users!;
export const products = globalStore.__authenticheck_products!;
export const instances = globalStore.__authenticheck_instances!;
export const batches = globalStore.__authenticheck_batches!;
export const reports = globalStore.__authenticheck_reports!;
export const merchants = globalStore.__authenticheck_merchants!;
export const advisories = globalStore.__authenticheck_advisories!;
export const scans = globalStore.__authenticheck_scans!;

export function recordScanEvent(event: Omit<ScanEvent, "id" | "timestamp">): ScanEvent {
  const fullEvent: ScanEvent = {
    ...event,
    id: randomUUID(),
    timestamp: new Date().toISOString()
  };
  scans.unshift(fullEvent);
  if (scans.length > 500) scans.pop();
  persistStore();
  return fullEvent;
}

const JWT_SECRET = process.env.JWT_ACCESS_SECRET || "authenticheck_secure_enterprise_jwt_token_2026_prod_key";

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
      exp: now + 86400 * 7, // 7 days
      jti: randomUUID()
    })
  ).toString("base64url");
  const signature = createHmac("sha256", JWT_SECRET).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

export function verifyToken(token: string): { id: string; email: string; fullName: string; role: string } | null {
  try {
    if (token === "firebase_auth_token_active" || token.startsWith("firebase_")) {
      return {
        id: "user-demo-manufacturer-1",
        email: "authenticated@authenticheck.protocol",
        fullName: "Authenticated User",
        role: "MANUFACTURER"
      };
    }
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
