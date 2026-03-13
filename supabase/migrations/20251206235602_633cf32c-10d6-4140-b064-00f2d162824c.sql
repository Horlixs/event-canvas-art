-- 0) Ensure pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Create table if it doesn't exist (idempotent)
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Untitled Template',
  elements JSONB NOT NULL DEFAULT '[]'::jsonb,
  background_color TEXT NOT NULL DEFAULT '#ffffff',
  background_image TEXT,
  canvas_width INTEGER NOT NULL DEFAULT 1080,
  canvas_height INTEGER NOT NULL DEFAULT 1080,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  views INTEGER NOT NULL DEFAULT 0,
  downloads INTEGER NOT NULL DEFAULT 0,
  shares INTEGER NOT NULL DEFAULT 0,
  registration_link TEXT,
  event_name TEXT,
  is_private BOOLEAN NOT NULL DEFAULT false,
  custom_slug TEXT,
  creator_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2) Ensure analytics & extra columns exist (safe if table pre-existed without them)
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downloads INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS registration_link TEXT,
  ADD COLUMN IF NOT EXISTS event_name TEXT,
  ADD COLUMN IF NOT EXISTS is_private BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS custom_slug TEXT,
  ADD COLUMN IF NOT EXISTS creator_name TEXT;

-- 3) Indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON public.templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_slug ON public.templates(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_custom_slug
  ON public.templates(custom_slug) WHERE custom_slug IS NOT NULL;

-- 4) Enable Row Level Security
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- 5) Allow public reads (needed for /dp/:slug generator page)
-- Drop policy if exists then create it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'templates' AND policyname = 'templates_select_public'
  ) THEN
    -- use DROP POLICY IF EXISTS for safety as well
    EXECUTE 'DROP POLICY IF EXISTS templates_select_public ON public.templates';
  END IF;
END;
$$;

CREATE POLICY templates_select_public
  ON public.templates
  FOR SELECT
  USING (true);

-- 6) INSERT policy: ensure user_id equals auth.uid()
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'templates' AND policyname = 'templates_insert_authenticated'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS templates_insert_authenticated ON public.templates';
  END IF;
END;
$$;

CREATE POLICY templates_insert_authenticated
  ON public.templates
  FOR INSERT
  TO authenticated
  WITH CHECK ( (SELECT auth.uid()) = user_id );

-- 7) UPDATE policy: owners only
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'templates' AND policyname = 'templates_update_owner'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS templates_update_owner ON public.templates';
  END IF;
END;
$$;

CREATE POLICY templates_update_owner
  ON public.templates
  FOR UPDATE
  TO authenticated
  USING ( (SELECT auth.uid()) = user_id )
  WITH CHECK ( (SELECT auth.uid()) = user_id );

-- 8) DELETE policy: owners only
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'templates' AND policyname = 'templates_delete_owner'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS templates_delete_owner ON public.templates';
  END IF;
END;
$$;

CREATE POLICY templates_delete_owner
  ON public.templates
  FOR DELETE
  TO authenticated
  USING ( (SELECT auth.uid()) = user_id );

-- 9) Helper function: set user_id from auth.uid() on insert (idempotent)
CREATE OR REPLACE FUNCTION public.set_template_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    NEW.user_id := (SELECT auth.uid());
  END IF;
  RETURN NEW;
END;
$$ SECURITY DEFINER;

-- Restrict execute for public roles (best-effort)
REVOKE EXECUTE ON FUNCTION public.set_template_user_id() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_template_user_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_template_user_id() FROM authenticated;

DROP TRIGGER IF EXISTS set_templates_user_id ON public.templates;
CREATE TRIGGER set_templates_user_id
BEFORE INSERT ON public.templates
FOR EACH ROW
EXECUTE FUNCTION public.set_template_user_id();

-- 10) updated_at trigger/function (idempotent)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_templates_updated_at ON public.templates;
CREATE TRIGGER update_templates_updated_at
BEFORE UPDATE ON public.templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 11) Atomic RPC to increment a stat counter with validation
CREATE OR REPLACE FUNCTION public.increment_template_stat(
  template_slug TEXT,
  stat_name TEXT,
  amount INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_amount INTEGER := COALESCE(amount, 1);
  v_rows INTEGER;
BEGIN
  -- Validate amount
  IF v_amount = 0 THEN
    RETURN;
  END IF;

  IF v_amount < 0 THEN
    RAISE EXCEPTION 'amount must be non-negative';
  END IF;

  -- Choose which column to update
  IF stat_name = 'views' THEN
    UPDATE public.templates
    SET views = views + v_amount
    WHERE slug = template_slug
    RETURNING 1 INTO v_rows;

  ELSIF stat_name = 'downloads' THEN
    UPDATE public.templates
    SET downloads = downloads + v_amount
    WHERE slug = template_slug
    RETURNING 1 INTO v_rows;

  ELSIF stat_name = 'shares' THEN
    UPDATE public.templates
    SET shares = shares + v_amount
    WHERE slug = template_slug
    RETURNING 1 INTO v_rows;

  ELSE
    RAISE EXCEPTION 'invalid stat_name: %', stat_name;
  END IF;

  -- If no row updated, raise not found
  IF v_rows IS NULL THEN
    RAISE EXCEPTION 'template not found for slug: %', template_slug;
  END IF;
END;
$$;

-- 12) Allow anon (and authenticated) to call the stat increment RPC
GRANT EXECUTE ON FUNCTION public.increment_template_stat(TEXT, TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_template_stat(TEXT, TEXT, INTEGER) TO authenticated;

-- 13) Final sanity checks: ensure policies exist (no-op if present)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'templates' AND policyname = 'templates_select_public'
  ) THEN
    EXECUTE 'CREATE POLICY templates_select_public ON public.templates FOR SELECT USING (true)';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'templates' AND policyname = 'templates_insert_authenticated'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY templates_insert_authenticated
        ON public.templates
        FOR INSERT
        TO authenticated
        WITH CHECK ( (SELECT auth.uid()) = user_id )
    $sql$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'templates' AND policyname = 'templates_update_owner'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY templates_update_owner
        ON public.templates
        FOR UPDATE
        TO authenticated
        USING ( (SELECT auth.uid()) = user_id )
        WITH CHECK ( (SELECT auth.uid()) = user_id )
    $sql$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'templates' AND policyname = 'templates_delete_owner'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY templates_delete_owner
        ON public.templates
        FOR DELETE
        TO authenticated
        USING ( (SELECT auth.uid()) = user_id )
    $sql$;
  END IF;
END;
$$;

-- 14) Enable Realtime for templates table so stats update in real-time
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_rel pr
    JOIN pg_publication p ON p.oid = pr.prpubid
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE p.pubname = 'supabase_realtime'
      AND n.nspname = 'public'
      AND c.relname = 'templates'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.templates;
  END IF;
END;
$$;

-- 15) Auth: One email = one sign-in method (no linking, no duplicates)

-- RPC: check which auth provider owns an email
-- Returns 'email', 'google', or NULL (no account)
DO $$
BEGIN
  EXECUTE $sql$
    CREATE OR REPLACE FUNCTION public.get_provider_for_email(lookup_email text)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = ''
    AS $fn$
    DECLARE
      provider_name text;
    BEGIN
      SELECT i.provider INTO provider_name
      FROM auth.identities i
      JOIN auth.users u ON u.id = i.user_id
      WHERE LOWER(u.email) = LOWER(lookup_email)
      LIMIT 1;

      RETURN provider_name;
    END;
    $fn$;
  $sql$;

  EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_provider_for_email(text) TO anon, authenticated';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping public.get_provider_for_email(): insufficient privilege for auth schema.';
END;
$$;


-- RPC: check if another account exists with a given email (excluding a specific user)
-- Used as a safety net after OAuth to detect duplicates
DO $$
BEGIN
  EXECUTE $sql$
    CREATE OR REPLACE FUNCTION public.check_email_exists_for_other_user(
      check_email text,
      exclude_user_id uuid
    )
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = ''
    AS $fn$
    DECLARE
      other_provider text;
    BEGIN
      SELECT i.provider INTO other_provider
      FROM auth.identities i
      JOIN auth.users u ON u.id = i.user_id
      WHERE LOWER(u.email) = LOWER(check_email)
        AND u.id != exclude_user_id
      LIMIT 1;

      RETURN other_provider;
    END;
    $fn$;
  $sql$;

  EXECUTE 'GRANT EXECUTE ON FUNCTION public.check_email_exists_for_other_user(text, uuid) TO authenticated';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping public.check_email_exists_for_other_user(): insufficient privilege for auth schema.';
END;
$$;


-- RPC: clean up a duplicate OAuth user (self-service only)
DO $$
BEGIN
  EXECUTE $sql$
    CREATE OR REPLACE FUNCTION public.cleanup_duplicate_user(
      target_user_id uuid,
      target_email text
    )
    RETURNS boolean
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = ''
    AS $fn$
    BEGIN
      -- Only allow users to clean up their own account
      IF auth.uid() != target_user_id THEN
        RETURN false;
      END IF;

      -- Only delete if there's another user with the same email (proving this is a duplicate)
      IF EXISTS (
        SELECT 1 FROM auth.users
        WHERE LOWER(email) = LOWER(target_email)
          AND id != target_user_id
      ) THEN
        -- Cascade handles identities, sessions, etc.
        DELETE FROM auth.users WHERE id = target_user_id;
        RETURN true;
      END IF;

      RETURN false;
    END;
    $fn$;
  $sql$;

  EXECUTE 'GRANT EXECUTE ON FUNCTION public.cleanup_duplicate_user(uuid, text) TO authenticated';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping public.cleanup_duplicate_user(): insufficient privilege for auth schema.';
END;
$$;


-- Trigger: prevent duplicate emails across providers on INSERT
DO $$
BEGIN
  EXECUTE $sql$
    CREATE OR REPLACE FUNCTION auth.prevent_duplicate_email_provider()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $fn$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM auth.users
        WHERE LOWER(email) = LOWER(NEW.email)
          AND id != NEW.id
      ) THEN
        RAISE EXCEPTION 'An account with this email already exists'
          USING ERRCODE = 'unique_violation';
      END IF;
      RETURN NEW;
    END;
    $fn$;
  $sql$;

  EXECUTE 'DROP TRIGGER IF EXISTS prevent_duplicate_email_trigger ON auth.users';
  EXECUTE 'CREATE TRIGGER prevent_duplicate_email_trigger BEFORE INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION auth.prevent_duplicate_email_provider()';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipping auth duplicate-email trigger setup: insufficient privilege for auth schema.';
END;
$$;