-- ============================================================
-- Auth: One email = one sign-in method (no linking, no duplicates)
-- ============================================================

-- 1) RPC: check which auth provider owns an email
--    Returns 'email', 'google', or NULL (no account)
CREATE OR REPLACE FUNCTION public.get_provider_for_email(lookup_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.get_provider_for_email(text) TO anon, authenticated;


-- 2) RPC: check if another account exists with a given email (excluding a specific user)
--    Used as a safety net after OAuth to detect duplicates
CREATE OR REPLACE FUNCTION public.check_email_exists_for_other_user(
  check_email text,
  exclude_user_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.check_email_exists_for_other_user(text, uuid) TO authenticated;


-- 3) RPC: clean up a duplicate OAuth user (self-service only)
CREATE OR REPLACE FUNCTION public.cleanup_duplicate_user(
  target_user_id uuid,
  target_email text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.cleanup_duplicate_user(uuid, text) TO authenticated;


-- 4) Trigger: prevent duplicate emails across providers on INSERT
CREATE OR REPLACE FUNCTION auth.prevent_duplicate_email_provider()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

DROP TRIGGER IF EXISTS prevent_duplicate_email_trigger ON auth.users;

CREATE TRIGGER prevent_duplicate_email_trigger
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION auth.prevent_duplicate_email_provider();
