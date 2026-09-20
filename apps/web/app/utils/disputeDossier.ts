export interface DisputeDossierData {
  reportId: string;
  generatedAt: string;
  serialNumber: string;
  productName: string;
  brand: string;
  category: string;
  manufacturer: string;
  batchCode?: string;
  status: string;
  riskScore: number;
  merchantName: string;
  storeLocation: string;
  reason: string;
  severity: string;
  reasons: string[];
  visualForensics?: {
    riskTier: string;
    forensicSummary: string;
    hologramFoilStatus: string;
    typographyStatus: string;
    sealIntegrity: string;
    recommendation: string;
  };
  evidencePhotoAttached: boolean;
}

export function generateDisputeDossierPrintable(data: DisputeDossierData): void {
  const printWindow = window.open("", "_blank", "width=840,height=960");
  if (!printWindow) {
    alert("Please allow popups to open the official Dispute Dossier.");
    return;
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>AuthentiCheck Official Dispute Dossier - ${data.reportId}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 40px;
      line-height: 1.5;
      font-size: 13px;
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      color: #0369a1;
      letter-spacing: 0.05em;
    }
    .brand-sub {
      font-size: 11px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 2px;
    }
    .dossier-id-box {
      text-align: right;
    }
    .badge-urgent {
      display: inline-block;
      background: #fee2e2;
      color: #b91c1c;
      font-weight: 700;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 11px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .id-code {
      font-family: monospace;
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
    }
    .statement-box {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-left: 4px solid #ef4444;
      padding: 14px 18px;
      margin-bottom: 24px;
      border-radius: 4px;
    }
    .statement-title {
      font-weight: 700;
      color: #991b1b;
      font-size: 14px;
      margin-bottom: 4px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-bottom: 12px;
    }
    .data-table {
      width: 100%;
      border-collapse: collapse;
    }
    .data-table td {
      padding: 6px 4px;
      border-bottom: 1px solid #f1f5f9;
    }
    .data-table td.label {
      color: #64748b;
      width: 40%;
      font-weight: 500;
    }
    .data-table td.val {
      color: #0f172a;
      font-weight: 600;
    }
    .reasons-box {
      background: #fff1f2;
      border: 1px solid #fecdd3;
      padding: 12px 16px;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    .reasons-box ul {
      list-style-type: square;
      padding-left: 20px;
      color: #9f1239;
    }
    .reasons-box li {
      margin-bottom: 4px;
    }
    .legal-notice {
      border-top: 1px solid #e2e8f0;
      padding-top: 16px;
      margin-top: 30px;
      font-size: 11px;
      color: #64748b;
      line-height: 1.6;
    }
    .signature-row {
      display: flex;
      justify-content: space-between;
      margin-top: 36px;
      padding-top: 10px;
    }
    .sig-line {
      width: 45%;
      border-top: 1px dashed #94a3b8;
      padding-top: 6px;
      font-size: 11px;
      color: #475569;
    }
    .btn-print-dossier {
      background: #0284c7;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      margin-bottom: 20px;
    }
    @media print {
      .btn-print-dossier { display: none; }
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <button class="btn-print-dossier" onclick="window.print()">Print / Save as PDF Evidence Pack</button>

  <div class="header-bar">
    <div>
      <div class="brand-title">AUTHENTICHECK INTEGRITY PROTOCOL</div>
      <div class="brand-sub">Consumer Counterfeit Dispute & Chargeback Dossier</div>
      <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Cryptographic Ledger Verification Evidence</div>
    </div>
    <div class="dossier-id-box">
      <span class="badge-urgent">OFFICIAL EVIDENCE DOSSIER</span>
      <div class="id-code">REF: ${data.reportId}</div>
      <div style="font-size: 11px; color: #64748b;">Issued: ${new Date(data.generatedAt).toLocaleString()}</div>
    </div>
  </div>

  <div class="statement-box">
    <div class="statement-title">NOTICE OF FRAUDULENT MERCHANDISE / COUNTERFEIT EVIDENCE</div>
    <p>This document constitutes an official cryptographically logged technical audit packet. The product inspected below has failed manufacturer registry validation or exhibited unauthorized duplication metrics. This dossier is admissible for banking chargebacks (Visa/Mastercard Reason Code 13.4 - Counterfeit Merchandise), PayPal buyer protection claims, and credit card disputes.</p>
  </div>

  <div class="grid-2">
    <div>
      <div class="section-title">Item Under Inspection</div>
      <table class="data-table">
        <tr>
          <td class="label">Serial Flagged:</td>
          <td class="val" style="font-family: monospace; color: #0369a1;">${data.serialNumber}</td>
        </tr>
        <tr>
          <td class="label">Product Name:</td>
          <td class="val">${data.productName || "Unknown Product"}</td>
        </tr>
        <tr>
          <td class="label">Brand:</td>
          <td class="val">${data.brand || "Unregistered"}</td>
        </tr>
        <tr>
          <td class="label">Category:</td>
          <td class="val">${data.category || "General Goods"}</td>
        </tr>
        <tr>
          <td class="label">Manufacturer:</td>
          <td class="val">${data.manufacturer || "Apex Manufacturing Global"}</td>
        </tr>
        <tr>
          <td class="label">Registry Status:</td>
          <td class="val" style="color: ${data.status === "GENUINE" ? "#15803d" : "#b91c1c"};">${data.status}</td>
        </tr>
        <tr>
          <td class="label">Risk Index:</td>
          <td class="val">${data.riskScore} / 100</td>
        </tr>
      </table>
    </div>

    <div>
      <div class="section-title">Vendor & Transaction Details</div>
      <table class="data-table">
        <tr>
          <td class="label">Accused Merchant:</td>
          <td class="val">${data.merchantName || "Unverified Merchant"}</td>
        </tr>
        <tr>
          <td class="label">Store Location / URL:</td>
          <td class="val">${data.storeLocation || "Not Disclosed"}</td>
        </tr>
        <tr>
          <td class="label">Severity Level:</td>
          <td class="val">${data.severity}</td>
        </tr>
        <tr>
          <td class="label">Audit Timestamp:</td>
          <td class="val">${new Date(data.generatedAt).toISOString()}</td>
        </tr>
        <tr>
          <td class="label">Photo Evidence:</td>
          <td class="val">${data.evidencePhotoAttached ? "Attached to digital record" : "Not submitted"}</td>
        </tr>
      </table>
    </div>
  </div>

  <div class="section-title">Cryptographic & Forensic Violations</div>
  <div class="reasons-box">
    <ul>
      ${data.reasons.map((r) => `<li>${r}</li>`).join("")}
    </ul>
  </div>

  ${
    data.visualForensics
      ? `
  <div class="section-title">Gemini Optical Forensic Inspection</div>
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 4px; margin-bottom: 20px;">
    <p style="margin-bottom: 8px;"><strong>Visual Finding:</strong> ${data.visualForensics.forensicSummary}</p>
    <div style="display: flex; gap: 20px; font-size: 12px; color: #475569;">
      <div><strong>Hologram:</strong> ${data.visualForensics.hologramFoilStatus}</div>
      <div><strong>Typography:</strong> ${data.visualForensics.typographyStatus}</div>
      <div><strong>Seal Integrity:</strong> ${data.visualForensics.sealIntegrity}</div>
    </div>
  </div>
  `
      : ""
  }

  <div class="section-title">Consumer Attestation & Incident Narrative</div>
  <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 4px; margin-bottom: 24px; font-style: italic;">
    "${data.reason}"
  </div>

  <div class="signature-row">
    <div class="sig-line">
      Consumer Claimant Signature / Date
    </div>
    <div class="sig-line">
      AuthentiCheck Protocol Digital Notary Node (ID: 0x9AF8-AUTH)
    </div>
  </div>

  <div class="legal-notice">
    <strong>Admissibility Instructions:</strong> When submitting this document to your card-issuing bank (e.g., Chase, Citi, Barclays, Amex) or payment platform (PayPal, Stripe, Apple Pay), file under "Significantly Not As Described / Counterfeit Goods". Include your merchant receipt, order confirmation, and this AuthentiCheck Dispute Dossier.
  </div>
</body>
</html>
`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
