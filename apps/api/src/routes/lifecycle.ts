import { Router } from "express";
import { z } from "zod";
import { db } from "../db.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

const lifecycleSchema = z.object({
  status: z.enum(["ACTIVE", "SOLD", "RECALLED", "BLOCKED", "STOLEN", "RETIRED"])
});

router.patch("/instances/:instanceId/status", requireAuth, requireRole("MANUFACTURER", "ADMIN"), async (req: AuthenticatedRequest, res) => {
  const parsed = lifecycleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid lifecycle status" });
    return;
  }

  try {
    const result = await db.query(
      `UPDATE product_instances pi
       SET status = $1::product_status
       FROM products p
       JOIN manufacturers m ON m.id = p.manufacturer_id
       WHERE pi.id = $2
         AND pi.product_id = p.id
         AND ($3 = 'ADMIN' OR m.user_id = $4)
       RETURNING pi.id, pi.serial_number AS "serialNumber", pi.status`,
      [parsed.data.status, req.params.instanceId, req.user!.role, req.user!.id]
    );

    if (!result.rows[0]) {
      res.status(404).json({ error: "Product instance not found or not accessible" });
      return;
    }

    await db.query(
      `INSERT INTO audit_logs (actor_user_id, action, resource_type, resource_id, outcome, metadata)
       VALUES ($1, 'INSTANCE_STATUS_CHANGED', 'product_instance', $2, 'SUCCESS', $3::jsonb)`,
      [req.user!.id, req.params.instanceId, JSON.stringify({ status: parsed.data.status })]
    );

    res.json({ instance: result.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update product lifecycle status" });
  }
});

export default router;
