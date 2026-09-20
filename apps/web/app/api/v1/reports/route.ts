import { NextResponse } from "next/server";
import { reports, verifyToken, persistStore, Report } from "../../store";
import { randomUUID } from "node:crypto";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const user = token ? verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allReports = Array.from(reports.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({ reports: allReports });
  } catch (err) {
    console.error("Reports fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch reports" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { serialNumber, productName, merchantName, storeLocation, reason, evidenceUrl, severity = "MEDIUM" } = body;

    if (!serialNumber || !reason) {
      return NextResponse.json({ error: "Serial number and reason are required" }, { status: 400 });
    }

    const reportId = randomUUID();
    const report: Report = {
      id: reportId,
      serialNumber: String(serialNumber).trim().toUpperCase(),
      productName: productName || "Unknown Product",
      merchantName: merchantName || "Unspecified Seller",
      storeLocation: storeLocation || "Online / Unknown",
      reason: String(reason).trim(),
      evidenceUrl,
      severity: severity === "CRITICAL" ? "CRITICAL" : severity === "LOW" ? "LOW" : "MEDIUM",
      status: "PENDING",
      createdAt: new Date().toISOString()
    };

    reports.set(reportId, report);
    persistStore();

    return NextResponse.json({
      success: true,
      reportId,
      message: "Counterfeit report submitted successfully to manufacturer security triage."
    });
  } catch (err) {
    console.error("Report error:", err);
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 });
  }
}
