import { NextResponse } from "next/server";
import QRCode from "qrcode";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const serial = searchParams.get("serial") || "AC-DEMO-001";
    const origin = req.headers.get("host") || "localhost:3000";
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const verificationUrl = `${protocol}://${origin}/verify/${encodeURIComponent(serial)}`;

    const dataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 320,
      margin: 2,
      color: {
        dark: "#06111e",
        light: "#ffffff"
      }
    });

    return NextResponse.json({
      serial,
      verificationUrl,
      dataUrl
    });
  } catch (err) {
    console.error("QR generation error:", err);
    return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 });
  }
}
