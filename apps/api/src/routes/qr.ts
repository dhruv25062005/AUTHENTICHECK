import { Router } from "express";
import { randomBytes, createHash } from "node:crypto";
import { db } from "../db.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { createVerificationQr } from "../utils/qr.js";
import { env } from "../config/env.js";

const router = Router();

router.get("/instance/:instanceId", requireAuth, requireRole("MANUFACTURER"), async (req: AuthenticatedRequest, res) => {
  try {
    const instance = await db.query(
      `SELECT pi.id, pi.serial_number
       FROM product_instances pi
       JOIN products p ON p.id = pi.product_id
       JOIN manufacturers m ON m.id = p.manufacturer_id
       WHERE pi.id = $1 AND m.user_id = $2
       LIMIT 1`,
      [req.params.instanceId, req.user!.id]
    );

    if (!instance.rows[0]) {
      res.status(404).json({ error: "Product instance not found" });
      return;
    }

    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");

    await db.query(
      `UPDATE qr_codes SET revoked_at = NOW()
       WHERE product_instance_id = $1 AND revoked_at IS NULL`,
      [instance.rows[0].id]
    );

    await db.query(
      `INSERT INTO qr_codes (product_instance_id, token_hash)
       VALUES ($1, $2)`,
      [instance.rows[0].id, tokenHash]
    );

    const verificationUrl =
      `${env.PUBLIC_VERIFY_URL}/${encodeURIComponent(instance.rows[0].serial_number)}?token=${encodeURIComponent(rawToken)}`;

    res.json({
      serialNumber: instance.rows[0].serial_number,
      verificationUrl,
      qrDataUrl: await createVerificationQr(verificationUrl)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate QR" });
  }
});

router.get("/serial/:serial", requireAuth, requireRole("MANUFACTURER"), async (req: AuthenticatedRequest, res) => {
  try {
    const instance = await db.query(
      `SELECT pi.id
       FROM product_instances pi
       JOIN products p ON p.id = pi.product_id
       JOIN manufacturers m ON m.id = p.manufacturer_id
       WHERE pi.serial_number = $1 AND m.user_id = $2
       LIMIT 1`,
      [req.params.serial, req.user!.id]
    );
    if (!instance.rows[0]) {
      res.status(404).json({ error: "Product instance not found" });
      return;
    }
    req.params.instanceId = instance.rows[0].id;
    // Keep the implementation in one place.
    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    await db.query(`UPDATE qr_codes SET revoked_at = NOW() WHERE product_instance_id = $1 AND revoked_at IS NULL`, [instance.rows[0].id]);
    await db.query(`INSERT INTO qr_codes (product_instance_id, token_hash) VALUES ($1, $2)`, [instance.rows[0].id, tokenHash]);
    const verificationUrl = `${env.PUBLIC_VERIFY_URL}/${encodeURIComponent(req.params.serial)}?token=${encodeURIComponent(rawToken)}`;
    res.json({ serialNumber:req.params.serial, verificationUrl, qrDataUrl:await createVerificationQr(verificationUrl) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to generate QR" });
  }
});

export default router;
