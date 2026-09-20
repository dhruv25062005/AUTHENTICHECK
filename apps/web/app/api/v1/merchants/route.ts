import { NextResponse } from "next/server";
import { merchants, advisories, type AuthorizedMerchant } from "../../store";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.toLowerCase().trim() || "";

    // Deduplicate merchants by their unique ID to guarantee distinct items
    const merchantMapById = new Map<string, AuthorizedMerchant>();
    for (const m of merchants.values()) {
      if (m && m.id && !merchantMapById.has(m.id)) {
        merchantMapById.set(m.id, m);
      }
    }
    const allMerchants = Array.from(merchantMapById.values());
    const allAdvisories = Array.from(advisories.values());

    if (!query) {
      return NextResponse.json({
        merchants: allMerchants,
        advisories: allAdvisories
      });
    }

    const filtered = allMerchants.filter((m) => {
      return (
        m.name.toLowerCase().includes(query) ||
        m.domainOrSlug.toLowerCase().includes(query) ||
        m.category.toLowerCase().includes(query) ||
        m.authorizedBrands.some((b) => b.toLowerCase().includes(query))
      );
    });

    return NextResponse.json({
      query,
      merchants: filtered,
      advisories: allAdvisories.filter((a) =>
        a.productName.toLowerCase().includes(query) ||
        a.brand.toLowerCase().includes(query) ||
        a.headline.toLowerCase().includes(query)
      )
    });
  } catch (err) {
    console.error("Merchants API error:", err);
    return NextResponse.json({ error: "Failed to query merchants" }, { status: 500 });
  }
}
