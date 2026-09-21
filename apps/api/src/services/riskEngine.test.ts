import assert from "node:assert/strict";
import test from "node:test";
import { assessRisk } from "../services/riskEngine.js";

test("active instance with no anomalies remains low risk", () => {
  const result = assessRisk({
    identityValid: true,
    instanceActive: true,
    lifecycleStatus: "ACTIVE",
    previousScans: 0,
    recentScanVelocity: 0,
    reportCount: 0
  });
  assert.equal(result.label, "GENUINE");
  assert.equal(result.score, 0);
});

test("recalled instance is elevated to high risk", () => {
  const result = assessRisk({
    identityValid: true,
    instanceActive: false,
    lifecycleStatus: "RECALLED",
    previousScans: 1,
    recentScanVelocity: 0,
    reportCount: 0
  });
  assert.equal(result.label, "HIGH_RISK");
  assert.ok(result.reasons.some(reason => reason.includes("recalled")));
});

test("multiple reports contribute to risk", () => {
  const result = assessRisk({
    identityValid: true,
    instanceActive: true,
    lifecycleStatus: "ACTIVE",
    previousScans: 1,
    recentScanVelocity: 0,
    reportCount: 3
  });
  assert.ok(result.score >= 10);
});
