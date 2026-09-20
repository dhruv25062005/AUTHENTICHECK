import { Router } from "express";
import { db } from "../db.js";
import { requireAuth, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";

const router = Router();

router.get("/", requireAuth, requireRole("MANUFACTURER"), async (req: AuthenticatedRequest, res) => {
  try {
    const owner = [req.user!.id];
    const [products, instances, reports, scans, statuses] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS count FROM products p JOIN manufacturers m ON m.id=p.manufacturer_id WHERE m.user_id=$1`, owner),
      db.query(`SELECT COUNT(*)::int AS count FROM product_instances pi JOIN products p ON p.id=pi.product_id JOIN manufacturers m ON m.id=p.manufacturer_id WHERE m.user_id=$1`, owner),
      db.query(`SELECT COUNT(*)::int AS count FROM reports r JOIN product_instances pi ON pi.id=r.product_instance_id JOIN products p ON p.id=pi.product_id JOIN manufacturers m ON m.id=p.manufacturer_id WHERE m.user_id=$1`, owner),
      db.query(`SELECT COUNT(*)::int AS count FROM scans s JOIN product_instances pi ON pi.id=s.product_instance_id JOIN products p ON p.id=pi.product_id JOIN manufacturers m ON m.id=p.manufacturer_id WHERE m.user_id=$1`, owner),
      db.query(`SELECT status, COUNT(*)::int AS count FROM scans s JOIN product_instances pi ON pi.id=s.product_instance_id JOIN products p ON p.id=pi.product_id JOIN manufacturers m ON m.id=p.manufacturer_id WHERE m.user_id=$1 GROUP BY status`, owner)
    ]);

    const counts = Object.fromEntries(statuses.rows.map((r) => [r.status, Number(r.count)]));
    const totalScans = Number(scans.rows[0].count);
    const genuine = counts.GENUINE ?? 0;
    const suspicious = counts.SUSPICIOUS ?? 0;
    const highRisk = counts.HIGH_RISK ?? 0;

    const recent = await db.query(
      `SELECT s.id, s.serial_entered AS "serialNumber", s.status, s.risk_score AS "riskScore",
              s.created_at AS timestamp
       FROM scans s
       JOIN product_instances pi ON pi.id=s.product_instance_id
       JOIN products p ON p.id=pi.product_id
       JOIN manufacturers m ON m.id=p.manufacturer_id
       WHERE m.user_id=$1
       ORDER BY s.created_at DESC LIMIT 20`,
      owner
    );

    res.json({
      metrics: {
        totalProducts: Number(products.rows[0].count),
        totalInstances: Number(instances.rows[0].count),
        totalReports: Number(reports.rows[0].count),
        totalScans,
        genuinePercentage: totalScans ? Math.round(genuine / totalScans * 100) : 0,
        suspiciousPercentage: totalScans ? Math.round(suspicious / totalScans * 100) : 0,
        highRiskPercentage: totalScans ? Math.round(highRisk / totalScans * 100) : 0
      },
      recentScans: recent.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load analytics" });
  }
});

export default router;
