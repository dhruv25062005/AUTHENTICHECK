"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Store,
  Search,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ExternalLink,
  ShieldCheck,
  Building,
  ArrowRight,
  Info,
  Radio
} from "lucide-react";
import Interactive3DCard from "../components/Interactive3DCard";

interface AuthorizedMerchant {
  id: string;
  name: string;
  domainOrSlug: string;
  category: string;
  status: "AUTHORIZED" | "SUSPECT" | "BLACKLISTED";
  trustScore: number;
  authorizedBrands: string[];
  websiteUrl?: string;
  warningNotice?: string;
  verifiedSince?: string;
}

interface SafetyAdvisory {
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
}

export default function MerchantsPage() {
  const [merchants, setMerchants] = useState<AuthorizedMerchant[]>([]);
  const [advisories, setAdvisories] = useState<SafetyAdvisory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"ALL" | "AUTHORIZED" | "SUSPECT" | "BLACKLISTED">("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const url = searchQuery
          ? `/api/v1/merchants?q=${encodeURIComponent(searchQuery)}`
          : "/api/v1/merchants";
        const res = await fetch(url);
        const data = await res.json();
        const rawMerchants: AuthorizedMerchant[] = data.merchants || [];
        // Ensure unique merchant entries by id to avoid duplicate React keys
        const uniqueMerchants = Array.from(
          new Map(rawMerchants.map((m) => [m.id, m])).values()
        );
        setMerchants(uniqueMerchants);
        setAdvisories(data.advisories || []);
      } catch (err) {
        console.error("Failed to load merchants:", err);
      } finally {
        setLoading(false);
      }
    }
    const timer = setTimeout(loadData, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredMerchants = merchants.filter((m) => {
    if (selectedFilter === "ALL") return true;
    return m.status === selectedFilter;
  });

  return (
    <main id="merchants-directory-page" className="directory-page-container">
      {/* Header Banner */}
      <section className="directory-header-section">
        <div className="directory-badge">
          <Store className="w-4 h-4 text-sky-400" />
          <span>Official Distribution Integrity Network</span>
        </div>
        <h1 className="directory-main-title">
          Authorized Seller & Marketplace Directory
        </h1>
        <p className="directory-sub-title">
          Before paying online or in-store, verify if your seller, boutique website, or marketplace vendor is an officially licensed dealer or a flagged counterfeit source.
        </p>

        {/* Search Bar */}
        <div className="search-bar-wrapper">
          <div className="search-input-box">
            <Search className="w-5 h-5 text-slate-400" />
            <input
              type="text"
              className="directory-search-field"
              placeholder="Search seller by name, store domain (e.g., aurahorology.com), or brand..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="input-search-merchant"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="filter-pills-row">
          <button
            type="button"
            className={`filter-pill ${selectedFilter === "ALL" ? "active" : ""}`}
            onClick={() => setSelectedFilter("ALL")}
            id="filter-all"
          >
            All Registered Entities ({merchants.length})
          </button>
          <button
            type="button"
            className={`filter-pill authorized ${selectedFilter === "AUTHORIZED" ? "active" : ""}`}
            onClick={() => setSelectedFilter("AUTHORIZED")}
            id="filter-authorized"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Authorized Dealers
          </button>
          <button
            type="button"
            className={`filter-pill suspect ${selectedFilter === "SUSPECT" ? "active" : ""}`}
            onClick={() => setSelectedFilter("SUSPECT")}
            id="filter-suspect"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Unverified / Suspect
          </button>
          <button
            type="button"
            className={`filter-pill blacklisted ${selectedFilter === "BLACKLISTED" ? "active" : ""}`}
            onClick={() => setSelectedFilter("BLACKLISTED")}
            id="filter-blacklisted"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            Confirmed Rogue / Blacklisted
          </button>
        </div>
      </section>

      {/* Active Brand Safety Advisories */}
      {advisories.length > 0 && (
        <section className="advisories-section" id="active-safety-advisories">
          <div className="section-title-row">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
              <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#f8fafc" }}>
                Active Brand Safety & Fraud Advisories
              </h2>
            </div>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>
              Issued by registered manufacturers & customs authorities
            </span>
          </div>

          <div className="advisories-grid">
            {advisories.map((adv) => (
              <div key={adv.id} className={`advisory-card ${adv.severity.toLowerCase()}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "8px" }}>
                  <span className={`advisory-badge ${adv.severity.toLowerCase()}`}>
                    {adv.severity} ADVISORY
                  </span>
                  <span style={{ fontSize: "11px", color: "#64748b" }}>
                    {adv.brand} · {adv.category}
                  </span>
                </div>
                <h3 style={{ fontSize: "15px", fontWeight: "700", color: "#f8fafc", marginBottom: "6px" }}>
                  {adv.headline}
                </h3>
                <p style={{ fontSize: "13px", color: "#94a3b8", lineHeight: 1.5, marginBottom: "10px" }}>
                  {adv.details}
                </p>
                <div className="advisory-action-box">
                  <Info className="w-4 h-4 text-sky-400 shrink-0" />
                  <span style={{ fontSize: "12px", color: "#cbd5e1" }}>
                    <strong>Action:</strong> {adv.actionRequired}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Merchants Grid */}
      <section className="merchants-catalog-section" id="merchants-catalog">
        <div className="section-title-row">
          <h2 style={{ fontSize: "18px", fontWeight: "700", color: "#f8fafc" }}>
            Merchant Verification Results
          </h2>
          <span style={{ fontSize: "13px", color: "#94a3b8" }}>
            Showing {filteredMerchants.length} vendor records
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div className="loading-spinner" />
            <p style={{ color: "#94a3b8", marginTop: "12px" }}>Querying authorized distributor ledger...</p>
          </div>
        ) : filteredMerchants.length === 0 ? (
          <div className="empty-merchants-box">
            <ShieldAlert className="w-10 h-10 text-slate-500 mb-3" />
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#f8fafc" }}>
              No Exact Match in Manufacturer Registry
            </h3>
            <p style={{ color: "#94a3b8", fontSize: "13px", maxWidth: "460px", margin: "6px auto 16px auto" }}>
              The merchant or website URL &quot;{searchQuery}&quot; is not an accredited distributor. Exercise high caution before transacting.
            </p>
            <Link href="/" className="btn-accent">
              Verify Product Serial Instead
            </Link>
          </div>
        ) : (
          <div className="merchants-grid">
            {filteredMerchants.map((merchant) => {
              const isAuth = merchant.status === "AUTHORIZED";
              const isSuspect = merchant.status === "SUSPECT";
              const isBlacklisted = merchant.status === "BLACKLISTED";

              return (
                <Interactive3DCard key={merchant.id} depth={10}>
                  <div
                    className={`merchant-card ${merchant.status.toLowerCase()}`}
                    id={`merchant-card-${merchant.id}`}
                    style={{ height: "100%", margin: 0 }}
                  >
                    <div className="merchant-card-top">
                      <div>
                        <div className={`merchant-status-tag ${merchant.status.toLowerCase()}`}>
                          {isAuth && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          {isSuspect && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                          {isBlacklisted && <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />}
                          <span>{merchant.status}</span>
                        </div>
                        <h3 className="merchant-title">{merchant.name}</h3>
                        <p className="merchant-domain">{merchant.domainOrSlug}</p>
                      </div>

                      <div className="trust-score-badge">
                        <span className="trust-score-number">{merchant.trustScore}%</span>
                        <span className="trust-score-sub">Trust Score</span>
                      </div>
                    </div>

                    <div className="merchant-meta-list">
                      <div className="merchant-meta-item">
                        <span className="meta-label">Category:</span>
                        <span className="meta-val">{merchant.category}</span>
                      </div>
                      {merchant.authorizedBrands.length > 0 && (
                        <div className="merchant-meta-item">
                          <span className="meta-label">Licensed Brands:</span>
                          <div className="brand-tags-container">
                            {merchant.authorizedBrands.map((b, i) => (
                              <span key={i} className="brand-pill-tag">
                                {b}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {merchant.verifiedSince && (
                        <div className="merchant-meta-item">
                          <span className="meta-label">Network Verified:</span>
                          <span className="meta-val">Since {merchant.verifiedSince}</span>
                        </div>
                      )}
                    </div>

                    {merchant.warningNotice && (
                      <div className="merchant-warning-box">
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <p className="merchant-warning-text">{merchant.warningNotice}</p>
                      </div>
                    )}

                    <div className="merchant-card-actions">
                      {merchant.websiteUrl && (
                        <a
                          href={merchant.websiteUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="btn-secondary-action"
                          style={{ fontSize: "12px", padding: "6px 12px" }}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Visit Domain</span>
                        </a>
                      )}
                      <Link
                        href="/"
                        className="btn-accent"
                        style={{ fontSize: "12px", padding: "6px 12px", marginLeft: "auto" }}
                      >
                        <span>Verify An Item</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </Interactive3DCard>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
