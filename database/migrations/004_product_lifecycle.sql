-- Expand lifecycle states used by product_instances.
ALTER TYPE product_status ADD VALUE IF NOT EXISTS 'SOLD';
ALTER TYPE product_status ADD VALUE IF NOT EXISTS 'RECALLED';
ALTER TYPE product_status ADD VALUE IF NOT EXISTS 'STOLEN';
