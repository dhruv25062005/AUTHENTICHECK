CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('CONSUMER', 'MANUFACTURER', 'ADMIN');
CREATE TYPE product_status AS ENUM ('ACTIVE', 'BLOCKED', 'RETIRED');
CREATE TYPE verification_status AS ENUM ('GENUINE', 'SUSPICIOUS', 'HIGH_RISK', 'UNKNOWN');
CREATE TYPE report_status AS ENUM ('OPEN', 'INVESTIGATING', 'RESOLVED', 'DISMISSED');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'CONSUMER',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  organization_name TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID NOT NULL REFERENCES manufacturers(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE product_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  batch_code TEXT NOT NULL,
  manufacturing_date DATE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, batch_code)
);

CREATE TABLE product_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  batch_id UUID REFERENCES product_batches(id) ON DELETE SET NULL,
  serial_number TEXT NOT NULL UNIQUE,
  verification_token_hash TEXT NOT NULL UNIQUE,
  status product_status NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_instance_id UUID REFERENCES product_instances(id) ON DELETE SET NULL,
  serial_entered TEXT,
  scan_method TEXT NOT NULL,
  ip_hash TEXT,
  device_hash TEXT,
  country_code CHAR(2),
  region_code TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  status verification_status NOT NULL DEFAULT 'UNKNOWN',
  risk_score NUMERIC(5,2) CHECK (risk_score >= 0 AND risk_score <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE image_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  model_version TEXT NOT NULL,
  similarity_score NUMERIC(6,5),
  anomaly_score NUMERIC(6,5),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL UNIQUE REFERENCES scans(id) ON DELETE CASCADE,
  identity_score NUMERIC(5,2),
  visual_score NUMERIC(5,2),
  behavior_score NUMERIC(5,2),
  history_score NUMERIC(5,2),
  report_score NUMERIC(5,2),
  final_score NUMERIC(5,2) NOT NULL CHECK (final_score >= 0 AND final_score <= 100),
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  rules_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID REFERENCES scans(id) ON DELETE SET NULL,
  product_instance_id UUID REFERENCES product_instances(id) ON DELETE SET NULL,
  reporter_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  evidence_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  status report_status NOT NULL DEFAULT 'OPEN',
  investigator_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  outcome TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_instances_product ON product_instances(product_id);
CREATE INDEX idx_scans_product_instance ON scans(product_instance_id);
CREATE INDEX idx_scans_created_at ON scans(created_at);
CREATE INDEX idx_scans_status ON scans(status);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
