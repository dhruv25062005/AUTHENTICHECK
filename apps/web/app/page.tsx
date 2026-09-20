"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import jsQR from "jsqr";
import {
  ShieldCheck,
  QrCode,
  Search,
  Activity,
  Cpu,
  Layers,
  Camera,
  X,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowRight,
  Upload,
  Sparkles,
  Check,
  Store,
  FileCheck,
  WifiOff
} from "lucide-react";
import Interactive3DCard from "./components/Interactive3DCard";
import Product3DShowcase from "./components/Product3DShowcase";

export default function Home() {
  const [serial, setSerial] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [scanningStatus, setScanningStatus] = useState<string>("Point camera at product QR code");
  const [fileScanning, setFileScanning] = useState(false);
  const [fileScanError, setFileScanError] = useState("");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  const handleVerify = useCallback((serialToVerify: string) => {
    let clean = serialToVerify.trim();
    // If a full verification URL was scanned, extract the serial from path
    if (clean.includes("/verify/")) {
      const parts = clean.split("/verify/");
      clean = parts[parts.length - 1].split("?")[0].split("#")[0];
    }
    clean = clean.toUpperCase().replace(/[^A-Z0-9-]/g, "");
    if (clean) {
      router.push(`/verify/${encodeURIComponent(clean)}`);
    }
  }, [router]);

  // Optical scanning loop using jsQR
  const scanFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert"
      });

      if (code && code.data) {
        setScanningStatus(`QR Detected: ${code.data.slice(0, 32)}`);
        stopCamera();
        setScannerOpen(false);
        handleVerify(code.data);
        return;
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  }, [handleVerify]);

  const startCamera = async () => {
    setCameraError("");
    setScanningStatus("Searching for QR pattern...");
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          await videoRef.current.play();
          setCameraActive(true);
          animationFrameRef.current = requestAnimationFrame(scanFrame);
        }
      } else {
        setCameraError("Camera access is not supported in this browser environment. You can upload an image instead!");
      }
    } catch {
      setCameraError("Camera permission was not granted. Please allow camera access or upload an image of the QR code.");
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (scannerOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [scannerOpen]);

  // Decode QR from uploaded image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileScanning(true);
    setFileScanError("");

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setFileScanning(false);
          setFileScanError("Could not initialize image processing canvas.");
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth"
        });

        setFileScanning(false);
        if (code && code.data) {
          setScannerOpen(false);
          handleVerify(code.data);
        } else {
          setFileScanError("No valid QR code was detected in this image. Please check lighting or enter the serial manually.");
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <main id="home-view">
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        style={{ display: "none" }}
        id="file-qr-upload"
      />

      <section className="hero-section" id="hero-verify">
        <div className="badge-tag-3d" id="hero-badge">
          <ShieldCheck className="w-4 h-4 text-sky-400" />
          <span>AuthentiCheck Protocol • 3D Cryptographic Anti-Counterfeiting</span>
        </div>

        <h1 className="hero-heading" id="hero-title">
          Verify product authenticity.<br />Detect counterfeit risk in real time.
        </h1>

        <p className="hero-subtitle" id="hero-desc">
          Inspect cryptographic serial identities, analyze historical scan velocity,
          and conduct AI packaging forensic checks before purchasing or accepting delivery.
        </p>

        <div className="verify-container-3d" id="verify-box">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify(serial);
            }}
            className="verify-input-row"
          >
            <input
              id="input-serial-number"
              className="verify-input-field"
              value={serial}
              onChange={(e) => setSerial(e.target.value.toUpperCase())}
              placeholder="e.g. AC-DEMO-001, AC-LUX-78291, AC-SUS-44102..."
              aria-label="Product Serial Number"
            />
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="btn-qr-scan"
              id="btn-open-scanner"
              title="Scan QR code with optical camera or upload image"
            >
              <Camera className="w-5 h-5" />
              <span>Scan QR</span>
            </button>
            <button
              type="submit"
              className="btn-verify-action"
              id="btn-verify-submit"
            >
              <Search className="w-5 h-5" />
              <span>Verify</span>
            </button>
          </form>

          {/* Quick interactive test samples */}
          <div className="sample-chips-row" id="quick-samples">
            <span className="chip-label">Quick Test Identities:</span>
            <button
              type="button"
              className="sample-chip genuine"
              id="chip-sample-genuine-1"
              onClick={() => {
                setSerial("AC-DEMO-001");
                handleVerify("AC-DEMO-001");
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
              AC-DEMO-001 (Genuine)
            </button>
            <button
              type="button"
              className="sample-chip genuine"
              id="chip-sample-genuine-2"
              onClick={() => {
                setSerial("AC-LUX-78291");
                handleVerify("AC-LUX-78291");
              }}
            >
              <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
              AC-LUX-78291 (Luxury Chronograph)
            </button>
            <button
              type="button"
              className="sample-chip suspicious"
              id="chip-sample-suspicious"
              onClick={() => {
                setSerial("AC-SUS-44102");
                handleVerify("AC-SUS-44102");
              }}
            >
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
              AC-SUS-44102 (High Velocity / Clone)
            </button>
            <button
              type="button"
              className="sample-chip counterfeit"
              id="chip-sample-counterfeit"
              onClick={() => {
                setSerial("FAKE-SN-9999");
                handleVerify("FAKE-SN-9999");
              }}
            >
              <ShieldAlert className="w-3.5 h-3.5 inline mr-1" />
              FAKE-SN-9999 (Unregistered)
            </button>
          </div>
        </div>

        {/* Interactive 3D Showcase Stage Banner */}
        <div style={{ marginTop: "28px", marginBottom: "32px" }}>
          <Product3DShowcase
            productName="Aura Chronograph Ref. 101"
            brand="Aura Horology"
            category="Luxury Watches"
            serialNumber="AC-DEMO-001"
            isGenuine={true}
          />
        </div>

        {/* Feature grid with Interactive 3D Perspective Tilt Cards */}
        <div className="feature-grid" id="security-pillars-grid">
          <Interactive3DCard depth={12} id="pillar-identity-wrapper">
            <article className="feature-card" id="pillar-identity" style={{ height: "100%", margin: 0 }}>
              <div className="feature-icon-box">
                <QrCode className="w-5 h-5 text-sky-400" />
              </div>
              <h2 className="feature-title">Cryptographic Serial Identity</h2>
              <p className="feature-desc">
                Each genuine physical unit receives a cryptographically signed serial identifier and tamper-resistant QR certificate registered on the manufacturer ledger.
              </p>
            </article>
          </Interactive3DCard>

          <Interactive3DCard depth={12} id="pillar-behavior-wrapper">
            <article className="feature-card" id="pillar-behavior" style={{ height: "100%", margin: 0 }}>
              <div className="feature-icon-box">
                <Activity className="w-5 h-5 text-sky-400" />
              </div>
              <h2 className="feature-title">Scan Velocity & Anomaly Risk</h2>
              <p className="feature-desc">
                Detects clone counterfeiting in real time by analyzing scan frequency thresholds, geographic jumps, and duplicate concurrent verifications.
              </p>
            </article>
          </Interactive3DCard>

          <Interactive3DCard depth={12} id="pillar-vision-wrapper">
            <article className="feature-card" id="pillar-vision" style={{ height: "100%", margin: 0 }}>
              <div className="feature-icon-box">
                <Cpu className="w-5 h-5 text-sky-400" />
              </div>
              <h2 className="feature-title">AI Packaging Forensic Vision</h2>
              <p className="feature-desc">
                Multi-modal Gemini AI inspects packaging photos, holographic diffraction foils, seal integrity, and typography alignment against factory golden standards.
              </p>
            </article>
          </Interactive3DCard>
        </div>

        {/* Live Security Stats Bar */}
        <div
          style={{
            marginTop: "32px",
            padding: "20px 24px",
            background: "rgba(15, 23, 42, 0.6)",
            borderRadius: "14px",
            border: "1px solid var(--border-dim)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "20px",
            textAlign: "center"
          }}
          id="stats-strip"
        >
          <div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#38bdf8" }}>99.98%</div>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Cryptographic Match Rate</div>
          </div>
          <div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#34d399" }}>&lt; 180ms</div>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Instant Verification Latency</div>
          </div>
          <div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#fbbf24" }}>Real-Time</div>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>Scan Velocity Heuristics</div>
          </div>
          <div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#a78bfa" }}>Gemini 3.8</div>
            <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>AI Vision Packaging Audit</div>
          </div>
        </div>

        {/* Consumer Protection Features: Authorized Sellers & Offline Mode */}
        <div
          style={{
            marginTop: "24px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px"
          }}
          id="consumer-empowerment-cards"
        >
          <div
            style={{
              padding: "20px",
              background: "rgba(12, 24, 40, 0.7)",
              borderRadius: "12px",
              border: "1px solid var(--border-dim)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(56, 189, 248, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Store className="w-5 h-5 text-sky-400" />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#f8fafc" }}>
                  Authorized Seller Verification
                </h3>
              </div>
              <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.6 }}>
                Before buying, search our live registry of verified retailers, licensed boutiques, and flagged gray-market URLs to avoid counterfeit distributors.
              </p>
            </div>
            <Link
              href="/merchants"
              className="btn-secondary-action"
              style={{ marginTop: "16px", width: "fit-content", fontSize: "13px" }}
              id="link-explore-merchants"
            >
              <span>Explore Authorized Sellers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div
            style={{
              padding: "20px",
              background: "rgba(12, 24, 40, 0.7)",
              borderRadius: "12px",
              border: "1px solid var(--border-dim)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FileCheck className="w-5 h-5 text-emerald-400" />
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#f8fafc" }}>
                  1-Click Dispute Dossier
                </h3>
              </div>
              <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.6 }}>
                Encountered a fake? Submit an incident report and instantly download a court-admissible chargeback evidence pack formatted for bank fraud & buyer protection claims.
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "16px", fontSize: "12px", color: "#34d399" }}>
              <Check className="w-4 h-4" />
              <span>Built into every verification result</span>
            </div>
          </div>
        </div>

        {/* Manufacturer banner */}
        <div
          style={{
            marginTop: "32px",
            padding: "24px",
            background: "rgba(12, 24, 40, 0.85)",
            borderRadius: "14px",
            border: "1px solid var(--border-dim)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px"
          }}
          id="manufacturer-cta-banner"
        >
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#f8fafc" }}>
              Are you an authorized Brand Owner or Manufacturer?
            </h3>
            <p style={{ fontSize: "14px", color: "#94a3b8", marginTop: "4px" }}>
              Register product lines, generate batch serial allocations, export printable QR label sheets, and review counterfeit incident reports.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="btn-accent"
            id="btn-goto-portal"
          >
            <Layers className="w-4 h-4" />
            <span>Open Manufacturer Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* QR Optical Scanner & File Upload Modal */}
      {scannerOpen && (
        <div className="modal-overlay" id="qr-scanner-modal">
          <div className="modal-dialog" style={{ maxWidth: "500px" }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Camera className="w-5 h-5 text-sky-400" />
                <h3 className="modal-title">Live Optical QR Scanner</h3>
              </div>
              <button
                onClick={() => setScannerOpen(false)}
                className="btn-close-modal"
                id="btn-close-scanner"
                aria-label="Close scanner modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div
              style={{
                position: "relative",
                width: "100%",
                height: "280px",
                background: "#030712",
                borderRadius: "10px",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid var(--border-dim)"
              }}
            >
              <video
                ref={videoRef}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                playsInline
                muted
              />

              {/* Viewfinder target */}
              <div
                style={{
                  position: "absolute",
                  width: "190px",
                  height: "190px",
                  border: "2px solid rgba(56, 189, 248, 0.9)",
                  borderRadius: "12px",
                  boxShadow: "0 0 25px rgba(56, 189, 248, 0.4)",
                  pointerEvents: "none"
                }}
              />

              {/* Laser scanline animation */}
              {cameraActive && (
                <div
                  style={{
                    position: "absolute",
                    width: "180px",
                    height: "2px",
                    background: "#38bdf8",
                    boxShadow: "0 0 8px #38bdf8",
                    animation: "pulse 2s infinite"
                  }}
                />
              )}

              {!cameraActive && (
                <div style={{ position: "absolute", textAlign: "center", padding: "16px" }}>
                  <p style={{ fontSize: "14px", color: "#94a3b8" }}>
                    {cameraError || "Initializing optical sensor..."}
                  </p>
                </div>
              )}
            </div>

            <div style={{ marginTop: "14px", textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: "#38bdf8", fontWeight: "600" }}>
                {scanningStatus}
              </p>
            </div>

            {/* Upload image alternative */}
            <div style={{ marginTop: "16px", borderTop: "1px solid var(--border-dim)", paddingTop: "16px" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-accent"
                  style={{ flex: 1, justifyContent: "center", background: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", border: "1px solid rgba(56, 189, 248, 0.3)" }}
                  id="btn-upload-qr-file"
                >
                  <Upload className="w-4 h-4" />
                  <span>{fileScanning ? "Decoding Image..." : "Upload QR Photo / Label"}</span>
                </button>
              </div>

              {fileScanError && (
                <p style={{ fontSize: "12px", color: "#f87171", marginTop: "8px", textAlign: "center" }}>
                  {fileScanError}
                </p>
              )}
            </div>

            <div style={{ marginTop: "16px" }}>
              <p style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>
                Or test with pre-seeded identity scenarios:
              </p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="sample-chip genuine"
                  onClick={() => {
                    setScannerOpen(false);
                    handleVerify("AC-DEMO-001");
                  }}
                >
                  AC-DEMO-001 (Genuine)
                </button>
                <button
                  type="button"
                  className="sample-chip suspicious"
                  onClick={() => {
                    setScannerOpen(false);
                    handleVerify("AC-SUS-44102");
                  }}
                >
                  AC-SUS-44102 (Suspicious)
                </button>
                <button
                  type="button"
                  className="sample-chip counterfeit"
                  onClick={() => {
                    setScannerOpen(false);
                    handleVerify("FAKE-SN-9999");
                  }}
                >
                  FAKE-SN-9999 (Counterfeit)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
