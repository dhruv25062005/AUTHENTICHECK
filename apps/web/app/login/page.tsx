"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, LogIn, Sparkles, KeyRound, AlertCircle } from "lucide-react";
import { useAuth } from "../firebase/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const { signInWithEmail, signInWithGoogle } = useAuth();

  const handleFirebaseError = (err: unknown) => {
    const fbErr = err as { code?: string; message?: string };
    switch (fbErr.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Invalid email or password. Please verify your credentials or use the password reset link.";
      case "auth/invalid-email":
        return "The email format is invalid.";
      case "auth/user-disabled":
        return "This account has been disabled. Please contact system support.";
      case "auth/too-many-requests":
        return "Access to this account has been temporarily disabled due to many failed attempts. Reset your password or try again later.";
      case "auth/popup-closed-by-user":
        return "Google sign-in popup was dismissed before completion.";
      default:
        return fbErr.message || "Authentication failed. Please verify your credentials.";
    }
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Authenticate with Firebase Authentication
      await signInWithEmail(email, password);
      // Keep legacy token for compatibility with backend routes
      localStorage.setItem("authenti_token", "firebase_auth_token_active");
      router.push("/dashboard");
    } catch (firebaseErr) {
      // Fallback: Check if user is trying legacy demo credentials
      if (email.trim().toLowerCase() === "manufacturer@example.com" && password === "password123") {
        try {
          const r = await fetch("/api/v1/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
          });
          const d = await r.json();
          if (r.ok && d.accessToken) {
            localStorage.setItem("authenti_token", d.accessToken);
            router.push("/dashboard");
            return;
          }
        } catch {
          // ignore fallback error
        }
      }
      setError(handleFirebaseError(firebaseErr));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setGoogleLoading(true);
    try {
      await signInWithGoogle("MANUFACTURER");
      localStorage.setItem("authenti_token", "firebase_auth_token_active");
      router.push("/dashboard");
    } catch (err) {
      setError(handleFirebaseError(err));
    } finally {
      setGoogleLoading(false);
    }
  }

  const fillDemoAccount = () => {
    setEmail("manufacturer@example.com");
    setPassword("password123");
    setError("");
  };

  return (
    <main id="login-view" style={{ maxWidth: "460px", margin: "40px auto", padding: "0 16px" }}>
      <section
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border-dim)",
          borderRadius: "16px",
          padding: "32px",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)"
        }}
        id="login-card"
      >
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div className="badge-tag mb-2">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>Firebase Secure Portal</span>
          </div>
          <h1 style={{ fontSize: "26px", fontWeight: "800", color: "#f8fafc", marginTop: "8px" }}>
            Sign In to AuthentiCheck
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "14px", marginTop: "4px" }}>
            Secured by Firebase Authentication & Firestore RBAC.
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
            id="login-error-banner"
          >
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Google Authentication Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
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
          id="btn-login-google"
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
          <span>{googleLoading ? "Connecting to Google..." : "Sign in with Google"}</span>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border-dim)" }} />
          <span style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            or with email
          </span>
          <div style={{ flex: 1, height: "1px", background: "var(--border-dim)" }} />
        </div>

        <form onSubmit={submit} className="app-form">
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="brand@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              id="input-login-email"
            />
          </div>

          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <label className="form-label" style={{ margin: 0 }}>Password</label>
              <Link
                href="/forgot-password"
                style={{ fontSize: "12px", color: "#38bdf8", textDecoration: "none", fontWeight: "500" }}
                id="link-forgot-password"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              id="input-login-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-accent"
            style={{ width: "100%", justifyContent: "center", padding: "12px" }}
            id="btn-submit-login"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? "Authenticating..." : "Sign In with Password"}</span>
          </button>
        </form>

        {/* 1-click Demo Account Helper */}
        <div
          style={{
            marginTop: "20px",
            padding: "14px",
            borderRadius: "8px",
            background: "var(--bg-main)",
            border: "1px dashed var(--border-dim)",
            textAlign: "center"
          }}
        >
          <span style={{ fontSize: "12px", color: "#94a3b8" }}>
            Testing or reviewing the app?
          </span>
          <button
            type="button"
            onClick={fillDemoAccount}
            className="sample-chip genuine"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px", margin: "8px auto 0 auto", padding: "6px 12px" }}
            id="btn-fill-demo-credentials"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Fill Demo Credentials
          </button>
        </div>

        <div style={{ marginTop: "20px", textAlign: "center", borderTop: "1px solid var(--border-dim)", paddingTop: "16px" }}>
          <p style={{ fontSize: "13px", color: "#94a3b8" }}>
            Don&apos;t have an account yet?{" "}
            <Link href="/register" style={{ color: "#38bdf8", fontWeight: "600", textDecoration: "none" }} id="link-register-prompt">
              Register here
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
