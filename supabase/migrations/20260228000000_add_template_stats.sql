-- Add real-time analytics columns to templates
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS views INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS downloads INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS event_name TEXT;

-- RPC to atomically increment a stat counter (avoids race conditions)
CREATE OR REPLACE FUNCTION public.increment_template_stat(
  template_slug TEXT,
  stat_name TEXT,
  amount INTEGER DEFAULT 1
)
RETURNS VOID AS $$
BEGIN
  IF stat_name = 'views' THEN
    UPDATE public.templates SET views = views + amount WHERE slug = template_slug;
  ELSIF stat_name = 'downloads' THEN
    UPDATE public.templates SET downloads = downloads + amount WHERE slug = template_slug;
  ELSIF stat_name = 'shares' THEN
    UPDATE public.templates SET shares = shares + amount WHERE slug = template_slug;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
