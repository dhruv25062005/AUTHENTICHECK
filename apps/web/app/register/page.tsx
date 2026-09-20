"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, UserPlus, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../firebase/AuthContext";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"CONSUMER" | "MANUFACTURER">("MANUFACTURER");
  const [org, setOrg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const { signUpWithEmail, signInWithGoogle } = useAuth();

  const handleFirebaseError = (err: unknown) => {
    const fbErr = err as { code?: string; message?: string };
    switch (fbErr.code) {
      case "auth/email-already-in-use":
        return "An account with this email address already exists. Please sign in or use password reset.";
      case "auth/weak-password":
        return "Password is too weak. Please use at least 8 characters with numbers or symbols.";
      case "auth/invalid-email":
        return "The email format is invalid. Please double-check your email.";
      case "auth/operation-not-allowed":
        return "Email/password registration is not enabled in this project. You can use Google Sign In below.";
      case "auth/popup-closed-by-user":
        return "Google sign-up popup was dismissed.";
      default:
        return fbErr.message || "Failed to create account. Please check your inputs.";
    }
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters in length.");
      return;
    }

    setLoading(true);

    try {
      // 1. Create account in Firebase Authentication & save Firestore user profile
      await signUpWithEmail(
        email,
        password,
        name,
        role,
        role === "MANUFACTURER" ? org : undefined
      );

      // Keep token for backward compatible API routes
      localStorage.setItem("authenti_token", "firebase_auth_token_active");

      // Redirect according to chosen role
      router.push(role === "MANUFACTURER" ? "/dashboard" : "/");
    } catch (fbErr) {
      // Fallback: Check local endpoint if needed
      try {
        const r = await fetch("/api/v1/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName: name,
            email,
            password,
            role,
            organizationName: role === "MANUFACTURER" ? org : undefined
          })
        });
        const d = await r.json();
        if (r.ok && d.accessToken) {
          localStorage.setItem("authenti_token", d.accessToken);
          router.push(role === "MANUFACTURER" ? "/dashboard" : "/");
          return;
        }
      } catch {
        // ignore fallback error
      }
      setError(handleFirebaseError(fbErr));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    setError("");
    setGoogleLoading(true);
    try {
      await signInWithGoogle(role);
      localStorage.setItem("authenti_token", "firebase_auth_token_active");
      router.push(role === "MANUFACTURER" ? "/dashboard" : "/");
    } catch (err) {
      setError(handleFirebaseError(err));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <main id="register-view" style={{ maxWidth: "480px", margin: "40px auto", padding: "0 16px" }}>
      <section
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-dim)",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)"
        }}
        id="register-card"
      >
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div className="badge-tag mb-2">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>Firebase Security Enrollment</span>
          </div>
          <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#f8fafc", marginTop: "8px" }}>
            Create Your Account
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "14px", marginTop: "4px" }}>
            Join the AuthentiCheck verification protocol network.
          </p>
        </div>

        {error && (
          <div
            className="form-error-banner flex items-start gap-2"
            style={{
              marginBottom: "16px",
              padding: "12px 14px",
              borderRadius: "8px",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              color: "#fca5a5",
              fontSize: "13px"
            }}
            id="register-error-banner"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Fast Enrollment */}
        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={googleLoading || loading}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            padding: "12px",
            borderRadius: "8px",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid var(--border-dim)",
            color: "#f1f5f9",
            fontWeight: "600",
            fontSize: "14px",
            cursor: "pointer",
            marginBottom: "20px",
            transition: "all 0.15s ease"
          }}
          id="btn-register-google"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.56 0 2.98.54 4.09 1.58l3.07-3.07C17.3 1.76 14.84 1 12 1 7.54 1 3.71 3.56 1.87 7.28l3.69 2.87C6.44 7.28 8.97 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.69 2.87c2.16-1.99 3.73-4.94 3.73-8.69z"
            />
            <path
              fill="#FBBC05"
              d="M5.56 14.85c-.24-.73-.38-1.5-.38-2.31s.14-1.58.38-2.31L1.87 7.36C1.07 8.97.62 10.77.62 12.67s.45 3.7 1.25 5.31l3.69-3.13z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.69-2.87c-1.08.72-2.45 1.16-4.24 1.16-3.03 0-5.56-2.28-6.44-5.15L1.87 16.36C3.71 20.08 7.54 23 12 23z"
            />
          </svg>
          <span>{googleLoading ? "Connecting to Google..." : "Fast Sign Up with Google"}</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border-dim)" }} />
          <span style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            or register with email
          </span>
          <div style={{ flex: 1, height: "1px", background: "var(--border-dim)" }} />
        </div>

        <form onSubmit={submit} className="app-form">
          <div className="form-group">
            <label className="form-label">Full Name or Team Name</label>
            <input
              className="form-input"
              placeholder="e.g. John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              id="input-reg-name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="e.g. contact@apexhorology.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              id="input-reg-email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password (8+ characters)</label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              id="input-reg-password"
            />
            <span style={{ fontSize: "11px", color: "#64748b", marginTop: "4px", display: "block" }}>
              Must contain at least 8 characters for security compliance.
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">Account Role</label>
            <select
              className="form-select"
              value={role}
              onChange={(e) => setRole(e.target.value as "CONSUMER" | "MANUFACTURER")}
              id="select-reg-role"
            >
              <option value="MANUFACTURER">Brand Manufacturer (Register products & batches)</option>
              <option value="CONSUMER">Consumer / Retail Buyer (Product verification)</option>
            </select>
          </div>

          {role === "MANUFACTURER" && (
            <div className="form-group">
              <label className="form-label">Organization / Brand Legal Name</label>
              <input
                className="form-input"
                placeholder="e.g. Apex Global Horology Ltd"
                value={org}
                onChange={(e) => setOrg(e.target.value)}
                required
                id="input-reg-org"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-accent"
            style={{ width: "100%", justifyContent: "center", padding: "12px", marginTop: "8px" }}
            id="btn-submit-register"
          >
            <UserPlus className="w-4 h-4" />
            <span>{loading ? "Registering Account..." : "Create Verified Account"}</span>
          </button>
        </form>

        <div style={{ marginTop: "20px", textAlign: "center", borderTop: "1px solid var(--border-dim)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <p style={{ fontSize: "13px", color: "#94a3b8" }}>
            Already have an AuthentiCheck account?{" "}
            <Link href="/login" style={{ color: "#38bdf8", fontWeight: "600", textDecoration: "none" }} id="link-login-prompt">
              Sign in here
            </Link>
          </p>
          <p style={{ fontSize: "12px", color: "#64748b" }}>
            Trouble remembering your password?{" "}
            <Link href="/forgot-password" style={{ color: "#94a3b8", textDecoration: "underline" }} id="link-reg-forgot-pw">
              Reset your password
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
