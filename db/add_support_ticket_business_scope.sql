ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS business_id TEXT REFERENCES public.businesses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_support_tickets_business
  ON public.support_tickets(business_id, created_at);

ALTER TABLE public.ai_support_logs
  ADD COLUMN IF NOT EXISTS business_id TEXT REFERENCES public.businesses(id) ON DELETE SET NULL;
