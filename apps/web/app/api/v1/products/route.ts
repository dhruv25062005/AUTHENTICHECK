import { NextResponse } from "next/server";
import { products, verifyToken, persistStore } from "../../store";
import { randomUUID } from "node:crypto";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = verifyToken(token);
    if (!user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const allProducts = Array.from(products.values())
      .filter(p => p.userId === user.id || p.userId === "user-demo-manufacturer-1")
      .map(p => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        description: p.description,
        created_at: p.createdAt,
        instance_count: p.instanceCount,
        batch_count: p.batchCount
      }));

    return NextResponse.json({ products: allProducts });
  } catch (err) {
    console.error("Fetch products error:", err);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
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
    const { name, brand, category, description } = body;

    if (!name || !brand || !category) {
      return NextResponse.json({ error: "Missing product fields" }, { status: 400 });
    }

    const newProduct = {
      id: randomUUID(),
      userId: user.id,
      name: name.trim(),
      brand: brand.trim(),
      category: category.trim(),
      description: description?.trim() || "",
      createdAt: new Date().toISOString(),
      batchCount: 1,
      instanceCount: 100
    };

    products.set(newProduct.id, newProduct);
    persistStore();

    return NextResponse.json(
      {
        product: {
          id: newProduct.id,
          name: newProduct.name,
          brand: newProduct.brand,
          category: newProduct.category,
          description: newProduct.description,
          created_at: newProduct.createdAt
        }
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Create product error:", err);
    return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
  }
}
