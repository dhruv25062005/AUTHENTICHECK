-- AuthentiCheck security/verification hardening
-- QR tokens are opaque credentials. Only SHA-256 hashes are persisted.

CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_instance_id UUID NOT NULL REFERENCES product_instances(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_qr_codes_active_instance
  ON qr_codes(product_instance_id)
  WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_qr_codes_token_hash
  ON qr_codes(token_hash);

CREATE INDEX IF NOT EXISTS idx_scans_instance_created
  ON scans(product_instance_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scans_status_created
  ON scans(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_instance
  ON reports(product_instance_id);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_scan
  ON risk_assessments(scan_id);
