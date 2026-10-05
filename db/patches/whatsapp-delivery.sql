CREATE TABLE IF NOT EXISTS whatsapp_message_attempts (
 id TEXT PRIMARY KEY,
 business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
 order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
 customer_id TEXT,
 notification_id TEXT REFERENCES customer_notifications(id) ON DELETE SET NULL,
 destination TEXT NOT NULL,
 status TEXT NOT NULL,
 dedupe_key TEXT NOT NULL,
 provider_message_sid TEXT UNIQUE,
 delivery_status TEXT NOT NULL DEFAULT 'queued' CHECK (delivery_status IN ('queued','sending','sent','delivered','read','failed','undelivered')),
 error_code TEXT,
 error_message TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_whatsapp_attempts_order ON whatsapp_message_attempts(business_id,order_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_attempts_dedupe ON whatsapp_message_attempts(business_id,dedupe_key,created_at DESC);
ALTER TABLE whatsapp_message_attempts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN REVOKE ALL ON whatsapp_message_attempts FROM anon; END IF;
 IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN REVOKE ALL ON whatsapp_message_attempts FROM authenticated; END IF;
END $$;
ALTER TABLE customer_notifications DROP CONSTRAINT IF EXISTS customer_notifications_delivery_status_check;
ALTER TABLE customer_notifications ADD CONSTRAINT customer_notifications_delivery_status_check CHECK (delivery_status IN ('queued','sending','sent','delivered','read','skipped','failed','undelivered'));
