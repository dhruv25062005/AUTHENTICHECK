"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiUrl } from "../../lib/api";
import {
  Package,
  Layers,
  QrCode,
  ShieldCheck,
  Plus,
  Search,
  ExternalLink,
  Download,
  AlertTriangle,
  X,
  CheckCircle2,
  Calendar,
  Hash,
  Copy,
  Check,
  Flag,
  BarChart3,
  Printer,
  FileSpreadsheet,
  Building2,
  RefreshCw,
  Eye
} from "lucide-react";

type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  description?: string;
  instance_count: number;
  batch_count: number;
};

type BatchItem = {
  id: string;
  productId: string;
  batchCode: string;
  manufacturingDate: string;
  quantity: number;
  createdAt: string;
  sampleSerials?: string[];
};

type ReportItem = {
  id: string;
  serialNumber: string;
  productName?: string;
  merchantName: string;
  storeLocation: string;
  reason: string;
  severity?: "LOW" | "MEDIUM" | "CRITICAL";
  status?: "PENDING" | "INVESTIGATING" | "RESOLVED";
  createdAt: string;
};

type AnalyticsData = {
  metrics: {
    totalProducts: number;
    totalInstances: number;
    totalReports: number;
    totalScans: number;
    genuinePercentage: number;
    suspiciousPercentage: number;
    highRiskPercentage: number;
  };
  recentScans: Array<{
    id: string;
    serialNumber: string;
    status: string;
    riskScore: number;
    location?: string;
    timestamp: string;
  }>;
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<"CATALOG" | "BATCHES" | "REPORTS" | "ANALYTICS">("CATALOG");
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Product Creation Modal
  const [newProductModal, setNewProductModal] = useState(false);
  const [prodName, setProdName] = useState("");
  const [prodBrand, setProdBrand] = useState("");
  const [prodCategory, setProdCategory] = useState("Consumer Electronics");
  const [prodDesc, setProdDesc] = useState("");
  const [creatingProduct, setCreatingProduct] = useState(false);

  // Batch Generation Modal
  const [batchModal, setBatchModal] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [batchCode, setBatchCode] = useState("");
  const [batchDate, setBatchDate] = useState(new Date().toISOString().split("T")[0]);
  const [batchQty, setBatchQty] = useState(25);
  const [batchPrefix, setBatchPrefix] = useState("AC");
  const [generatingBatch, setGeneratingBatch] = useState(false);
  const [batchSuccess, setBatchSuccess] = useState<{ count: number; samples: string[]; allSerials?: string[] } | null>(null);

  // QR Code Single Viewer Modal
  const [qrModal, setQrModal] = useState(false);
  const [activeSerial, setActiveSerial] = useState("AC-DEMO-001");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrVerificationUrl, setQrVerificationUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Printable Batch Sticker Sheet Modal
  const [labelSheetModal, setLabelSheetModal] = useState(false);
  const [activeBatchForLabels, setActiveBatchForLabels] = useState<BatchItem | null>(null);

  const fetchDashboardData = (authToken: string) => {
    // Products
    fetch(apiUrl("/api/v1/products"), {
      headers: { Authorization: `Bearer ${authToken}` }
    })
      .then((r) => r.json())
      .then((data) => setProducts(data.products || []))
      .catch((err) => console.error("Failed to load products:", err));

    // Batches
    fetch(apiUrl("/api/v1/batches"), {
      headers: { Authorization: `Bearer ${authToken}` }
    })
      .then((r) => r.json())
      .then((data) => setBatches(data.batches || []))
      .catch((err) => console.error("Failed to load batches:", err));

    // Reports
    fetch(apiUrl("/api/v1/reports"), {
      headers: { Authorization: `Bearer ${authToken}` }
    })
      .then((r) => r.json())
      .then((data) => setReports(data.reports || []))
      .catch((err) => console.error("Failed to load reports:", err));

    // Analytics
    fetch(apiUrl("/api/v1/analytics"), {
      headers: { Authorization: `Bearer ${authToken}` }
    })
      .then((r) => r.json())
      .then((data) => setAnalytics(data))
      .catch((err) => console.error("Failed to load analytics:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const activeToken = localStorage.getItem("authenti_token") || "";
    setToken(activeToken);
    if (activeToken) fetchDashboardData(activeToken);
    else setLoading(false);
  }, []);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName || !prodBrand) return;
    setCreatingProduct(true);
    try {
      const res = await fetch(apiUrl("/api/v1/products"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: prodName,
          brand: prodBrand,
          category: prodCategory,
          description: prodDesc
        })
      });
      if (res.ok) {
        setNewProductModal(false);
        setProdName("");
        setProdBrand("");
        setProdDesc("");
        fetchDashboardData(token);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleGenerateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !batchCode) return;
    setGeneratingBatch(true);
    try {
      const res = await fetch(apiUrl("/api/v1/batches"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          productId: selectedProductId,
          batchCode,
          manufacturingDate: batchDate,
          quantity: batchQty,
          prefix: batchPrefix
        })
      });
      const data = await res.json();
      if (res.ok) {
        setBatchSuccess({
          count: data.instancesCreated,
          samples: data.sampleSerials,
          allSerials: data.allSerials
        });
        fetchDashboardData(token);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingBatch(false);
    }
  };

  const openQrViewer = async (serial: string) => {
    setActiveSerial(serial);
    setQrModal(true);
    try {
      const res = await fetch(apiUrl(`/api/v1/qr/serial/${encodeURIComponent(serial)}`), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setQrDataUrl(data.qrDataUrl);
      setQrVerificationUrl(data.verificationUrl);
    } catch (err) {
      console.error(err);
    }
  };

  const exportBatchCsv = (batch: BatchItem) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const prod = products.find((p) => p.id === batch.productId);
    const prodName = prod?.name || "Product";

    const serials = batch.sampleSerials && batch.sampleSerials.length > 0
      ? batch.sampleSerials
      : [`${batch.batchCode}-001`, `${batch.batchCode}-002`];

    let csv = "SerialNumber,ProductName,BatchCode,ManufacturingDate,VerificationURL,Status
";
    serials.forEach((sn) => {
      const vUrl = `${origin}/verify/${sn}`;
      csv += `"${sn}","${prodName}","${batch.batchCode}","${batch.manufacturingDate}","${vUrl}","ACTIVE"
`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `authenticheck-batch-${batch.batchCode}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!token && !loading) {
    return (
      <main id="auth-required-view">
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <div className="badge-tag mb-4">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>Authorized Brand Access Only</span>
          </div>
          <h1 style={{ fontSize: "32px", fontWeight: "800", color: "#f8fafc", margin: "16px 0" }}>
            Manufacturer Sign-In Required
          </h1>
          <p style={{ color: "#94a3b8", maxWidth: "540px", margin: "0 auto 28px auto", fontSize: "16px" }}>
            To manage registered brand catalogs, configure serialized batch cryptographic tokens,
            export QR labels, and inspect counterfeit incident alerts, please sign in.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <Link href="/login" className="btn-accent" id="btn-login-redirect">
              Sign In to Manufacturer Portal
            </Link>
            <Link href="/register" className="btn-secondary-action" id="btn-register-redirect">
              Register New Organization
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalBatches = batches.length || products.reduce((n, p) => n + (p.batch_count || 0), 0);
  const totalInstances = products.reduce((n, p) => n + (p.instance_count || 0), 0);

  return (
    <main id="manufacturer-dashboard">
      <div className="dashboard-header-block">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div className="badge-tag" id="dashboard-role-tag">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>Enterprise Ledger & Manufacturer Portal</span>
          </div>
          <button
            type="button"
            onClick={() => token && fetchDashboardData(token)}
            className="btn-secondary-action"
            style={{ fontSize: "12px", padding: "6px 10px" }}
            title="Refresh ledger state"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Sync Ledger</span>
          </button>
        </div>

        <h1 className="hero-heading" style={{ fontSize: "34px", margin: "12px 0 6px 0" }}>
          Product Registry & Serial Ledger
        </h1>
        <p className="hero-subtitle">
          Manage brand portfolios, dispatch factory batch serials, export print-ready QR labels, and triage consumer counterfeit reports.
        </p>
      </div>

      {/* Real-time Metrics Row */}
      <div className="dashboard-stats-grid" id="dashboard-metric-cards">
        <div className="stat-card" id="stat-products">
          <div className="stat-header">
            <span>Registered Products</span>
            <Package className="w-5 h-5 text-sky-400" />
          </div>
          <div className="stat-val">{products.length}</div>
          <span className="stat-sub">Active Brand SKUs</span>
        </div>

        <div className="stat-card" id="stat-batches">
          <div className="stat-header">
            <span>Production Batches</span>
            <Layers className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="stat-val">{totalBatches}</div>
          <span className="stat-sub">Dispatched Allocations</span>
        </div>

        <div className="stat-card" id="stat-instances">
          <div className="stat-header">
            <span>Serialized Units</span>
            <Hash className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="stat-val">{totalInstances.toLocaleString()}</div>
          <span className="stat-sub">Cryptographic Identities</span>
        </div>

        <div className="stat-card" id="stat-anomalies">
          <div className="stat-header">
            <span>Counterfeit Reports</span>
            <Flag className="w-5 h-5 text-rose-400" />
          </div>
          <div className="stat-val" style={{ color: "#fb7185" }}>{reports.length}</div>
          <span className="stat-sub">{reports.filter((r) => r.severity === "CRITICAL").length} Critical Incidents</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          borderBottom: "1px solid var(--border-dim)",
          paddingBottom: "12px",
          margin: "24px 0 20px 0",
          overflowX: "auto"
        }}
        id="dashboard-tabs"
      >
        <button
          type="button"
          onClick={() => setActiveTab("CATALOG")}
          className={`btn-secondary-action ${activeTab === "CATALOG" ? "active-tab" : ""}`}
          style={{
            background: activeTab === "CATALOG" ? "rgba(56, 189, 248, 0.15)" : "transparent",
            color: activeTab === "CATALOG" ? "#38bdf8" : "#94a3b8",
            borderColor: activeTab === "CATALOG" ? "rgba(56, 189, 248, 0.4)" : "var(--border-dim)"
          }}
          id="tab-btn-catalog"
        >
          <Package className="w-4 h-4" />
          <span>Product Catalog ({products.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("BATCHES")}
          className={`btn-secondary-action ${activeTab === "BATCHES" ? "active-tab" : ""}`}
          style={{
            background: activeTab === "BATCHES" ? "rgba(56, 189, 248, 0.15)" : "transparent",
            color: activeTab === "BATCHES" ? "#38bdf8" : "#94a3b8",
            borderColor: activeTab === "BATCHES" ? "rgba(56, 189, 248, 0.4)" : "var(--border-dim)"
          }}
          id="tab-btn-batches"
        >
          <Layers className="w-4 h-4" />
          <span>Batches & QR Label Sheets ({batches.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("REPORTS")}
          className={`btn-secondary-action ${activeTab === "REPORTS" ? "active-tab" : ""}`}
          style={{
            background: activeTab === "REPORTS" ? "rgba(244, 63, 94, 0.15)" : "transparent",
            color: activeTab === "REPORTS" ? "#fb7185" : "#94a3b8",
            borderColor: activeTab === "REPORTS" ? "rgba(244, 63, 94, 0.4)" : "var(--border-dim)"
          }}
          id="tab-btn-reports"
        >
          <Flag className="w-4 h-4" />
          <span>Fraud & Incident Reports ({reports.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ANALYTICS")}
          className={`btn-secondary-action ${activeTab === "ANALYTICS" ? "active-tab" : ""}`}
          style={{
            background: activeTab === "ANALYTICS" ? "rgba(56, 189, 248, 0.15)" : "transparent",
            color: activeTab === "ANALYTICS" ? "#38bdf8" : "#94a3b8",
            borderColor: activeTab === "ANALYTICS" ? "rgba(56, 189, 248, 0.4)" : "var(--border-dim)"
          }}
          id="tab-btn-analytics"
        >
          <BarChart3 className="w-4 h-4" />
          <span>Scan Audit & Velocity</span>
        </button>
      </div>

      {/* TAB 1: PRODUCT CATALOG */}
      {activeTab === "CATALOG" && (
        <div>
          <div className="dashboard-action-bar">
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, maxWidth: "420px" }}>
              <div style={{ position: "relative", width: "100%" }}>
                <Search
                  className="w-4 h-4 text-slate-400"
                  style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }}
                />
                <input
                  type="text"
                  placeholder="Search products, brands, or categories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ paddingLeft: "36px" }}
                  id="input-search-products"
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => setNewProductModal(true)}
                className="btn-accent"
                id="btn-open-create-product"
              >
                <Plus className="w-4 h-4" />
                <span>Register Product</span>
              </button>
              <button
                onClick={() => {
                  if (products.length > 0) {
                    setSelectedProductId(products[0].id);
                    setBatchModal(true);
                    setBatchSuccess(null);
                  }
                }}
                className="btn-secondary-action"
                id="btn-open-generate-batch"
              >
                <Layers className="w-4 h-4" />
                <span>Dispatch Batch</span>
              </button>
            </div>
          </div>

          <div className="product-inventory-grid" id="product-inventory-grid">
            {filteredProducts.map((p) => (
              <article key={p.id} className="inventory-card" id={`product-card-${p.id}`}>
                <div className="inventory-card-top">
                  <div>
                    <h3 className="inventory-title">{p.name}</h3>
                    <p className="inventory-brand">
                      {p.brand} · <span style={{ color: "#38bdf8" }}>{p.category}</span>
                    </p>
                  </div>
                  <span className="badge-tag" style={{ fontSize: "11px", padding: "3px 8px" }}>
                    Active
                  </span>
                </div>

                {p.description && (
                  <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.5 }}>
                    {p.description}
                  </p>
                )}

                <div className="inventory-metrics-row">
                  <div className="metric-col">
                    <span className="metric-label">Batches</span>
                    <span className="metric-val">{p.batch_count || 0}</span>
                  </div>
                  <div className="metric-col" style={{ marginLeft: "24px" }}>
                    <span className="metric-label">Units Serialized</span>
                    <span className="metric-val">{p.instance_count || 0}</span>
                  </div>
                </div>

                <div className="inventory-actions">
                  <button
                    onClick={() => {
                      setSelectedProductId(p.id);
                      setBatchCode(`${p.brand.substring(0, 3).toUpperCase()}-B${(p.batch_count || 0) + 1}`);
                      setBatchModal(true);
                      setBatchSuccess(null);
                    }}
                    className="btn-secondary-action"
                    style={{ fontSize: "13px", padding: "8px 12px" }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Batch</span>
                  </button>

                  <button
                    onClick={() => openQrViewer(p.id === "prod-2" ? "AC-SUS-44102" : "AC-DEMO-001")}
                    className="btn-secondary-action"
                    style={{ fontSize: "13px", padding: "8px 12px" }}
                  >
                    <QrCode className="w-3.5 h-3.5 text-sky-400" />
                    <span>View QR</span>
                  </button>

                  <Link
                    href={`/verify/${p.id === "prod-2" ? "AC-SUS-44102" : "AC-DEMO-001"}`}
                    className="btn-secondary-action"
                    style={{ fontSize: "13px", padding: "8px 12px", marginLeft: "auto" }}
                    title="Verify sample serial"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: BATCHES & LABEL PRINTING */}
      {activeTab === "BATCHES" && (
        <div id="batches-management-view">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "10px" }}>
            <div>
              <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#f8fafc" }}>
                Production Batches & Factory Allocation
              </h3>
              <p style={{ fontSize: "13px", color: "#94a3b8" }}>
                Download serialized CSV records or print adhesive QR label sheets for assembly lines.
              </p>
            </div>
            <button
              onClick={() => {
                if (products.length > 0) {
                  setSelectedProductId(products[0].id);
                  setBatchModal(true);
                  setBatchSuccess(null);
                }
              }}
              className="btn-accent"
            >
              <Plus className="w-4 h-4" />
              <span>Dispatch New Batch</span>
            </button>
          </div>

          <div style={{ display: "grid", gap: "14px" }}>
            {batches.map((batch) => {
              const product = products.find((p) => p.id === batch.productId);
              return (
                <div
                  key={batch.id}
                  style={{
                    padding: "18px 20px",
                    background: "rgba(12, 24, 40, 0.8)",
                    borderRadius: "12px",
                    border: "1px solid var(--border-dim)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "14px"
                  }}
                  id={`batch-row-${batch.id}`}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <h4 style={{ fontSize: "16px", fontWeight: "700", color: "#f8fafc" }}>
                        {batch.batchCode}
                      </h4>
                      <span className="badge-tag" style={{ fontSize: "11px", padding: "2px 8px" }}>
                        {batch.quantity} Units
                      </span>
                    </div>
                    <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "4px" }}>
                      Product: <strong style={{ color: "#e2e8f0" }}>{product?.name || "Registered SKU"}</strong> · Manufactured: {batch.manufacturingDate}
                    </p>
                    {batch.sampleSerials && batch.sampleSerials.length > 0 && (
                      <div style={{ display: "flex", gap: "6px", marginTop: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "11px", color: "#64748b" }}>Serials:</span>
                        {batch.sampleSerials.slice(0, 4).map((s, idx) => (
                          <span key={idx} style={{ fontSize: "11px", fontFamily: "monospace", color: "#38bdf8", background: "rgba(56, 189, 248, 0.1)", padding: "1px 6px", borderRadius: "4px" }}>
                            {s}
                          </span>
                        ))}
                        {batch.sampleSerials.length > 4 && (
                          <span style={{ fontSize: "11px", color: "#64748b" }}>+{batch.sampleSerials.length - 4} more</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => exportBatchCsv(batch)}
                      className="btn-secondary-action"
                      style={{ fontSize: "12px", padding: "6px 12px" }}
                      title="Download CSV for enterprise ERP integration"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Export CSV</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveBatchForLabels(batch);
                        setLabelSheetModal(true);
                      }}
                      className="btn-secondary-action"
                      style={{ fontSize: "12px", padding: "6px 12px" }}
                      title="Print factory adhesive QR sticker sheet"
                    >
                      <Printer className="w-3.5 h-3.5 text-sky-400" />
                      <span>Print Label Sheet</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: COUNTERFEIT & FRAUD REPORTS */}
      {activeTab === "REPORTS" && (
        <div id="reports-management-view">
          <div style={{ marginBottom: "18px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#f8fafc" }}>
              Counterfeit & Fraud Incident Triage
            </h3>
            <p style={{ fontSize: "13px", color: "#94a3b8" }}>
              Investigate consumer fraud reports, rogue marketplace listings, and suspicious retail vendors.
            </p>
          </div>

          {reports.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", background: "rgba(12, 24, 40, 0.5)", borderRadius: "12px" }}>
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p style={{ color: "#94a3b8" }}>No counterfeit incident reports logged yet.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: "12px" }}>
              {reports.map((r) => (
                <div
                  key={r.id}
                  style={{
                    padding: "16px 20px",
                    background: "rgba(15, 23, 42, 0.8)",
                    borderRadius: "12px",
                    border: "1px solid var(--border-dim)"
                  }}
                  id={`report-item-${r.id}`}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          background: r.severity === "CRITICAL" ? "rgba(244, 63, 94, 0.2)" : "rgba(251, 191, 36, 0.2)",
                          color: r.severity === "CRITICAL" ? "#fb7185" : "#fbbf24"
                        }}
                      >
                        {r.severity || "MEDIUM"} PRIORITY
                      </span>
                      <strong style={{ color: "#f8fafc", fontFamily: "monospace", fontSize: "14px" }}>
                        {r.serialNumber}
                      </strong>
                      <span style={{ fontSize: "13px", color: "#94a3b8" }}>· {r.productName || "Product"}</span>
                    </div>

                    <span style={{ fontSize: "12px", color: "#64748b" }}>
                      Reported: {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <div style={{ fontSize: "13px", color: "#cbd5e1", margin: "6px 0", lineHeight: 1.5 }}>
                    <strong>Allegation:</strong> {r.reason}
                  </div>

                  <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "#94a3b8", marginTop: "8px" }}>
                    <span>Vendor: <strong style={{ color: "#e2e8f0" }}>{r.merchantName}</strong></span>
                    <span>Location: <strong style={{ color: "#e2e8f0" }}>{r.storeLocation}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AUDIT & ANALYTICS */}
      {activeTab === "ANALYTICS" && analytics && (
        <div id="analytics-management-view">
          <div style={{ marginBottom: "18px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "700", color: "#f8fafc" }}>
              Cryptographic Audit Trail & Velocity Log
            </h3>
            <p style={{ fontSize: "13px", color: "#94a3b8" }}>
              Global verification activity, pass/fail status distributions, and recent forensic queries.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
            <div style={{ padding: "16px", background: "rgba(12, 24, 40, 0.8)", borderRadius: "10px", border: "1px solid var(--border-dim)" }}>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>Genuine Verification Ratio</div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "#34d399", marginTop: "4px" }}>
                {analytics.metrics.genuinePercentage}%
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>Cryptographically authentic</div>
            </div>

            <div style={{ padding: "16px", background: "rgba(12, 24, 40, 0.8)", borderRadius: "10px", border: "1px solid var(--border-dim)" }}>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>Velocity Anomaly Ratio</div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "#fbbf24", marginTop: "4px" }}>
                {analytics.metrics.suspiciousPercentage}%
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>Elevated repeat scans</div>
            </div>

            <div style={{ padding: "16px", background: "rgba(12, 24, 40, 0.8)", borderRadius: "10px", border: "1px solid var(--border-dim)" }}>
              <div style={{ fontSize: "12px", color: "#94a3b8" }}>Unregistered / Counterfeit</div>
              <div style={{ fontSize: "28px", fontWeight: "800", color: "#fb7185", marginTop: "4px" }}>
                {analytics.metrics.highRiskPercentage}%
              </div>
              <div style={{ fontSize: "11px", color: "#64748b", marginTop: "4px" }}>Definite fraud blocked</div>
            </div>
          </div>

          <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#f8fafc", marginBottom: "12px" }}>
            Recent Scan Events Log
          </h4>

          <div style={{ background: "rgba(15, 23, 42, 0.8)", borderRadius: "10px", border: "1px solid var(--border-dim)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-dim)", background: "rgba(11, 20, 38, 0.8)", textAlign: "left", color: "#94a3b8" }}>
                  <th style={{ padding: "12px 16px" }}>Serial Number</th>
                  <th style={{ padding: "12px 16px" }}>Result Status</th>
                  <th style={{ padding: "12px 16px" }}>Risk Score</th>
                  <th style={{ padding: "12px 16px" }}>Location Node</th>
                  <th style={{ padding: "12px 16px" }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {analytics.recentScans.map((scan) => (
                  <tr key={scan.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <td style={{ padding: "12px 16px", fontFamily: "monospace", color: "#38bdf8", fontWeight: "600" }}>
                      {scan.serialNumber}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: "700",
                          padding: "2px 8px",
                          borderRadius: "10px",
                          background:
                            scan.status === "GENUINE"
                              ? "rgba(52, 211, 153, 0.15)"
                              : scan.status === "SUSPICIOUS"
                              ? "rgba(251, 191, 36, 0.15)"
                              : "rgba(244, 63, 94, 0.15)",
                          color:
                            scan.status === "GENUINE"
                              ? "#34d399"
                              : scan.status === "SUSPICIOUS"
                              ? "#fbbf24"
                              : "#fb7185"
                        }}
                      >
                        {scan.status}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", color: "#cbd5e1" }}>{scan.riskScore}/100</td>
                    <td style={{ padding: "12px 16px", color: "#94a3b8" }}>{scan.location || "Online Node"}</td>
                    <td style={{ padding: "12px 16px", color: "#64748b" }}>
                      {new Date(scan.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Product Modal */}
      {newProductModal && (
        <div className="modal-overlay" id="create-product-modal">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 className="modal-title">Register New Product Line</h3>
              <button
                onClick={() => setNewProductModal(false)}
                className="btn-close-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="app-form">
              <div className="form-group">
                <label className="form-label">Product Name</label>
                <input
                  className="form-input"
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="e.g. Chrono Diver Precision 200"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Brand Name</label>
                <input
                  className="form-input"
                  value={prodBrand}
                  onChange={(e) => setProdBrand(e.target.value)}
                  placeholder="e.g. Apex Horology"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={prodCategory}
                  onChange={(e) => setProdCategory(e.target.value)}
                >
                  <option value="Consumer Electronics">Consumer Electronics</option>
                  <option value="Luxury Watches">Luxury Watches</option>
                  <option value="Pharmaceuticals">Pharmaceuticals</option>
                  <option value="Cosmetics & Skincare">Cosmetics & Skincare</option>
                  <option value="Apparel & Footwear">Apparel & Footwear</option>
                  <option value="Automotive Parts">Automotive Parts</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description & Security Standards</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Packaging specifications, hologram standards, and factory reference..."
                />
              </div>

              <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setNewProductModal(false)}
                  className="btn-secondary-action"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingProduct}
                  className="btn-accent"
                >
                  {creatingProduct ? "Registering..." : "Register Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batch Generation Modal */}
      {batchModal && (
        <div className="modal-overlay" id="generate-batch-modal">
          <div className="modal-dialog">
            <div className="modal-header">
              <h3 className="modal-title">Dispatch Production Batch & Serials</h3>
              <button
                onClick={() => setBatchModal(false)}
                className="btn-close-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {batchSuccess ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h4 style={{ fontSize: "18px", fontWeight: "700", color: "#f8fafc" }}>
                  {batchSuccess.count} Serialized Tokens Generated!
                </h4>
                <p style={{ color: "#94a3b8", fontSize: "13px", marginTop: "6px" }}>
                  The items have been enrolled into the cryptographic verification engine and ledger.
                </p>

                <div
                  style={{
                    background: "var(--bg-main)",
                    borderRadius: "8px",
                    padding: "14px",
                    marginTop: "16px",
                    textAlign: "left"
                  }}
                >
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#64748b", textTransform: "uppercase" }}>
                    Sample Generated Serials:
                  </span>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
                    {batchSuccess.samples.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => openQrViewer(s)}
                        className="sample-chip genuine"
                        style={{ cursor: "pointer" }}
                        title="Click to view QR"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: "20px", display: "flex", justifyContent: "center", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setBatchModal(false)}
                    className="btn-accent"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleGenerateBatch} className="app-form">
                <div className="form-group">
                  <label className="form-label">Select Product SKU</label>
                  <select
                    className="form-select"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    required
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.brand})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Batch Identifier</label>
                  <input
                    className="form-input"
                    value={batchCode}
                    onChange={(e) => setBatchCode(e.target.value.toUpperCase())}
                    placeholder="e.g. LOT-2026-08A"
                    required
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div className="form-group">
                    <label className="form-label">Serial Prefix</label>
                    <input
                      className="form-input"
                      value={batchPrefix}
                      onChange={(e) => setBatchPrefix(e.target.value.toUpperCase())}
                      placeholder="e.g. AC"
                      maxLength={6}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Quantity to Generate</label>
                    <input
                      type="number"
                      className="form-input"
                      value={batchQty}
                      onChange={(e) => setBatchQty(Number(e.target.value))}
                      min={1}
                      max={500}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Manufacturing Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={batchDate}
                    onChange={(e) => setBatchDate(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setBatchModal(false)}
                    className="btn-secondary-action"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={generatingBatch}
                    className="btn-accent"
                  >
                    {generatingBatch ? "Generating..." : "Generate & Dispatch"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* QR Code Single Viewer Modal */}
      {qrModal && (
        <div className="modal-overlay" id="qr-viewer-modal">
          <div className="modal-dialog" style={{ maxWidth: "440px", textAlign: "center" }}>
            <div className="modal-header">
              <h3 className="modal-title">Tamper-Evident QR Token</h3>
              <button
                onClick={() => setQrModal(false)}
                className="btn-close-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div style={{ margin: "16px 0" }}>
              <div
                style={{
                  background: "#ffffff",
                  padding: "16px",
                  borderRadius: "12px",
                  display: "inline-block",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.4)"
                }}
              >
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR for ${activeSerial}`}
                    style={{ width: "220px", height: "220px", display: "block" }}
                  />
                ) : (
                  <div style={{ width: "220px", height: "220px", display: "flex", alignItems: "center", justifyContent: "center", color: "#333" }}>
                    Generating QR...
                  </div>
                )}
              </div>

              <p style={{ marginTop: "14px", fontSize: "14px", fontWeight: "700", color: "#f8fafc", fontFamily: "monospace" }}>
                Serial: {activeSerial}
              </p>
              <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                High-density ECC QR code with embedded cryptographic URL
              </p>
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
              {qrDataUrl && (
                <a
                  href={qrDataUrl}
                  download={`authenticheck-${activeSerial}.png`}
                  className="btn-secondary-action"
                  style={{ textDecoration: "none" }}
                >
                  <Download className="w-4 h-4" />
                  <span>Download Image</span>
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(qrVerificationUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="btn-secondary-action"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? "Copied!" : "Copy Link"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Batch Sticker Sheet Modal */}
      {labelSheetModal && activeBatchForLabels && (
        <div className="modal-overlay" id="printable-sheet-modal">
          <div className="modal-dialog" style={{ maxWidth: "720px", maxHeight: "90vh", overflowY: "auto" }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Printable Adhesive QR Sticker Sheet</h3>
                <p style={{ fontSize: "12px", color: "#94a3b8" }}>
                  Batch: {activeBatchForLabels.batchCode} · Ready for label printer or Avery sheet
                </p>
              </div>
              <button
                onClick={() => setLabelSheetModal(false)}
                className="btn-close-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", margin: "10px 0" }}>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn-accent"
              >
                <Printer className="w-4 h-4" />
                <span>Print Sticker Sheet</span>
              </button>
            </div>

            {/* Sticker Grid (Designed for print output) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                gap: "12px",
                padding: "16px",
                background: "#ffffff",
                borderRadius: "10px"
              }}
              id="printable-stickers-area"
            >
              {(activeBatchForLabels.sampleSerials || ["AC-DEMO-001", "AC-LUX-78291", "AC-SUS-44102"]).map((serial, idx) => (
                <div
                  key={idx}
                  style={{
                    border: "1px dashed #cbd5e1",
                    padding: "10px",
                    textAlign: "center",
                    background: "#ffffff",
                    borderRadius: "6px",
                    color: "#0f172a"
                  }}
                >
                  <div style={{ fontSize: "10px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    AuthentiCheck
                  </div>
                  <div style={{ margin: "6px auto", width: "100px", height: "100px", background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <QrCode className="w-20 h-20 text-slate-900" />
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: "700", fontFamily: "monospace" }}>
                    {serial}
                  </div>
                  <div style={{ fontSize: "9px", color: "#64748b" }}>
                    Scan to Verify
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
