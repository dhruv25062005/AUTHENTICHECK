import { Router } from "express";
import { db } from "../db.js";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

function calculateRisk(scanCount: number, status: string) {
  if (status !== "ACTIVE") return { score: 95, label: "HIGH_RISK" as const };
  if (scanCount >= 20) return { score: 70, label: "SUSPICIOUS" as const };
  if (scanCount >= 10) return { score: 45, label: "SUSPICIOUS" as const };
  return { score: 5, label: "GENUINE" as const };
}

router.get("/:serial", async (req, res) => {
  const serial = req.params.serial.trim();

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
        m.organization_name
       FROM product_instances pi
       JOIN products p ON p.id = pi.product_id
       JOIN manufacturers m ON m.id = p.manufacturer_id
       WHERE pi.serial_number = $1
       LIMIT 1`,
      [serial]
    );

    if (!product.rows[0]) {
      await client.query(
        `INSERT INTO scans (serial_entered, scan_method, status, risk_score)
         VALUES ($1, 'SERIAL', 'HIGH_RISK', 100)`,
        [serial]
      );
      await client.query("COMMIT");
      res.status(404).json({
        status: "HIGH_RISK",
        riskScore: 100,
        reasons: ["Product serial number was not found in the registered product database."]
      });
      return;
    }

    const item = product.rows[0];

    const countResult = await client.query(
      "SELECT COUNT(*)::int AS count FROM scans WHERE product_instance_id = $1",
      [item.instance_id]
    );

    const previousScans = countResult.rows[0].count as number;
    const risk = calculateRisk(previousScans, item.instance_status);

    const scan = await client.query(
      `INSERT INTO scans
       (product_instance_id, serial_entered, scan_method, status, risk_score)
       VALUES ($1, $2, 'SERIAL', $3::verification_status, $4)
       RETURNING id, created_at`,
      [item.instance_id, serial, risk.label, risk.score]
    );

    await client.query(
      `INSERT INTO risk_assessments
       (scan_id, identity_score, behavior_score, history_score, final_score, reasons, rules_version)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'rules-v1')`,
      [
        scan.rows[0].id,
        item.instance_status === "ACTIVE" ? 0 : 100,
        previousScans >= 10 ? 80 : 0,
        Math.min(previousScans * 2, 100),
        risk.score,
        JSON.stringify(
          item.instance_status !== "ACTIVE"
            ? ["Product instance is blocked or retired."]
            : previousScans >= 10
              ? ["This product identity has an unusually high number of previous scans."]
              : ["Registered product identity found.", "No major scan-history anomaly detected."]
        )
      ]
    );

    await client.query("COMMIT");

    res.json({
      status: risk.label,
      riskScore: risk.score,
      product: {
        name: item.name,
        brand: item.brand,
        category: item.category,
        manufacturer: item.organization_name,
        serialNumber: item.serial_number
      },
      history: {
        previousScans
      },
      reasons: item.instance_status !== "ACTIVE"
        ? ["Product instance is blocked or retired."]
        : previousScans >= 10
          ? ["This product identity has an unusually high number of previous scans."]
          : ["Registered product identity found.", "No major scan-history anomaly detected."]
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
