CREATE TABLE IF NOT EXISTS qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_instance_id UUID NOT NULL REFERENCES product_instances(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_qr_codes_instance ON qr_codes(product_instance_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_active ON qr_codes(token_hash) WHERE revoked_at IS NULL;
