-- Migration: 20260917_trash_and_admin_delete.sql
-- Enables admin template deletion across the platform and implements a 30-day Trash lifecycle.

-- 1) Add deleted_at column to templates table if not present
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 2) Create index on deleted_at for fast filtering
CREATE INDEX IF NOT EXISTS idx_templates_deleted_at ON public.templates(deleted_at);

-- 3) Helper functions: check user roles and admin privileges
DROP FUNCTION IF EXISTS public.has_role(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- 1-arg is_admin(UUID)
CREATE OR REPLACE FUNCTION public.is_admin(p_uid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_email TEXT;
BEGIN
  IF p_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = p_uid;
  IF v_email IS NOT NULL AND LOWER(v_email) = LOWER('dhorlixs@gmail.com') THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- 0-arg is_admin() for current session
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_email TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check auth.users
  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
  IF v_email IS NOT NULL AND LOWER(v_email) = LOWER('dhorlixs@gmail.com') THEN
    RETURN TRUE;
  END IF;

  -- Check JWT claim
  v_email := NULLIF(current_setting('request.jwt.claim.email', true), '');
  IF v_email IS NOT NULL AND LOWER(v_email) = LOWER('dhorlixs@gmail.com') THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- has_role(UUID, TEXT)
CREATE OR REPLACE FUNCTION public.has_role(p_uid UUID, p_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF p_role = 'admin' THEN
    RETURN public.is_admin(p_uid);
  END IF;
  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(UUID, TEXT) TO anon, authenticated;

-- 4) Update RLS policies on public.templates

-- SELECT: Public can see non-deleted templates; owners and admins can see their trashed ones
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'templates' AND policyname = 'templates_select_public'
  ) THEN
    EXECUTE 'DROP POLICY templates_select_public ON public.templates';
  END IF;
END;
$$;

CREATE POLICY templates_select_public
  ON public.templates
  FOR SELECT
  USING (
    deleted_at IS NULL
    OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
    OR public.is_admin()
  );

-- UPDATE: Owners OR admins can update
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'templates' AND policyname = 'templates_update_owner'
  ) THEN
    EXECUTE 'DROP POLICY templates_update_owner ON public.templates';
  END IF;
END;
$$;

CREATE POLICY templates_update_owner_or_admin
  ON public.templates
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR public.is_admin()
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    OR public.is_admin()
  );

-- DELETE: Owners OR admins can delete
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'templates' AND policyname = 'templates_delete_owner'
  ) THEN
    EXECUTE 'DROP POLICY templates_delete_owner ON public.templates';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'templates' AND policyname = 'templates_delete_owner_or_admin'
  ) THEN
    EXECUTE 'DROP POLICY templates_delete_owner_or_admin ON public.templates';
  END IF;
END;
$$;

CREATE POLICY templates_delete_owner_or_admin
  ON public.templates
  FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR public.is_admin()
  );

-- 5) SECURITY DEFINER RPC: Move template to trash (soft delete)
CREATE OR REPLACE FUNCTION public.soft_delete_template(p_template_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_adm BOOLEAN := public.is_admin();
  v_rows INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.templates
  SET deleted_at = now()
  WHERE id = p_template_id
    AND (user_id = v_user_id OR v_is_adm);

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.soft_delete_template(UUID) TO authenticated;

-- 6) SECURITY DEFINER RPC: Restore template from trash
CREATE OR REPLACE FUNCTION public.restore_template(p_template_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_adm BOOLEAN := public.is_admin();
  v_rows INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE public.templates
  SET deleted_at = NULL
  WHERE id = p_template_id
    AND (user_id = v_user_id OR v_is_adm);

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.restore_template(UUID) TO authenticated;

-- 7) SECURITY DEFINER RPC: Permanently delete a template
CREATE OR REPLACE FUNCTION public.permanent_delete_template(p_template_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_adm BOOLEAN := public.is_admin();
  v_rows INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM public.templates
  WHERE id = p_template_id
    AND (user_id = v_user_id OR v_is_adm);

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.permanent_delete_template(UUID) TO authenticated;

-- 8) SECURITY DEFINER RPC: Purge templates trashed for more than 30 days
CREATE OR REPLACE FUNCTION public.purge_expired_trash()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.templates
  WHERE deleted_at IS NOT NULL
    AND deleted_at < (now() - INTERVAL '30 days');

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_expired_trash() TO authenticated, anon;

-- 9) SECURITY DEFINER RPC: Empty trash for current user or admin
CREATE OR REPLACE FUNCTION public.empty_trash()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_adm BOOLEAN := public.is_admin();
  v_count INTEGER;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF v_is_adm THEN
    -- Admin empties all trash
    DELETE FROM public.templates WHERE deleted_at IS NOT NULL;
  ELSE
    -- Owner empties their own trash
    DELETE FROM public.templates WHERE deleted_at IS NOT NULL AND user_id = v_user_id;
  END IF;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.empty_trash() TO authenticated;
