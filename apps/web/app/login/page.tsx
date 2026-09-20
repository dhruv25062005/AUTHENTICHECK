"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, LogIn, AlertCircle } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      localStorage.setItem("authenti_token", data.accessToken);
      localStorage.setItem("authenti_user", JSON.stringify(data.user));
      router.push(data.user.role === "MANUFACTURER" ? "/dashboard" : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="login-view" style={{ maxWidth: "460px", margin: "40px auto", padding: "0 16px" }}>
      <section style={{ background: "var(--bg-surface)", border: "1px solid var(--border-dim)", borderRadius: "16px", padding: "32px", boxShadow: "0 10px 30px rgba(0,0,0,.4)" }}>
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div className="badge-tag mb-2"><ShieldCheck className="w-4 h-4 text-sky-400" /><span>Secure Manufacturer Access</span></div>
          <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#f8fafc", marginTop: "8px" }}>Sign In to AuthentiCheck</h1>
          <p style={{ color: "#94a3b8", fontSize: "14px", marginTop: "4px" }}>Your account and product ledger are secured by the AuthentiCheck API.</p>
        </div>
        {error && <div style={{ marginBottom: "16px", padding: "12px 14px", borderRadius: "8px", background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.35)", color: "#fca5a5", fontSize: "13px", display: "flex", gap: "8px" }}><AlertCircle className="w-4 h-4" /><span>{error}</span></div>}
        <form onSubmit={submit} className="app-form">
          <div className="form-group"><label className="form-label">Email Address</label><input type="email" className="form-input" value={email} onChange={e=>setEmail(e.target.value)} required /></div>
          <div className="form-group"><label className="form-label">Password</label><input type="password" className="form-input" value={password} onChange={e=>setPassword(e.target.value)} required /></div>
          <button type="submit" disabled={loading} className="btn-accent" style={{ width:"100%", justifyContent:"center", padding:"12px" }}><LogIn className="w-4 h-4" /><span>{loading ? "Signing in..." : "Sign In"}</span></button>
        </form>
        <div style={{ marginTop:"20px", textAlign:"center", borderTop:"1px solid var(--border-dim)", paddingTop:"16px" }}>
          <p style={{ fontSize:"13px", color:"#94a3b8" }}>New to AuthentiCheck? <Link href="/register" style={{ color:"#38bdf8", fontWeight:600 }}>Create an account</Link></p>
          <p style={{ fontSize:"11px", color:"#64748b", marginTop:"10px" }}>Forgot password? Contact the system administrator during this prototype phase.</p>
        </div>
      </section>
    </main>
  );
}
