import { Router } from "express";
import { createHash } from "node:crypto";
import { db } from "../db.js";
import { env } from "../config/env.js";
import { assessRisk } from "../services/riskEngine.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = Router();

function getClientIp(req: { headers: Record<string, unknown>; ip?: string }) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0].trim();
  return req.ip ?? null;
}

router.get("/:serial", rateLimit({ windowMs: 60_000, max: 60, keyPrefix: "verify" }), async (req, res) => {
  const serial = String(req.params.serial || "").trim().toUpperCase();
  const qrToken = typeof req.query.token === "string" ? req.query.token.trim() : "";

  if (qrToken && (qrToken.length < 32 || qrToken.length > 200)) {
    res.status(400).json({ error: "Invalid verification credential" });
    return;
  }

  if (!serial || serial.length > 100) {
    res.status(400).json({ error: "Invalid serial number" });
    return;
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const product = await client.query(
      `SELECT
        pi.id AS instance_id,
        pi.serial_number,
        pi.status AS instance_status,
        p.id AS product_id,
        p.name,
        p.brand,
        p.category,
        p.created_at AS product_created_at,
        pb.batch_code,
        pb.manufacturing_date,
        m.organization_name
       FROM product_instances pi
       JOIN products p ON p.id = pi.product_id
       JOIN manufacturers m ON m.id = p.manufacturer_id
       LEFT JOIN product_batches pb ON pb.id = pi.batch_id
       WHERE UPPER(pi.serial_number) = $1
       LIMIT 1`,
      [serial]
    );

    if (!product.rows[0]) {
      await client.query(
        `INSERT INTO scans (serial_entered, scan_method, status, risk_score)
         VALUES ($1, 'SERIAL'::text, 'HIGH_RISK'::verification_status, 100)`,
        [serial]
      );
      await client.query("COMMIT");
      res.status(404).json({
        status: "HIGH_RISK",
        riskScore: 100,
        reasons: ["Product serial number was not found in the registered manufacturer ledger."],
        serial
      });
      return;
    }

    const item = product.rows[0];

    if (qrToken) {
      const tokenHash = createHash("sha256").update(qrToken).digest("hex");
      const qr = await client.query(
        `SELECT id FROM qr_codes
         WHERE product_instance_id = $1
           AND token_hash = $2
           AND revoked_at IS NULL
         LIMIT 1`,
        [item.instance_id, tokenHash]
      );
      if (!qr.rows[0]) {
        await client.query("ROLLBACK");
        res.status(401).json({
          status: "HIGH_RISK",
          riskScore: 100,
          reasons: ["The QR verification credential is invalid or has been revoked."],
          serial
        });
        return;
      }
      await client.query("UPDATE qr_codes SET last_used_at = NOW() WHERE id = $1", [qr.rows[0].id]);
    }

    const countResult = await client.query(
      "SELECT COUNT(*)::int AS count FROM scans WHERE product_instance_id = $1",
      [item.instance_id]
    );
    const previousScans = Number(countResult.rows[0].count);

    const clientIp = getClientIp(req);
    const ipHash = clientIp ? createHash("sha256").update(env.JWT_ACCESS_SECRET + ":" + clientIp).digest("hex") : null;
    const deviceHash = req.headers["user-agent"] ? createHash("sha256").update(env.JWT_ACCESS_SECRET + ":" + String(req.headers["user-agent"])).digest("hex") : null;

    const velocityResult = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM scans
       WHERE product_instance_id = $1
         AND created_at >= NOW() - INTERVAL '10 minutes'`,
      [item.instance_id]
    );
    const recentScanVelocity = Number(velocityResult.rows[0].count);

    const distinctIpResult = await client.query("SELECT COUNT(DISTINCT ip_hash)::int AS count FROM scans WHERE product_instance_id = $1 AND ip_hash IS NOT NULL", [item.instance_id]);
    const distinctIpCount = Number(distinctIpResult.rows[0].count);

    const reportResult = await client.query(
      `SELECT COUNT(*)::int AS count
       FROM reports
       WHERE product_instance_id = $1
         AND status IN ('OPEN', 'INVESTIGATING')`,
      [item.instance_id]
    );

    const risk = assessRisk({
      identityValid: true,
      instanceActive: item.instance_status === "ACTIVE",
      lifecycleStatus: item.instance_status,
      previousScans,
      recentScanVelocity,
      reportCount: Number(reportResult.rows[0].count)
    });

    const scanMethod = qrToken ? "QR" : "SERIAL";
    const scan = await client.query(
      `INSERT INTO scans
       (product_instance_id, serial_entered, scan_method, ip_hash, device_hash, status, risk_score)
       VALUES ($1, $2, $3, $4, $5, $6::verification_status, $7)
       RETURNING id, created_at`,
      [item.instance_id, serial, scanMethod, ipHash, deviceHash, risk.label, risk.score]
    );

    await client.query(
      `INSERT INTO risk_assessments
       (scan_id, identity_score, behavior_score, history_score, report_score, final_score, reasons, rules_version)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'rules-v3')`,
      [
        scan.rows[0].id,
        item.instance_status === "ACTIVE" ? 100 : 0,
        Math.max(0, 100 - Math.min(recentScanVelocity * 15, 100)),
        Math.max(0, 100 - Math.min(previousScans * 2, 100)),
        Math.max(0, 100 - Math.min(Number(reportResult.rows[0].count) * 20, 100)),
        risk.score,
        JSON.stringify(risk.reasons)
      ]
    );

    await client.query("COMMIT");

    res.json({
      status: risk.label,
      riskScore: risk.score,
      product: {
        id: item.product_id,
        name: item.name,
        brand: item.brand,
        category: item.category,
        manufacturer: item.organization_name,
        serialNumber: item.serial_number,
        registeredAt: item.product_created_at,
        batchCode: item.batch_code,
        manufacturingDate: item.manufacturing_date,
        lifecycleStatus: item.instance_status
      },
      history: {
        previousScans,
        recentScanVelocity,
        distinctScanSources: distinctIpCount
      },
      reasons: risk.reasons,
      verifiedAt: scan.rows[0].created_at
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ error: "Verification failed" });
  } finally {
    client.release();
  }
});

export default router;
