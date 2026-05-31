BEGIN;

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS driver_notes TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimated_delivery_at TIMESTAMPTZ;

COMMIT;
