-- Fix Supabase "Security Definer View" lint for public.users.
-- Run this in Supabase SQL Editor for an existing live database.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'users' AND c.relkind = 'v'
  ) THEN
    EXECUTE 'ALTER VIEW public.users SET (security_invoker = true)';
  END IF;
END $$;
