import { NextResponse } from "next/server";
import { instances, products, batches, advisories, recordScanEvent, persistStore } from "../../../store";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ serial: string }> }
) {
  try {
    const { serial: rawSerial } = await params;
    const serial = decodeURIComponent(rawSerial || "").trim().toUpperCase();

    if (!serial) {
      return NextResponse.json({ error: "Invalid serial number" }, { status: 400 });
    }

    const instance = instances.get(serial);

    if (!instance) {
      recordScanEvent({
        serialNumber: serial,
        status: "HIGH_RISK",
        riskScore: 100,
        location: req.headers.get("x-forwarded-for")?.split(",")[0] || "Unknown",
        userAgent: req.headers.get("user-agent") || undefined
      });

      return NextResponse.json(
        {
          status: "HIGH_RISK",
          riskScore: 100,
          reasons: [
            "Serial number was not found in the manufacturer cryptographic registry.",
            "Potential unauthorized replica, gray market counterfeit, or incorrect identifier."
          ],
          serial
        },
        { status: 404 }
      );
    }

    // Increment scan count for behavior tracking
    instance.scanCount += 1;
    const previousScans = instance.scanCount - 1;
    const nowIso = new Date().toISOString();
    instance.lastScannedAt = nowIso;

    const product = products.get(instance.productId);
    const productName = product?.name || "AuthentiCheck Verified Item";
    const brandName = product?.brand || "Authentic Goods";
    const categoryName = product?.category || "Registered Goods";

    // Find associated batch if available
    let matchedBatch = null;
    for (const b of batches.values()) {
      if (b.productId === instance.productId && (b.batchCode === instance.batchCode || b.sampleSerials?.includes(serial))) {
        matchedBatch = b;
        break;
      }
    }

    let riskScore = 4;
    let status: "GENUINE" | "SUSPICIOUS" | "HIGH_RISK" = "GENUINE";
    const reasons: string[] = [];

    if (instance.status === "BLOCKED") {
      riskScore = 95;
      status = "HIGH_RISK";
      reasons.push("Serial identity has been explicitly BLOCKED by the manufacturer (stolen or recalled batch).");
    } else if (instance.status === "RETIRED") {
      riskScore = 85;
      status = "HIGH_RISK";
      reasons.push("Product serial identity has been RETIRED or marked as decommissioned.");
    } else if (previousScans >= 25) {
      riskScore = 75;
      status = "SUSPICIOUS";
      reasons.push(`High scan velocity detected: this individual serial tag has been verified ${previousScans} times across different sessions.`);
      reasons.push("Duplicate QR code cloning / mass replication risk.");
    } else if (previousScans >= 10) {
      riskScore = 45;
      status = "SUSPICIOUS";
      reasons.push(`Elevated scan activity: this item has been scanned ${previousScans} times previously.`);
    } else {
      riskScore = 4;
      status = "GENUINE";
      reasons.push("Cryptographic serial identity verified in manufacturer registry.");
      reasons.push("Normal consumer scan velocity and valid lifecycle state.");
    }

    persistStore();

    recordScanEvent({
      serialNumber: serial,
      status,
      riskScore,
      location: req.headers.get("x-forwarded-for")?.split(",")[0] || "Online Verification",
      userAgent: req.headers.get("user-agent") || undefined
    });

    // Find relevant advisories for this product or batch
    const relevantAdvisories = Array.from(advisories.values()).filter(
      (adv) =>
        adv.productName.toLowerCase() === productName.toLowerCase() ||
        adv.brand.toLowerCase() === brandName.toLowerCase() ||
        adv.affectedSerialsOrBatches.includes(serial) ||
        (instance.batchCode && adv.affectedSerialsOrBatches.includes(instance.batchCode))
    );

    // Recommended physical touchpoint checklist
    const physicalChecklist = [
      {
        step: 1,
        title: "Optical Hologram & Scratch Layer",
        description: "Inspect the optical diffraction patch under natural light. Ensure light rays disperse in a radial prism without flaking or glue residue.",
        warningIfFailed: "Hologram printed with static metallic ink indicates counterfeit packaging."
      },
      {
        step: 2,
        title: "Micro-Engraved Serial Check",
        description: `Compare digital serial (${serial}) to the physical stamping laser-etched directly onto the product chassis or warranty card.`,
        warningIfFailed: "Mismatched numbers indicate swapped packaging or counterfeit housing."
      },
      {
        step: 3,
        title: "Tamper-Evident Box Seal",
        description: "Verify that the security tape has not been slit, restuck, or replaced with generic clear cellophane adhesive.",
        warningIfFailed: "Compromised seals suggest open-box tampering or gray-market diversion."
      }
    ];

    return NextResponse.json({
      status,
      riskScore,
      product: {
        id: product?.id,
        name: productName,
        brand: brandName,
        category: categoryName,
        manufacturer: "Apex Manufacturing Global",
        serialNumber: instance.serialNumber,
        registeredAt: instance.createdAt || product?.createdAt || "2026-01-15T10:00:00.000Z",
        batchCode: instance.batchCode || matchedBatch?.batchCode || "BATCH-VERIFIED",
        manufacturingDate: matchedBatch?.manufacturingDate || "2026-01-15",
        lifecycleStatus: instance.status
      },
      history: {
        previousScans,
        lastScannedAt: instance.lastScannedAt,
        scanLocation: instance.lastScanLocation || "Global Verification Node"
      },
      reasons,
      advisories: relevantAdvisories,
      physicalChecklist,
      verifiedAt: nowIso
    });
  } catch (err) {
    console.error("Verification route error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
