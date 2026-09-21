"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { apiUrl } from "../../lib/api";

export default function ResetPasswordPage() {
  const params = useSearchParams();
  const [token, setToken] = useState(params.get("token") || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/v1/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), newPassword: password })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unable to reset password.");
      setMessage(data.message || "Password updated. You can sign in now.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password reset failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 460, margin: "48px auto", padding: "0 16px" }}>
      <section style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)", borderRadius: 16, padding: 32 }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <KeyRound className="w-7 h-7 text-sky-400" style={{ margin: "0 auto 10px" }} />
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f8fafc" }}>Set a New Password</h1>
          <p style={{ color: "#94a3b8", fontSize: 14, marginTop: 6 }}>Use a valid AuthentiCheck recovery token.</p>
        </div>

        {error && <div style={{ padding: 12, marginBottom: 16, color: "#fca5a5", background: "rgba(239,68,68,.12)", borderRadius: 8 }}><AlertCircle className="w-4 h-4 inline mr-2" />{error}</div>}
        {message && <div style={{ padding: 12, marginBottom: 16, color: "#86efac", background: "rgba(16,185,129,.12)", borderRadius: 8 }}><CheckCircle2 className="w-4 h-4 inline mr-2" />{message}</div>}

        {!message && (
          <form onSubmit={submit} className="app-form">
            <label className="form-label">Recovery Token</label>
            <input className="form-input" value={token} onChange={e => setToken(e.target.value)} required />
            <label className="form-label">New Password</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
            <label className="form-label">Confirm Password</label>
            <input className="form-input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} />
            <button className="btn-accent" disabled={loading || !token} type="submit">{loading ? "Updating..." : "Update Password"}</button>
          </form>
        )}

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <Link href="/login" style={{ color: "#38bdf8", textDecoration: "none" }}>Return to sign in</Link>
        </div>
      </section>
    </main>
  );
}
