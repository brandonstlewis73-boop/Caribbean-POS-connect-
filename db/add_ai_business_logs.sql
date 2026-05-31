CREATE TABLE IF NOT EXISTS public.ai_business_logs (
  id TEXT PRIMARY KEY,
  business_id TEXT REFERENCES public.businesses(id) ON DELETE SET NULL,
  user_id TEXT,
  tool_id TEXT NOT NULL,
  prompt TEXT NOT NULL,
  output_preview TEXT,
  configured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ai_business_logs DROP CONSTRAINT IF EXISTS ai_business_logs_user_id_fkey;
ALTER TABLE public.ai_business_logs ADD COLUMN IF NOT EXISTS user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_ai_business_logs_business ON public.ai_business_logs(business_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ai_business_logs_tool ON public.ai_business_logs(tool_id, created_at);
