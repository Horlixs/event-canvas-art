-- Create templates table for storing organizer-created templates
CREATE TABLE public.templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT 'Untitled Template',
  elements JSONB NOT NULL DEFAULT '[]'::jsonb,
  background_color TEXT NOT NULL DEFAULT '#ffffff',
  background_image TEXT,
  canvas_width INTEGER NOT NULL DEFAULT 1080,
  canvas_height INTEGER NOT NULL DEFAULT 1080,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read templates (public sharing)
CREATE POLICY "Templates are publicly readable" 
ON public.templates 
FOR SELECT 
USING (true);

-- Allow anyone to create templates (no auth required for MVP)
CREATE POLICY "Anyone can create templates" 
ON public.templates 
FOR INSERT 
WITH CHECK (true);

-- Allow anyone to update templates (for simplicity in MVP)
CREATE POLICY "Anyone can update templates" 
ON public.templates 
FOR UPDATE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_templates_updated_at
BEFORE UPDATE ON public.templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for slug lookups
CREATE INDEX idx_templates_slug ON public.templates(slug);