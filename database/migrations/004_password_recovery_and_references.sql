-- Password recovery and account lifecycle hardening
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user
  ON password_reset_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_active
  ON password_reset_tokens(token_hash)
  WHERE used_at IS NULL;

ALTER TABLE password_reset_tokens
  ADD CONSTRAINT password_reset_expiry_check CHECK (expires_at > created_at);

CREATE TABLE IF NOT EXISTS manufacturer_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  embedding JSONB,
  model_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_manufacturer_references_product_model
  ON manufacturer_references(product_id, model_version, image_url);

CREATE INDEX IF NOT EXISTS idx_manufacturer_references_product
  ON manufacturer_references(product_id);
