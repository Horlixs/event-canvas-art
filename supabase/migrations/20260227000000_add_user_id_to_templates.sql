-- Add user_id column to templates for ownership tracking
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for fast lookups by user
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON public.templates(user_id);

-- Drop old permissive policies
DROP POLICY IF EXISTS "Anyone can create templates" ON public.templates;
DROP POLICY IF EXISTS "Anyone can update templates" ON public.templates;

-- Only authenticated users can create templates (attached to their user_id)
CREATE POLICY "Authenticated users can create templates"
ON public.templates
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Only the owner can update their templates
CREATE POLICY "Users can update own templates"
ON public.templates
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Only the owner can delete their templates
CREATE POLICY "Users can delete own templates"
ON public.templates
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Public read access remains (needed for /dp/:slug generator page)
-- (already exists from the first migration: "Templates are publicly readable")
