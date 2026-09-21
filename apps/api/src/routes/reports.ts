import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = Router();

const reportSchema = z.object({
  serialNumber: z.string().trim().min(1).max(100),
  productName: z.string().trim().max(150).optional(),
  merchantName: z.string().trim().max(150).optional(),
  storeLocation: z.string().trim().max(200).optional(),
  reason: z.string().trim().min(5).max(3000),
  severity: z.enum(["LOW", "MEDIUM", "CRITICAL"]).default("MEDIUM"),
  evidenceUrl: z.string().url().max(2048).optional()
});

router.get("/", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await db.query(
      `SELECT r.id, pi.serial_number AS "serialNumber", r.reason, r.status,
              r.created_at AS "createdAt", r.reporter_user_id AS "reporterUserId",
              r.product_instance_id AS "productInstanceId"
       FROM reports r
       LEFT JOIN product_instances pi ON pi.id = r.product_instance_id
       LEFT JOIN products p ON p.id = pi.product_id
       LEFT JOIN manufacturers m ON m.id = p.manufacturer_id
       WHERE $1 = 'ADMIN' OR m.user_id = $2
       ORDER BY r.created_at DESC
       LIMIT 200`,
      [req.user!.role, req.user!.id]
    );
    res.json({ reports: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

router.post("/", rateLimit({ windowMs: 15 * 60_000, max: 10, keyPrefix: "report" }), async (req: AuthenticatedRequest, res) => {
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

    const evidence = parsed.data.evidenceUrl ? [parsed.data.evidenceUrl] : [];
    const reason = JSON.stringify({
      text: parsed.data.reason,
      productName: parsed.data.productName ?? null,
      merchantName: parsed.data.merchantName ?? null,
      storeLocation: parsed.data.storeLocation ?? null,
      severity: parsed.data.severity
    });

    const report = await db.query(
      `INSERT INTO reports (product_instance_id, reporter_user_id, reason, evidence_urls, status)
       VALUES ($1, $2, $3, $4::jsonb, 'OPEN')
       RETURNING id, status, created_at AS "createdAt"`,
      [instance.rows[0]?.id ?? null, req.user?.id ?? null, reason, JSON.stringify(evidence)]
    );

    res.status(201).json({ success: true, reportId: report.rows[0].id, report: report.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to submit report" });
  }
});

export default router;
