import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { randomUUID } from "node:crypto";

const router = Router();

const reportSchema = z.object({
  serialNumber: z.string().trim().min(1).max(100),
  productName: z.string().trim().max(150).optional(),
  merchantName: z.string().trim().max(150).optional(),
  storeLocation: z.string().trim().max(200).optional(),
  reason: z.string().trim().min(5).max(3000),
  severity: z.enum(["LOW", "MEDIUM", "CRITICAL"]).default("MEDIUM")
});

router.get("/", requireAuth, async (_req, res) => {
  try {
    const result = await db.query(
      `SELECT r.id, r.serial_entered AS "serialNumber", r.reason, r.status,
              r.created_at AS "createdAt", r.reporter_user_id AS "reporterUserId",
              r.product_instance_id AS "productInstanceId"
       FROM reports r
       ORDER BY r.created_at DESC
       LIMIT 200`
    );
    res.json({ reports: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid report data", details: parsed.error.flatten() });
    return;
  }

  try {
    const instance = await db.query(
      "SELECT id FROM product_instances WHERE UPPER(serial_number) = $1 LIMIT 1",
      [parsed.data.serialNumber.toUpperCase()]
    );

    const report = await db.query(
      `INSERT INTO reports
       (id, product_instance_id, reporter_user_id, serial_entered, reason, status)
       VALUES ($1, $2, $3, $4, $5, 'OPEN')
       RETURNING id, serial_entered AS "serialNumber", status, created_at AS "createdAt"`,
      [
        randomUUID(),
        instance.rows[0]?.id ?? null,
        req.user?.id ?? null,
        parsed.data.serialNumber.toUpperCase(),
        JSON.stringify({
          reason: parsed.data.reason,
          productName: parsed.data.productName ?? null,
          merchantName: parsed.data.merchantName ?? null,
          storeLocation: parsed.data.storeLocation ?? null,
          severity: parsed.data.severity
        })
      ]
    );

    res.status(201).json({ success: true, reportId: report.rows[0].id, report: report.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to submit report" });
  }
});

export default router;
