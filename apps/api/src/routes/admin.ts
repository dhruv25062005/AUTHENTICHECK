import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

const statusSchema = z.object({
  status: z.enum(["PENDING", "VERIFIED", "REJECTED"])
});

const reportStatusSchema = z.object({
  status: z.enum(["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"])
});

router.get("/manufacturers", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  try {
    const result = await db.query(
      `SELECT m.id, m.user_id AS "userId", m.organization_name AS "organizationName",
              m.verification_status AS "verificationStatus", m.created_at AS "createdAt",
              u.email, u.full_name AS "fullName"
       FROM manufacturers m
       JOIN users u ON u.id = m.user_id
       ORDER BY m.created_at DESC`
    );
    res.json({ manufacturers: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load manufacturers" });
  }
});

router.patch("/manufacturers/:manufacturerId", requireAuth, requireRole("ADMIN"), async (req: AuthenticatedRequest, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid verification status" });
    return;
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE manufacturers
       SET verification_status = $1
       WHERE id = $2
       RETURNING id, user_id AS "userId", organization_name AS "organizationName",
                 verification_status AS "verificationStatus"`,
      [parsed.data.status, req.params.manufacturerId]
    );

    if (!result.rows[0]) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Manufacturer not found" });
      return;
    }

    await client.query(
      `INSERT INTO audit_logs
       (actor_user_id, action, resource_type, resource_id, outcome, metadata)
       VALUES ($1, 'MANUFACTURER_VERIFICATION_CHANGED', 'manufacturer', $2, 'SUCCESS', $3::jsonb)`,
      [req.user!.id, req.params.manufacturerId, JSON.stringify({ status: parsed.data.status })]
    );

    await client.query("COMMIT");
    res.json({ manufacturer: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Failed to update manufacturer verification" });
  } finally {
    client.release();
  }
});

router.get("/audit-logs", requireAuth, requireRole("ADMIN"), async (_req, res) => {
  try {
    const result = await db.query(
      `SELECT a.id, a.action, a.resource_type AS "resourceType",
              a.resource_id AS "resourceId", a.outcome, a.metadata,
              a.created_at AS "createdAt", u.email AS "actorEmail"
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.actor_user_id
       ORDER BY a.created_at DESC
       LIMIT 200`
    );
    res.json({ logs: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load audit logs" });
  }
});

router.patch("/reports/:reportId", requireAuth, requireRole("ADMIN"), async (req: AuthenticatedRequest, res) => {
  const parsed = reportStatusSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid report status" });
    return;
  }
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE reports SET status = $1::report_status
       WHERE id = $2
       RETURNING id, status, created_at AS "createdAt"`,
      [parsed.data.status, req.params.reportId]
    );
    if (!result.rows[0]) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Report not found" });
      return;
    }
    await client.query(
      `INSERT INTO audit_logs
       (actor_user_id, action, resource_type, resource_id, outcome, metadata)
       VALUES ($1, 'REPORT_STATUS_CHANGED', 'report', $2, 'SUCCESS', $3::jsonb)`,
      [req.user!.id, req.params.reportId, JSON.stringify({ status: parsed.data.status })]
    );
    await client.query("COMMIT");
    res.json({ report: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Failed to update report" });
  } finally {
    client.release();
  }
});

export default router;
