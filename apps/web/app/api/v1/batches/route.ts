import { NextResponse } from "next/server";
import { batches, products, instances, verifyToken, persistStore, Batch } from "../../store";
import { randomUUID } from "node:crypto";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const user = token ? verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const batchId = searchParams.get("batchId");

    let batchList = Array.from(batches.values());
    if (productId) {
      batchList = batchList.filter((b) => b.productId === productId);
    }
    if (batchId) {
      batchList = batchList.filter((b) => b.id === batchId);
    }

    return NextResponse.json({ batches: batchList });
  } catch (err) {
    console.error("Batch fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch batches" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    const user = token ? verifyToken(token) : null;

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { productId, batchCode, manufacturingDate, quantity = 25, prefix = "AC" } = body;

    if (!productId || !batchCode) {
      return NextResponse.json({ error: "Product and Batch code are required" }, { status: 400 });
    }

    const product = products.get(productId);
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const batchId = randomUUID();
    const cleanQuantity = Math.min(Math.max(1, Number(quantity)), 500);

    // Generate instances
    const allGeneratedSerials: string[] = [];
    const sampleSerials: string[] = [];
    const cleanPrefix = (prefix || "AC").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6) || "AC";
    const nowIso = new Date().toISOString();

    for (let i = 0; i < cleanQuantity; i++) {
      const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
      const serial = `${cleanPrefix}-${randomSuffix}`;
      allGeneratedSerials.push(serial);
      instances.set(serial, {
        id: randomUUID(),
        productId,
        serialNumber: serial,
        status: "ACTIVE",
        scanCount: 0,
        batchCode: String(batchCode).trim().toUpperCase(),
        createdAt: nowIso
      });
      if (sampleSerials.length < 10) {
        sampleSerials.push(serial);
      }
    }

    const newBatch: Batch = {
      id: batchId,
      productId,
      batchCode: String(batchCode).trim().toUpperCase(),
      manufacturingDate: manufacturingDate || nowIso.split("T")[0],
      quantity: cleanQuantity,
      createdAt: nowIso,
      sampleSerials: allGeneratedSerials
    };

    batches.set(batchId, newBatch);

    // Update product totals
    product.batchCount += 1;
    product.instanceCount += cleanQuantity;

    persistStore();

    return NextResponse.json(
      {
        batch: newBatch,
        instancesCreated: cleanQuantity,
        sampleSerials,
        allSerials: allGeneratedSerials
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Batch creation error:", err);
    return NextResponse.json({ error: "Failed to create batch" }, { status: 500 });
  }
}
