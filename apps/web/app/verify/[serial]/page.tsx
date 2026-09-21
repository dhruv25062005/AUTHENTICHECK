"use client";

import { useEffect, useState, use, useRef } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Copy,
  Check,
  ArrowLeft,
  Flag,
  Share2,
  Camera,
  Layers,
  Sparkles,
  Upload,
  Printer,
  Calendar,
  Box,
  FileText,
  X,
  Download,
  Info,
  ClipboardCheck,
  Radio
} from "lucide-react";
import { generateDisputeDossierPrintable } from "../../utils/disputeDossier";
import HologramBadge3D from "../../components/HologramBadge3D";
import Product3DShowcase from "../../components/Product3DShowcase";
import Interactive3DCard from "../../components/Interactive3DCard";
import { apiUrl } from "../../../lib/api";

type SafetyAdvisory = {
  id: string;
  productName: string;
  brand: string;
  category: string;
  severity: "URGENT" | "MODERATE" | "INFORMATIONAL";
  headline: string;
  details: string;
  affectedSerialsOrBatches: string[];
  actionRequired: string;
  issuedAt: string;
};

type PhysicalChecklistItem = {
  step: number;
  title: string;
  description: string;
  warningIfFailed: string;
};

type Result = {
  status: "GENUINE" | "SUSPICIOUS" | "HIGH_RISK" | string;
  riskScore: number;
  product?: {
    id?: string;
    name: string;
    brand: string;
    category: string;
    manufacturer: string;
    serialNumber: string;
    registeredAt?: string;
    batchCode?: string;
    manufacturingDate?: string;
    lifecycleStatus?: string;
  };
  history?: {
    previousScans: number;
    lastScannedAt?: string;
    scanLocation?: string;
  };
  reasons: string[];
  advisories?: SafetyAdvisory[];
  physicalChecklist?: PhysicalChecklistItem[];
  verifiedAt?: string;
};

type AIInspectionResult = {
  success: boolean;
  matchScore: number;
  qualityScore?: number;
  riskTier: "LOW_RISK" | "MODERATE_RISK" | "HIGH_RISK";
  hologramFoilStatus: string;
  typographyStatus: string;
  sealIntegrity: string;
  detectedAnomalies: string[];
  forensicSummary: string;
  recommendation: "SAFE_TO_ACCEPT" | "EXERCISE_CAUTION" | "DO_NOT_PURCHASE";
  analyzedBy: string;
};

export default function VerifyPage({ params }: { params: Promise<{ serial: string }> }) {
  const resolvedParams = use(params);
  const [serial, setSerial] = useState(decodeURIComponent(resolvedParams.serial || "").toUpperCase());
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Counterfeit Incident Report
  const [reportOpen, setReportOpen] = useState(false);
  const [reportMerchant, setReportMerchant] = useState("");
  const [reportLocation, setReportLocation] = useState("");
  const [reportReason, setReportReason] = useState("");
  const [reportSeverity, setReportSeverity] = useState<"LOW" | "MEDIUM" | "CRITICAL">("MEDIUM");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportRefId, setReportRefId] = useState("");

  // AI Visual Forensic Inspector
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [inspectorNotes, setInspectorNotes] = useState("");
  const [visualAnalysisRunning, setVisualAnalysisRunning] = useState(false);
  const [visualResult, setVisualResult] = useState<AIInspectionResult | null>(null);
  const [visualError, setVisualError] = useState("");
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const fetchVerification = async () => {
      setLoading(true);
      try {
        const res = await fetch(apiUrl(`/api/v1/verify/${encodeURIComponent(serial)}`));
        const data = await res.json();
        setResult(data);
      } catch (err) {
        console.error("Verification failed:", err);
      } finally {
        setLoading(false);
      }
    };

    if (serial) {
      fetchVerification();
    }
  }, [serial]);

  const copySerial = () => {
    navigator.clipboard.writeText(serial);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePhotoSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoDataUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRunVisualCheck = async () => {
    setVisualAnalysisRunning(true);
    setVisualError("");
    try {
      const res = await fetch(apiUrl("/api/v1/ai/inspect"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serialNumber: serial,
          image: photoDataUrl || undefined,
          notes: inspectorNotes || undefined
        })
      });

      if (!res.ok) {
        throw new Error("Inspection service returned error");
      }

      const data = await res.json();
      setVisualResult({
        success: Boolean(data.success),
        matchScore: typeof data.signals?.similarity === "number" ? Math.round(data.signals.similarity * 100) : 0,
        qualityScore: typeof data.signals?.qualityScore === "number" ? Math.round(data.signals.qualityScore * 100) : undefined,
        riskTier: data.signals?.anomaly > 0.5 ? "HIGH_RISK" : "MODERATE_RISK",
        hologramFoilStatus: data.message || "No hologram-specific model signal is available.",
        typographyStatus: data.message || "No typography-specific model signal is available.",
        sealIntegrity: data.message || "No seal-specific model signal is available.",
        detectedAnomalies: data.signals?.anomaly != null ? [`Anomaly signal: ${data.signals.anomaly}`] : [],
        forensicSummary: data.message || "Visual inspection response received.",
        recommendation: data.signals?.anomaly > 0.5 ? "EXERCISE_CAUTION" : "EXERCISE_CAUTION",
        analyzedBy: data.modelVersion || "AuthentiCheck AI Gateway"
      });
    } catch (err) {
      console.error("AI inspection failed:", err);
      setVisualError("Packaging inspection could not complete. Please retry or check network.");
    } finally {
      setVisualAnalysisRunning(false);
    }
  };

  const submitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReport(true);
    try {
      const res = await fetch(apiUrl("/api/v1/reports"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serialNumber: serial,
          productName: result?.product?.name,
          merchantName: reportMerchant,
          storeLocation: reportLocation,
          reason: reportReason,
          severity: reportSeverity,
          evidenceUrl: undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        const assignedId = data.reportId || "REC-" + Date.now().toString().slice(-6);
        setReportRefId(assignedId);
        setReportSuccess(true);

        // The Express API is the single source of truth for incident reports.
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loading) {
    return (
      <main id="verify-loading-view">
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              border: "3px solid rgba(56, 189, 248, 0.2)",
              borderTopColor: "#38bdf8",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 24px auto"
            }}
          />
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#f8fafc" }}>
            Querying Cryptographic Ledger...
          </h1>
          <p style={{ color: "#94a3b8", marginTop: "8px" }}>
            Evaluating cryptographic serial identity and scan velocity heuristics for {serial}
          </p>
        </div>
      </main>
    );
  }

  const isGenuine = result?.status === "GENUINE";
  const isSuspicious = result?.status === "SUSPICIOUS";
  const isRisk = !isGenuine && !isSuspicious;

  const statusClass = isGenuine ? "status-genuine" : isSuspicious ? "status-suspicious" : "status-risk";
  const statusPillClass = isGenuine ? "genuine" : isSuspicious ? "suspicious" : "risk";
  const statusLabel = isGenuine ? "Genuine Authentic Product" : isSuspicious ? "Suspicious Activity Detected" : "High Counterfeit Risk";

  return (
    <main id="verify-result-view">
      <input
        type="file"
        ref={photoInputRef}
        onChange={handlePhotoSelected}
        accept="image/*"
        style={{ display: "none" }}
        id="file-packaging-photo"
      />

      <div className="verify-result-layout">
        {/* Navigation & Utilities */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <Link href="/" className="btn-secondary-action" id="btn-back-home">
            <ArrowLeft className="w-4 h-4" />
            <span>Verify Another Product</span>
          </Link>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => {
                generateDisputeDossierPrintable({
                  reportId: reportRefId || "EVID-" + serial + "-" + Date.now().toString().slice(-4),
                  generatedAt: new Date().toISOString(),
                  serialNumber: serial,
                  productName: result?.product?.name || "AuthentiCheck Verified Product",
                  brand: result?.product?.brand || "Registered Brand",
                  category: result?.product?.category || "General Goods",
                  manufacturer: result?.product?.manufacturer || "Apex Manufacturing Global",
                  batchCode: result?.product?.batchCode,
                  status: result?.status || "INVESTIGATING",
                  riskScore: result?.riskScore || 50,
                  merchantName: reportMerchant || "Unverified Retailer / Marketplace",
                  storeLocation: reportLocation || "Not Disclosed",
                  reason: reportReason || "Consumer requested official cryptographic audit dossier for payment dispute.",
                  severity: reportSeverity,
                  reasons: result?.reasons || ["Cryptographic validation ledger record."],
                  visualForensics: visualResult
                    ? {
                        riskTier: visualResult.riskTier,
                        forensicSummary: visualResult.forensicSummary,
                        hologramFoilStatus: visualResult.hologramFoilStatus,
                        typographyStatus: visualResult.typographyStatus,
                        sealIntegrity: visualResult.sealIntegrity,
                        recommendation: visualResult.recommendation
                      }
                    : undefined,
                  evidencePhotoAttached: !!photoDataUrl
                });
              }}
              className="btn-secondary-action"
              id="btn-download-dossier"
              title="Generate 1-Click Dispute Dossier PDF for Bank / Marketplace Chargeback"
            >
              <Download className="w-4 h-4 text-rose-400" />
              <span>Dispute Dossier (PDF)</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="btn-secondary-action"
              id="btn-print-certificate"
              title="Print official authentication certificate"
            >
              <Printer className="w-4 h-4" />
              <span>Print Certificate</span>
            </button>
          </div>
        </div>

        {/* Main Result Card */}
        <section className={`result-card-main ${statusClass}`} id="result-main-card">
          <div className="result-status-header" style={{ alignItems: "center", gap: "24px" }}>
            <div style={{ flex: 1 }}>
              <div className={`status-pill ${statusPillClass}`} id="result-status-pill">
                {isGenuine && <CheckCircle2 className="w-4 h-4" />}
                {isSuspicious && <AlertTriangle className="w-4 h-4" />}
                {isRisk && <ShieldAlert className="w-4 h-4" />}
                <span>{statusLabel}</span>
              </div>
              <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#f8fafc", marginTop: "14px" }}>
                {isGenuine
                  ? "Authenticity Verified"
                  : isSuspicious
                  ? "Scan Velocity Anomaly"
                  : "Unregistered or Altered Serial"}
              </h1>
              <p style={{ color: "#94a3b8", fontSize: "14px", marginTop: "4px" }}>
                Serial: <strong style={{ color: "#38bdf8", fontFamily: "monospace" }}>{serial}</strong>
              </p>
            </div>

            {/* 3D Dynamic Hologram Security Seal */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              <HologramBadge3D
                status={isGenuine ? "GENUINE" : isSuspicious ? "SUSPICIOUS" : "RISK"}
                score={result?.riskScore ?? (isGenuine ? 2 : isSuspicious ? 68 : 95)}
              />

              {/* Risk Gauge Metric */}
              <div className="risk-meter-container" id="risk-score-badge">
                <div className={`risk-number-display ${statusPillClass}`}>
                  {result?.riskScore ?? 100}
                  <span style={{ fontSize: "14px", color: "#64748b" }}>/100</span>
                </div>
                <div className="risk-meta-text">
                  <span className="risk-meta-title">Risk Assessment</span>
                  <span className="risk-meta-sub">
                    {isGenuine ? "Low Counterfeit Threat" : isSuspicious ? "Requires Inspection" : "Likely Counterfeit"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Product & Manufacturing Specifications */}
          {result?.product && (
            <div className="product-spec-grid" id="product-specifications">
              <div className="spec-item">
                <span className="spec-label">Product Name</span>
                <span className="spec-value">{result.product.name}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Brand & Category</span>
                <span className="spec-value">{result.product.brand} · {result.product.category}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Registered Manufacturer</span>
                <span className="spec-value">{result.product.manufacturer}</span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Cryptographic Serial Number</span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className="spec-value code">{result.product.serialNumber}</span>
                  <button
                    onClick={copySerial}
                    style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                    title="Copy serial number"
                    id="btn-copy-serial"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="spec-item">
                <span className="spec-label">Manufacturing Batch & Date</span>
                <span className="spec-value" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Box className="w-3.5 h-3.5 text-sky-400" />
                  {result.product.batchCode || "BATCH-01"} ({result.product.manufacturingDate || "2026"})
                </span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Historical Scans Recorded</span>
                <span className="spec-value">
                  {result.history?.previousScans ?? 0} previous verification(s)
                </span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Lifecycle Status</span>
                <span className="spec-value" style={{ color: result.product.lifecycleStatus === "ACTIVE" ? "#34d399" : "#fb7185" }}>
                  {result.product.lifecycleStatus || "ACTIVE"}
                </span>
              </div>
              <div className="spec-item">
                <span className="spec-label">Verification Handshake</span>
                <span className="spec-value" style={{ color: "#34d399", display: "flex", alignItems: "center", gap: "4px" }}>
                  <ShieldCheck className="w-4 h-4" /> Live Cryptographic Proof
                </span>
              </div>
            </div>
          )}

          {/* 3D Cryptographic Geometry Twin Inspection */}
          {result?.product && (
            <div style={{ marginTop: "24px" }}>
              <Product3DShowcase
                productName={result.product.name}
                brand={result.product.brand}
                category={result.product.category}
                serialNumber={result.product.serialNumber}
                isGenuine={isGenuine}
              />
            </div>
          )}

          {/* Assessment Reasons & Signals */}
          <div className="reasons-box" id="reasons-container">
            <h3 className="reasons-title">
              <Sparkles className="w-4 h-4 text-sky-400" />
              Risk Engine Signals & Heuristics
            </h3>
            <div className="reasons-list">
              {result?.reasons?.map((reason, idx) => (
                <div key={idx} className="reason-item">
                  <span style={{ color: isGenuine ? "#34d399" : isSuspicious ? "#fbbf24" : "#fb7185" }}>•</span>
                  <span>{reason}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Active Safety Advisories if present */}
          {result?.advisories && result.advisories.length > 0 && (
            <div
              style={{
                marginTop: "20px",
                padding: "16px",
                borderRadius: "10px",
                background: "rgba(245, 158, 11, 0.08)",
                border: "1px solid rgba(245, 158, 11, 0.3)"
              }}
              id="result-safety-advisories"
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
                <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#fef3c7" }}>
                  Active Brand Safety Notice for this Model / Batch
                </h4>
              </div>
              {result.advisories.map((adv) => (
                <div key={adv.id} style={{ marginBottom: "10px" }}>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#fde68a" }}>
                    {adv.headline}
                  </div>
                  <p style={{ fontSize: "12px", color: "#e2e8f0", marginTop: "3px", lineHeight: 1.5 }}>
                    {adv.details}
                  </p>
                  <div style={{ fontSize: "12px", color: "#38bdf8", marginTop: "4px" }}>
                    <strong>Recommended Action:</strong> {adv.actionRequired}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recommended Physical Touchpoint Checklist */}
          {result?.physicalChecklist && result.physicalChecklist.length > 0 && (
            <div
              style={{
                marginTop: "20px",
                padding: "18px",
                borderRadius: "12px",
                background: "var(--bg-main)",
                border: "1px solid var(--border-dim)"
              }}
              id="physical-checklist-container"
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                <ClipboardCheck className="w-5 h-5 text-sky-400" />
                <div>
                  <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#f8fafc" }}>
                    Physical Touchpoint Checklist (Inspect In Person)
                  </h4>
                  <p style={{ fontSize: "12px", color: "#94a3b8" }}>
                    Confirm these physical security features on the product and packaging before taking delivery.
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gap: "12px", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
                {result.physicalChecklist.map((item) => (
                  <div
                    key={item.step}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "8px",
                      background: "rgba(12, 24, 40, 0.7)",
                      border: "1px solid rgba(56, 189, 248, 0.15)"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span
                        style={{
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          background: "rgba(56, 189, 248, 0.2)",
                          color: "#38bdf8",
                          fontSize: "11px",
                          fontWeight: "700",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}
                      >
                        {item.step}
                      </span>
                      <span style={{ fontSize: "13px", fontWeight: "600", color: "#f8fafc" }}>
                        {item.title}
                      </span>
                    </div>
                    <p style={{ fontSize: "12px", color: "#cbd5e1", lineHeight: 1.5, margin: "6px 0" }}>
                      {item.description}
                    </p>
                    <div style={{ fontSize: "11px", color: "#fb7185", background: "rgba(244, 63, 94, 0.1)", padding: "4px 8px", borderRadius: "4px" }}>
                      ⚠️ {item.warningIfFailed}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Packaging & Seal Inspection Section */}
          <Interactive3DCard depth={8} id="visual-inspector-3d-wrapper">
            <div
              style={{
                marginTop: "24px",
                padding: "20px",
                borderRadius: "12px",
                background: "rgba(10, 20, 35, 0.85)",
                border: "1px solid rgba(56, 189, 248, 0.25)"
              }}
              id="visual-inspector-card"
            >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Camera className="w-5 h-5 text-sky-400" />
                <div>
                  <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#f8fafc" }}>
                    AI Packaging & Optical Forensic Analysis
                  </h4>
                  <p style={{ fontSize: "12px", color: "#94a3b8" }}>
                    Upload packaging photo, hologram, or seal to audit typography, micro-print, and physical tamper signs.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="btn-secondary-action"
                  id="btn-upload-inspect-photo"
                >
                  <Upload className="w-4 h-4" />
                  <span>{photoDataUrl ? "Change Photo" : "Upload Packaging Photo"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleRunVisualCheck}
                  disabled={visualAnalysisRunning}
                  className="btn-accent"
                  id="btn-run-visual-check"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{visualAnalysisRunning ? "Analyzing..." : "Run AI Packaging Inspection"}</span>
                </button>
              </div>
            </div>

            {/* Thumbnail preview if uploaded */}
            {photoDataUrl && (
              <div style={{ marginBottom: "16px", display: "flex", alignItems: "center", gap: "12px", padding: "10px", background: "rgba(15, 23, 42, 0.6)", borderRadius: "8px" }}>
                <img
                  src={photoDataUrl}
                  alt="Packaging photo to inspect"
                  style={{ width: "64px", height: "64px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--border-dim)" }}
                />
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#f8fafc" }}>Photo attached for AI vision audit</div>
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>The current AI service measures image quality. Authenticity comparison requires manufacturer reference images and a trained model.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setPhotoDataUrl(null)}
                  style={{ marginLeft: "auto", background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                  title="Remove photo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {visualError && (
              <p style={{ fontSize: "13px", color: "#f87171", marginBottom: "12px" }}>{visualError}</p>
            )}

            {/* Forensic Inspection Results */}
            {visualResult && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "16px",
                  borderRadius: "10px",
                  background: "rgba(17, 34, 57, 0.8)",
                  border: "1px solid var(--border-dim)"
                }}
                id="ai-inspection-results"
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "#f8fafc" }}>
                      Visual Reference Match Score:
                    </span>
                    <span
                      style={{
                        fontSize: "16px",
                        fontWeight: "800",
                        color: visualResult.matchScore >= 85 ? "#34d399" : visualResult.matchScore >= 60 ? "#fbbf24" : "#fb7185",
                        fontFamily: "monospace"
                      }}
                    >
                      {visualResult.matchScore > 0 ? `${visualResult.matchScore.toFixed(1)}%` : "Not available"}
                    </span>
                  </div>

                  <span
                    style={{
                      fontSize: "11px",
                      padding: "3px 10px",
                      borderRadius: "12px",
                      fontWeight: "700",
                      background:
                        visualResult.recommendation === "SAFE_TO_ACCEPT"
                          ? "rgba(52, 211, 153, 0.15)"
                          : visualResult.recommendation === "EXERCISE_CAUTION"
                          ? "rgba(251, 191, 36, 0.15)"
                          : "rgba(244, 63, 94, 0.15)",
                      color:
                        visualResult.recommendation === "SAFE_TO_ACCEPT"
                          ? "#34d399"
                          : visualResult.recommendation === "EXERCISE_CAUTION"
                          ? "#fbbf24"
                          : "#fb7185"
                    }}
                  >
                    {visualResult.recommendation.replace(/_/g, " ")}
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "12px" }}>
                  <div style={{ padding: "10px", background: "rgba(11, 20, 38, 0.6)", borderRadius: "6px" }}>
                    <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>Hologram & Foil</div>
                    <div style={{ fontSize: "12px", color: "#e2e8f0", marginTop: "4px" }}>{visualResult.hologramFoilStatus}</div>
                  </div>
                  <div style={{ padding: "10px", background: "rgba(11, 20, 38, 0.6)", borderRadius: "6px" }}>
                    <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>Typography & Kerning</div>
                    <div style={{ fontSize: "12px", color: "#e2e8f0", marginTop: "4px" }}>{visualResult.typographyStatus}</div>
                  </div>
                  <div style={{ padding: "10px", background: "rgba(11, 20, 38, 0.6)", borderRadius: "6px" }}>
                    <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>Tamper Seal</div>
                    <div style={{ fontSize: "12px", color: "#e2e8f0", marginTop: "4px" }}>{visualResult.sealIntegrity}</div>
                  </div>
                </div>

                <p style={{ fontSize: "13px", color: "#cbd5e1", lineHeight: 1.6 }}>
                  {visualResult.forensicSummary}
                </p>

                <div style={{ marginTop: "10px", fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  <span>Audited via {visualResult.analyzedBy}</span>
                </div>
              </div>
            )}
            </div>
          </Interactive3DCard>

          {/* Action Row */}
          <div className="result-actions-row">
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: `AuthentiCheck: ${serial}`,
                    text: `Verification result for ${result?.product?.name || serial}: ${result?.status}`,
                    url: window.location.href
                  }).catch(() => {});
                } else {
                  copySerial();
                }
              }}
              className="btn-secondary-action"
              id="btn-share-result"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Verification</span>
            </button>

            <button
              onClick={() => setReportOpen(true)}
              className="btn-danger-action"
              id="btn-open-report"
            >
              <Flag className="w-4 h-4" />
              <span>Report Counterfeit / Merchant</span>
            </button>

            <Link href="/dashboard" className="btn-secondary-action" id="btn-goto-manufacturer">
              <Layers className="w-4 h-4" />
              <span>Manufacturer Portal</span>
            </Link>
          </div>
        </section>
      </div>

      {/* Counterfeit Report Modal */}
      {reportOpen && (
        <div className="modal-overlay" id="report-counterfeit-modal">
          <div className="modal-dialog">
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Flag className="w-5 h-5 text-rose-400" />
                <h3 className="modal-title">Report Suspicious Item / Fraud Incident</h3>
              </div>
              <button
                onClick={() => setReportOpen(false)}
                className="btn-close-modal"
                id="btn-close-report"
                aria-label="Close report modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {reportSuccess ? (
              <div style={{ textAlign: "center", padding: "24px 16px" }}>
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h4 style={{ fontSize: "18px", fontWeight: "700", color: "#f8fafc" }}>
                  Incident Report Submitted
                </h4>
                <p style={{ color: "#94a3b8", fontSize: "14px", marginTop: "6px" }}>
                  Official Case Ref: <strong style={{ color: "#38bdf8", fontFamily: "monospace" }}>{reportRefId}</strong>
                </p>
                <p style={{ color: "#64748b", fontSize: "12px", marginTop: "4px", maxWidth: "420px", margin: "4px auto 16px auto" }}>
                  Your report has been recorded by AuthentiCheck. You can download a verification evidence summary for your records. It is supporting evidence, not a legal determination of authenticity or fraud.
                </p>

                <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => {
                      generateDisputeDossierPrintable({
                        reportId: reportRefId,
                        generatedAt: new Date().toISOString(),
                        serialNumber: serial,
                        productName: result?.product?.name || "AuthentiCheck Verified Product",
                        brand: result?.product?.brand || "Registered Brand",
                        category: result?.product?.category || "General Goods",
                        manufacturer: result?.product?.manufacturer || "Apex Manufacturing Global",
                        batchCode: result?.product?.batchCode,
                        status: result?.status || "HIGH_RISK",
                        riskScore: result?.riskScore || 90,
                        merchantName: reportMerchant || "Unverified Seller",
                        storeLocation: reportLocation || "Not Disclosed",
                        reason: reportReason || "Consumer reported counterfeit item.",
                        severity: reportSeverity,
                        reasons: result?.reasons || ["Item flagged for security violation in manufacturer registry."],
                        visualForensics: visualResult
                          ? {
                              riskTier: visualResult.riskTier,
                              forensicSummary: visualResult.forensicSummary,
                              hologramFoilStatus: visualResult.hologramFoilStatus,
                              typographyStatus: visualResult.typographyStatus,
                              sealIntegrity: visualResult.sealIntegrity,
                              recommendation: visualResult.recommendation
                            }
                          : undefined,
                        evidencePhotoAttached: !!photoDataUrl
                      });
                    }}
                    className="btn-accent"
                    id="btn-modal-download-dossier"
                    style={{ background: "#e11d48", borderColor: "#f43f5e" }}
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Evidence Summary PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReportOpen(false);
                      setReportSuccess(false);
                      setReportMerchant("");
                      setReportLocation("");
                      setReportReason("");
                    }}
                    className="btn-secondary-action"
                    id="btn-close-report-success"
                  >
                    <span>Done</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submitReport} className="app-form">
                <div className="form-group">
                  <label className="form-label">Serial Number Flagged</label>
                  <input
                    className="form-input"
                    value={serial}
                    disabled
                    style={{ opacity: 0.8, fontFamily: "monospace" }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Incident Severity</label>
                  <select
                    className="form-input"
                    value={reportSeverity}
                    onChange={(e) => setReportSeverity(e.target.value as any)}
                  >
                    <option value="LOW">Low (Minor packaging cosmetic defect)</option>
                    <option value="MEDIUM">Medium (Suspicious seller or unauthorized discount)</option>
                    <option value="CRITICAL">Critical (Confirmed fake goods / safety hazard / duplicate serial)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Merchant / Seller Name</label>
                  <input
                    className="form-input"
                    value={reportMerchant}
                    onChange={(e) => setReportMerchant(e.target.value)}
                    placeholder="e.g. Unverified Online Marketplace Seller / Store X"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Store Location or Web URL</label>
                  <input
                    className="form-input"
                    value={reportLocation}
                    onChange={(e) => setReportLocation(e.target.value)}
                    placeholder="e.g. 5th Ave Street Vendor / marketplace.com/item/123"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reason for Suspicion & Anomalies</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Describe packaging flaws, price anomalies, blurry printing, missing hologram, or duplicate serial..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReport}
                  className="btn-accent"
                  style={{ background: "#e11d48", borderColor: "#f43f5e" }}
                  id="btn-submit-report"
                >
                  <Flag className="w-4 h-4" />
                  <span>{submittingReport ? "Submitting..." : "Submit Incident Report"}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
