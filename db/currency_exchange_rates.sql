-- Apply in Supabase SQL editor before enabling live converted customer currency.
-- Safe, additive migration: no existing order totals are changed.

CREATE TABLE IF NOT EXISTS public.exchange_rates (
  id TEXT PRIMARY KEY,
  base_currency TEXT NOT NULL,
  target_currency TEXT NOT NULL,
  rate NUMERIC NOT NULL CHECK (rate > 0),
  provider TEXT NOT NULL DEFAULT 'manual',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exchange_rates_pair_fetched
  ON public.exchange_rates(base_currency, target_currency, fetched_at DESC);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS base_currency TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS exchange_rate_used NUMERIC;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS original_total NUMERIC;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS converted_total NUMERIC;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS converted_currency TEXT;

UPDATE public.orders
SET currency = COALESCE(currency, 'TTD'),
    base_currency = COALESCE(base_currency, currency, 'TTD'),
    original_total = COALESCE(original_total, total)
WHERE currency IS NULL OR base_currency IS NULL OR original_total IS NULL;

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'exchange_rates'
      AND policyname = 'Exchange rates are readable to authenticated users'
  ) THEN
    CREATE POLICY "Exchange rates are readable to authenticated users"
      ON public.exchange_rates FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;
