"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldCheck, Layers, LogIn, UserPlus, LogOut, Search } from "lucide-react";
import { useAuth } from "../firebase/AuthContext";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, signOutUser } = useAuth();
  const [legacyToken, setLegacyToken] = useState<string | null>(null);

  useEffect(() => {
    const updateLegacy = () => {
      setLegacyToken(localStorage.getItem("authenti_token"));
    };
    updateLegacy();
    window.addEventListener("storage", updateLegacy);
    return () => window.removeEventListener("storage", updateLegacy);
  }, [pathname]);

  const handleLogout = async () => {
    localStorage.removeItem("authenti_token");
    setLegacyToken(null);
    if (user) {
      await signOutUser();
    }
    router.push("/");
  };

  const isAuthenticated = !!user || !!legacyToken;
  const currentRole = profile?.role || (legacyToken ? "MANUFACTURER" : "CONSUMER");
  const displayName = profile?.displayName || user?.displayName || user?.email?.split("@")[0] || "User";

  return (
    <header className="site-header" id="main-navigation">
      <div className="header-inner">
        <Link href="/" className="brand-logo" id="nav-brand-link">
          <div className="brand-icon-wrapper">
            <ShieldCheck className="w-5 h-5 text-sky-400" />
            <span className="live-status-dot" title="Engine Online" />
          </div>
          <div className="brand-text-block">
            <span className="brand-title">AUTHENTICHECK</span>
            <span className="brand-sub">Trust & Integrity Protocol</span>
          </div>
        </Link>

        <nav className="nav-menu" id="primary-nav-links">
          <Link
            href="/"
            className={`nav-link ${pathname === "/" ? "active" : ""}`}
            id="nav-home"
          >
            <Search className="w-4 h-4" />
            <span>Verify Serial</span>
          </Link>

          <Link
            href="/dashboard"
            className={`nav-link ${pathname.startsWith("/dashboard") ? "active" : ""}`}
            id="nav-dashboard"
          >
            <Layers className="w-4 h-4" />
            <span>Manufacturer Portal</span>
          </Link>
        </nav>

        <div className="nav-actions" id="auth-nav-actions">
          {isAuthenticated ? (
            <div className="auth-pill-group">
              <span className="user-badge" id="current-role-badge" title={user?.email || displayName}>
                <span className="online-indicator"></span>
                <span className="font-semibold text-sky-400 mr-1">{displayName}:</span>
                {currentRole === "MANUFACTURER" ? "Manufacturer" : "Consumer"}
              </span>
              <button
                onClick={handleLogout}
                className="btn-ghost-logout"
                id="btn-logout"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span>Log out</span>
              </button>
            </div>
          ) : (
            <div className="auth-buttons-group">
              <Link href="/login" className="btn-secondary-nav" id="btn-nav-login">
                <LogIn className="w-4 h-4" />
                <span>Sign in</span>
              </Link>
              <Link href="/register" className="btn-primary-nav" id="btn-nav-register">
                <UserPlus className="w-4 h-4" />
                <span>Register</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
