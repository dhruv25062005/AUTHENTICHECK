import { NextResponse } from "next/server";
import { instances, products } from "../../../store";

export async function GET(
  _req: Request,
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
      return NextResponse.json(
        {
          status: "HIGH_RISK",
          riskScore: 100,
          reasons: ["Product serial number was not found in the registered product database."]
        },
        { status: 404 }
      );
    }

    // Increment scan count for behavior tracking
    instance.scanCount += 1;
    const previousScans = instance.scanCount - 1;

    const product = products.get(instance.productId);
    const productName = product?.name || "AuthentiCheck Verified Item";
    const brandName = product?.brand || "Authentic Goods";
    const categoryName = product?.category || "Registered Goods";

    let riskScore = 5;
    let status: "GENUINE" | "SUSPICIOUS" | "HIGH_RISK" = "GENUINE";
    const reasons: string[] = [];

    if (instance.status !== "ACTIVE") {
      riskScore = 95;
      status = "HIGH_RISK";
      reasons.push("Product instance is blocked or retired.");
    } else if (previousScans >= 20) {
      riskScore = 70;
      status = "SUSPICIOUS";
      reasons.push("This product identity has an unusually high number of previous scans.");
    } else if (previousScans >= 10) {
      riskScore = 45;
      status = "SUSPICIOUS";
      reasons.push("This product identity has elevated historical scan activity.");
    } else {
      riskScore = 5;
      status = "GENUINE";
      reasons.push("Registered product identity found.");
      reasons.push("No major scan-history anomaly detected.");
    }

    return NextResponse.json({
      status,
      riskScore,
      product: {
        name: productName,
        brand: brandName,
        category: categoryName,
        manufacturer: "Apex Manufacturing Global",
        serialNumber: instance.serialNumber
      },
      history: {
        previousScans
      },
      reasons
    });
  } catch (err) {
    console.error("Verification route error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
