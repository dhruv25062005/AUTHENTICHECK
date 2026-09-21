import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { randomBytes } from "node:crypto";
import { generateSerial } from "../utils/serial.js";

const router = Router();
const createSchema = z.object({
  productId: z.string().uuid(),
  batchCode: z.string().trim().min(2).max(80),
  manufacturingDate: z.string().date().optional(),
  quantity: z.number().int().min(1).max(5000),
  prefix: z.string().trim().regex(/^[A-Z0-9]{2,8}$/).default("AC")
});

router.get("/", requireAuth, requireRole("MANUFACTURER"), async (req: AuthenticatedRequest, res) => {
  try {
    const result = await db.query(
      `SELECT pb.id, pb.product_id AS "productId", pb.batch_code AS "batchCode",
              pb.manufacturing_date AS "manufacturingDate", pb.quantity, pb.created_at AS "createdAt",
              COALESCE((SELECT array_agg(s.serial_number) FROM (SELECT pi2.serial_number FROM product_instances pi2 WHERE pi2.batch_id = pb.id ORDER BY pi2.created_at LIMIT 20) s), '{}') AS "sampleSerials"
       FROM product_batches pb
       JOIN products p ON p.id = pb.product_id
       JOIN manufacturers m ON m.id = p.manufacturer_id
       LEFT JOIN product_instances pi ON pi.batch_id = pb.id
       WHERE m.user_id = $1
       GROUP BY pb.id
       ORDER BY pb.created_at DESC`,
      [req.user!.id]
    );
    res.json({ batches: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch batches" });
  }
});

router.post("/", requireAuth, requireRole("MANUFACTURER"), async (req: AuthenticatedRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid batch data", details: parsed.error.flatten() });
    return;
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const batch = await client.query(
      `INSERT INTO product_batches (product_id, batch_code, manufacturing_date, quantity)
       SELECT p.id, $2, $3, $4
       FROM products p
       JOIN manufacturers m ON m.id = p.manufacturer_id
       WHERE p.id = $1 AND m.user_id = $5 AND m.verification_status = 'VERIFIED'
       RETURNING id, product_id, batch_code, manufacturing_date, quantity, created_at`,
      [parsed.data.productId, parsed.data.batchCode, parsed.data.manufacturingDate ?? null, parsed.data.quantity, req.user!.id]
    );

    if (!batch.rows[0]) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Product not found or not owned by manufacturer" });
      return;
    }

    const generated: string[] = [];
    for (let i = 0; i < parsed.data.quantity; i++) {
      let inserted = false;
      for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
        const serial = generateSerial(parsed.data.prefix);
        const tokenHash = Buffer.from(randomBytes(32)).toString("hex");
        try {
          await client.query(
            `INSERT INTO product_instances (product_id, batch_id, serial_number, verification_token_hash)
             VALUES ($1, $2, $3, $4)`,
            [parsed.data.productId, batch.rows[0].id, serial, tokenHash]
          );
          generated.push(serial);
          inserted = true;
        } catch (error: unknown) {
          if ((error as { code?: string }).code !== "23505") throw error;
        }
      }
      if (!inserted) throw new Error("Unable to generate unique product serial");
    }

    await client.query("COMMIT");
    res.status(201).json({
      batch: batch.rows[0],
      instancesCreated: generated.length,
      sampleSerials: generated.slice(0, 10),
      allSerials: generated
    });
  } catch (error) {
    await client.query("ROLLBACK");
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      res.status(409).json({ error: "Batch code already exists for this product" });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "Failed to create batch" });
  } finally {
    client.release();
  }
});

export default router;
