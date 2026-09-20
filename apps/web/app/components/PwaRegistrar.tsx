"use client";

import { useEffect, useState } from "react";
import { WifiOff, Download, CheckCircle2, X } from "lucide-react";

export default function PwaRegistrar() {
  const [isOffline, setIsOffline] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    // Check initial online status
    if (typeof window !== "undefined") {
      setIsOffline(!navigator.onLine);

      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // Register service worker if supported
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            // Trigger update check on load
            reg.update().catch(() => {});
          })
          .catch((err) => {
            console.warn("Service Worker registration failed:", err);
          });
      }

      // Handle PWA installation prompt
      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShowInstallBanner(true);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstall);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      };
    }
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstallBanner(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <>
      {/* Offline Status Pill */}
      {isOffline && (
        <div
          id="offline-banner"
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "10px 18px",
            borderRadius: "30px",
            background: "#b91c1c",
            color: "#ffffff",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            fontSize: "13px",
            fontWeight: "600"
          }}
        >
          <WifiOff className="w-4 h-4 text-white" />
          <span>Offline Mode Active — Cached Ledger Verification Enabled</span>
        </div>
      )}

      {/* PWA Install Prompt Banner */}
      {showInstallBanner && (
        <div
          id="pwa-install-banner"
          style={{
            position: "fixed",
            top: "70px",
            right: "20px",
            zIndex: 9998,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 18px",
            borderRadius: "10px",
            background: "rgba(15, 23, 42, 0.95)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
            color: "#f8fafc",
            fontSize: "13px"
          }}
        >
          <Download className="w-4 h-4 text-sky-400 shrink-0" />
          <div>
            <div style={{ fontWeight: "700" }}>Install AuthentiCheck App</div>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>Verify serials offline on iOS & Android</div>
          </div>
          <button
            type="button"
            onClick={handleInstallClick}
            className="btn-accent"
            style={{ fontSize: "12px", padding: "6px 12px" }}
            id="btn-confirm-install"
          >
            Install
          </button>
          <button
            type="button"
            onClick={() => setShowInstallBanner(false)}
            style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", padding: "2px" }}
            aria-label="Dismiss install banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
