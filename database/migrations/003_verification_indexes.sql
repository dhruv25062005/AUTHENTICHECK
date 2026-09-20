CREATE INDEX IF NOT EXISTS idx_product_instances_serial_upper
  ON product_instances (UPPER(serial_number));
CREATE INDEX IF NOT EXISTS idx_scans_instance_created
  ON scans (product_instance_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_instance_status
  ON reports (product_instance_id, status);
