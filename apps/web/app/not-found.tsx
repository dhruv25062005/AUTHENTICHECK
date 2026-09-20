import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function NotFound() {
  return (
    <main id="not-found-view" style={{ minHeight: "70vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
      <div style={{ textAlign: "center", maxWidth: "480px" }}>
        <div style={{ display: "inline-flex", padding: "16px", background: "rgba(244, 63, 94, 0.1)", borderRadius: "50%", marginBottom: "16px" }}>
          <ShieldAlert className="w-10 h-10 text-rose-500" />
        </div>
        <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#f8fafc", marginBottom: "8px" }}>
          404 - Ledger Entry Not Found
        </h1>
        <p style={{ color: "#94a3b8", fontSize: "14px", lineHeight: 1.6, marginBottom: "24px" }}>
          The requested page, verification record, or asset could not be located on the AuthentiCheck network.
        </p>
        <Link href="/" className="btn-accent">
          Return to Verification Portal
        </Link>
      </div>
    </main>
  );
}
