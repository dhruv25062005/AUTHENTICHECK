export type RiskLabel = "GENUINE" | "SUSPICIOUS" | "HIGH_RISK";

export interface RiskInput {
  identityValid: boolean;
  instanceActive: boolean;
  lifecycleStatus?: string;
  previousScans: number;
  recentScanVelocity: number;
  visualSimilarity?: number;
  visualAnomaly?: number;
  reportCount?: number;
}

export function assessRisk(input: RiskInput) {
  let score = 0;
  const reasons: string[] = [];

  if (!input.identityValid) {
    score += 75;
    reasons.push("Product identity was not found in the registered manufacturer ledger.");
  }
  if (!input.instanceActive) {
    score += 35;
    reasons.push("Product instance is not active in the manufacturer lifecycle ledger.");
  }
  if (input.lifecycleStatus === "RECALLED") {
    score += 45;
    reasons.push("Product instance is marked as recalled.");
  } else if (input.lifecycleStatus === "STOLEN") {
    score += 50;
    reasons.push("Product instance is marked as stolen.");
  } else if (input.lifecycleStatus === "SOLD") {
    score += 5;
    reasons.push("Product instance is recorded as sold; verify the seller and scan context.");
  }
  if (input.recentScanVelocity >= 5) {
    score += 20;
    reasons.push("High recent scan velocity detected.");
  } else if (input.recentScanVelocity >= 3) {
    score += 10;
    reasons.push("Elevated recent scan velocity detected.");
  }
  if (input.previousScans >= 25) {
    score += 20;
    reasons.push("Unusually high historical scan activity.");
  } else if (input.previousScans >= 10) {
    score += 10;
    reasons.push("Elevated historical scan activity.");
  }
  if (input.visualSimilarity !== undefined && input.visualSimilarity < 0.75) {
    score += 15;
    reasons.push("Visual similarity is below the configured reference threshold.");
  }
  if (input.visualAnomaly !== undefined && input.visualAnomaly > 0.5) {
    score += 15;
    reasons.push("Visual anomaly signal is elevated.");
  }
  if ((input.reportCount ?? 0) >= 3) {
    score += 10;
    reasons.push("Multiple consumer reports are associated with this product.");
  }

  score = Math.min(100, score);
  const label: RiskLabel = score >= 70 ? "HIGH_RISK" : score >= 35 ? "SUSPICIOUS" : "GENUINE";

  if (!reasons.length) {
    reasons.push("No significant anomaly was detected by the currently enabled verification signals.");
  }

  return { score, label, reasons };
}
