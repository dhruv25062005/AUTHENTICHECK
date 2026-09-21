import { Router } from "express";
import { randomBytes, createHash } from "node:crypto";
import { db } from "../db.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { createVerificationQr } from "../utils/qr.js";
import { env } from "../config/env.js";

const router = Router();

async function issueQr(instanceId: string) {
  const instance = await db.query(
    `SELECT pi.id, pi.serial_number
     FROM product_instances pi
     JOIN products p ON p.id = pi.product_id
     JOIN manufacturers m ON m.id = p.manufacturer_id
     WHERE pi.id = $1
     LIMIT 1`,
    [instanceId]
  );
  if (!instance.rows[0]) return null;
  const lifecycle = await db.query("SELECT pi.status, m.verification_status FROM product_instances pi JOIN products p ON p.id = pi.product_id JOIN manufacturers m ON m.id = p.manufacturer_id WHERE pi.id = $1", [instanceId]);
  if (lifecycle.rows[0]?.verification_status !== "VERIFIED" || lifecycle.rows[0]?.status !== "ACTIVE") return null;
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  await db.query("UPDATE qr_codes SET revoked_at = NOW() WHERE product_instance_id = $1 AND revoked_at IS NULL", [instanceId]);
  await db.query("INSERT INTO qr_codes (product_instance_id, token_hash) VALUES ($1, $2)", [instanceId, tokenHash]);
  const verificationUrl = `${env.PUBLIC_VERIFY_URL}/${encodeURIComponent(instance.rows[0].serial_number)}?token=${encodeURIComponent(rawToken)}`;
  return { serialNumber: instance.rows[0].serial_number, verificationUrl, qrDataUrl: await createVerificationQr(verificationUrl) };
}



router.get("/instance/:instanceId", requireAuth, requireRole("MANUFACTURER"), async (req: AuthenticatedRequest, res) => {
  try {
    const owned = await db.query(
      `SELECT pi.id FROM product_instances pi
       JOIN products p ON p.id = pi.product_id
       JOIN manufacturers m ON m.id = p.manufacturer_id
       WHERE pi.id = $1 AND m.user_id = $2 AND m.verification_status = 'VERIFIED' LIMIT 1`,
      [req.params.instanceId, req.user!.id]
    );
    if (!owned.rows[0]) {
      res.status(404).json({ error: "Product instance not found" });
      return;
    }
    const result = await issueQr(String(Array.isArray(req.params.instanceId) ? req.params.instanceId[0] : req.params.instanceId));
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate QR" });
  }
});

router.get("/serial/:serial", requireAuth, requireRole("MANUFACTURER"), async (req: AuthenticatedRequest, res) => {
  try {
    const instance = await db.query(
      `SELECT pi.id FROM product_instances pi
       JOIN products p ON p.id = pi.product_id
       JOIN manufacturers m ON m.id = p.manufacturer_id
       WHERE UPPER(pi.serial_number) = UPPER($1) AND m.user_id = $2 AND m.verification_status = 'VERIFIED' LIMIT 1`,
      [String(Array.isArray(req.params.serial) ? req.params.serial[0] : req.params.serial), req.user!.id]
    );
    if (!instance.rows[0]) {
      res.status(404).json({ error: "Product instance not found" });
      return;
    }
    res.json(await issueQr(instance.rows[0].id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate QR" });
  }
});

export default router;
