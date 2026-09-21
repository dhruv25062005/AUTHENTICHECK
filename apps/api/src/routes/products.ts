import { Router } from "express";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { db } from "../db.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { generateSerial } from "../utils/serial.js";

const router = Router();

const productSchema = z.object({
  name: z.string().trim().min(2).max(150),
  brand: z.string().trim().min(2).max(100),
  category: z.string().trim().min(2).max(100),
  description: z.string().trim().max(2000).optional()
});

const batchSchema = z.object({
  batchCode: z.string().trim().min(2).max(80),
  manufacturingDate: z.string().date().optional(),
  quantity: z.number().int().min(1).max(5000)
});

const instanceSchema = z.object({
  quantity: z.number().int().min(1).max(5000),
  prefix: z.string().trim().regex(/^[A-Z0-9]{2,8}$/).default("AC")
});

router.post("/", requireAuth, requireRole("MANUFACTURER"), async (req: AuthenticatedRequest, res) => {
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid product data", details: parsed.error.flatten() });
    return;
  }

  try {
    const manufacturer = await db.query(
      "SELECT id, verification_status FROM manufacturers WHERE user_id = $1 LIMIT 1",
      [req.user!.id]
    );

    if (!manufacturer.rows[0]) {
      res.status(403).json({ error: "Manufacturer profile not found" });
      return;
    }

    if (manufacturer.rows[0].verification_status !== "VERIFIED") {
      res.status(403).json({ error: "Manufacturer verification is required before creating products" });
      return;
    }

    const result = await db.query(
      `INSERT INTO products (manufacturer_id, name, brand, category, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, brand, category, description, created_at`,
      [
        manufacturer.rows[0].id,
        parsed.data.name,
        parsed.data.brand,
        parsed.data.category,
        parsed.data.description ?? null
      ]
    );

    res.status(201).json({ product: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create product" });
  }
});

router.post("/:productId/batches", requireAuth, requireRole("MANUFACTURER"), async (req: AuthenticatedRequest, res) => {
  const parsed = batchSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid batch data", details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await db.query(
      `INSERT INTO product_batches (product_id, batch_code, manufacturing_date, quantity)
       SELECT p.id, $2, $3, $4
       FROM products p
       JOIN manufacturers m ON m.id = p.manufacturer_id
       WHERE p.id = $1 AND m.user_id = $5
       RETURNING id, product_id, batch_code, manufacturing_date, quantity, created_at`,
      [
        req.params.productId,
        parsed.data.batchCode,
        parsed.data.manufacturingDate ?? null,
        parsed.data.quantity,
        req.user!.id
      ]
    );

    if (!result.rows[0]) {
      res.status(404).json({ error: "Product not found or not owned by manufacturer" });
      return;
    }

    res.status(201).json({ batch: result.rows[0] });
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      res.status(409).json({ error: "Batch code already exists for this product" });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Failed to create batch" });
  }
});

router.post("/:productId/batches/:batchId/instances", requireAuth, requireRole("MANUFACTURER"), async (req: AuthenticatedRequest, res) => {
  const parsed = instanceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid instance generation request", details: parsed.error.flatten() });
    return;
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const owned = await client.query(
      `SELECT pb.id
       FROM product_batches pb
       JOIN products p ON p.id = pb.product_id
       JOIN manufacturers m ON m.id = p.manufacturer_id
       WHERE pb.id = $1 AND p.id = $2 AND m.user_id = $3
       LIMIT 1`,
      [req.params.batchId, req.params.productId, req.user!.id]
    );

    if (!owned.rows[0]) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Batch not found or not owned by manufacturer" });
      return;
    }

    const instances: Array<{ id: string; serialNumber: string }> = [];

    for (let i = 0; i < parsed.data.quantity; i++) {
      let created = false;

      for (let attempt = 0; attempt < 5 && !created; attempt++) {
        const serial = generateSerial(parsed.data.prefix);
        const rawToken = randomBytes(32).toString("base64url");
        const tokenHash = createHash("sha256").update(rawToken).digest("hex");

        try {
          const result = await client.query(
            `INSERT INTO product_instances
             (product_id, batch_id, serial_number, verification_token_hash)
             VALUES ($1, $2, $3, $4)
             RETURNING id, serial_number`,
            [req.params.productId, req.params.batchId, serial, tokenHash]
          );

          instances.push({
            id: result.rows[0].id,
            serialNumber: result.rows[0].serial_number
          });
          created = true;
        } catch (error: unknown) {
          if ((error as { code?: string }).code !== "23505") throw error;
        }
      }

      if (!created) throw new Error("Unable to generate a unique serial");
    }

    await client.query("COMMIT");
    res.status(201).json({
      count: instances.length,
      instances
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Failed to generate product instances" });
  } finally {
    client.release();
  }
});

router.get("/", requireAuth, requireRole("MANUFACTURER"), async (req: AuthenticatedRequest, res) => {
  try {
    const result = await db.query(
      `SELECT p.id, p.name, p.brand, p.category, p.description, p.created_at,
              COUNT(DISTINCT pi.id)::int AS instance_count,
              COUNT(DISTINCT pb.id)::int AS batch_count
       FROM products p
       JOIN manufacturers m ON m.id = p.manufacturer_id
       LEFT JOIN product_instances pi ON pi.product_id = p.id
       LEFT JOIN product_batches pb ON pb.product_id = p.id
       WHERE m.user_id = $1
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [req.user!.id]
    );

    res.json({ products: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

export default router;
