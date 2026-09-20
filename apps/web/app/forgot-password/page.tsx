"use client";

import { useState } from "react";
import Link from "next/link";
import { ShieldCheck, KeyRound, ArrowLeft, Mail, CheckCircle2, AlertCircle } from "lucide-react";
import { apiUrl } from "../../lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Please provide a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/v1/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Unable to send password reset instructions.");
      setSuccess(true);
    } catch (err: unknown) {
      const fbErr = err as { code?: string; message?: string };
      if (fbErr.code === "auth/user-not-found") {
        setError("No AuthentiCheck account was found associated with this email address.");
      } else if (fbErr.code === "auth/invalid-email") {
        setError("The email address provided is not in a valid format.");
      } else if (fbErr.code === "auth/too-many-requests") {
        setError("Too many password reset requests sent. Please pause and try again in a few moments.");
      } else {
        setError(fbErr.message || "Failed to dispatch password reset request. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main id="forgot-password-view" style={{ maxWidth: "460px", margin: "48px auto", padding: "0 16px" }}>
      <section
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-dim)",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 12px 36px rgba(0, 0, 0, 0.45)"
        }}
        id="forgot-password-card"
      >
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div className="badge-tag mb-2">
            <KeyRound className="w-4 h-4 text-sky-400" />
            <span>Account Recovery</span>
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: "800", color: "#f8fafc", marginTop: "8px", letterSpacing: "-0.02em" }}>
            Reset Password
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "14px", marginTop: "6px", lineHeight: "1.5" }}>
            Enter your registered email and we&apos;ll dispatch secure account recovery instructions.
          </p>
        </div>

        {error && (
          <div
            className="form-error-banner flex items-start gap-2"
            style={{
              marginBottom: "20px",
              padding: "12px 14px",
              borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              color: "#fca5a5",
              fontSize: "13px"
            }}
            id="forgot-password-error-banner"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div
            style={{
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.3)",
              borderRadius: "12px",
              padding: "24px",
              textAlign: "center"
            }}
            id="forgot-password-success-box"
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px auto"
              }}
            >
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#f1f5f9", marginBottom: "8px" }}>
              Reset Link Dispatched
            </h2>
            <p style={{ fontSize: "14px", color: "#cbd5e1", lineHeight: "1.5", marginBottom: "16px" }}>
              We have forwarded password reset instructions to <strong className="text-sky-300">{email}</strong>.
              Please check your inbox (and spam folder) to set a new password.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Link
                href="/login"
                className="btn-accent"
                style={{ width: "100%", justifyContent: "center", padding: "11px", textDecoration: "none" }}
                id="btn-return-login-success"
              >
                <span>Return to Sign In</span>
              </Link>
              <button
                type="button"
                onClick={() => setSuccess(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: "13px",
                  cursor: "pointer",
                  padding: "6px"
                }}
                id="btn-resend-link"
              >
                Send to another email
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="app-form">
            <div className="form-group" style={{ marginBottom: "20px" }}>
              <label className="form-label" style={{ display: "block", marginBottom: "6px", fontSize: "13px", fontWeight: "600", color: "#cbd5e1" }}>
                Account Email Address
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="email"
                  className="form-input"
                  placeholder="e.g. inspector@brand.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  style={{ width: "100%", paddingRight: "36px" }}
                  id="input-forgot-email"
                />
                <Mail
                  className="w-4 h-4 text-slate-400"
                  style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-accent"
              style={{ width: "100%", justifyContent: "center", padding: "12px" }}
              id="btn-submit-forgot-password"
            >
              <KeyRound className="w-4 h-4" />
              <span>{loading ? "Transmitting..." : "Send Reset Link"}</span>
            </button>
          </form>
        )}

        <div style={{ marginTop: "24px", textAlign: "center", borderTop: "1px solid var(--border-dim)", paddingTop: "16px" }}>
          <Link
            href="/login"
            style={{
              color: "#38bdf8",
              fontSize: "13px",
              fontWeight: "600",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
            id="link-back-login"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
