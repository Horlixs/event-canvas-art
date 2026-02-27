import { supabase } from '@/integrations/supabase/client';
import { CanvasElement, TemplateData } from '@/types/editor';
import { Json } from '@/integrations/supabase/types';

const generateSlug = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let slug = '';
  for (let i = 0; i < 8; i++) {
    slug += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return slug;
};

export const publishTemplate = async (
  template: Omit<TemplateData, 'id' | 'slug'> & { id?: string; slug?: string },
  userId: string
): Promise<{ slug: string } | null> => {
  const slug = generateSlug();

  const baseRow = {
    slug,
    name: template.name || 'Untitled Template',
    elements: template.elements as unknown as Json,
    background_color: template.backgroundColor,
    background_image: template.backgroundImage || null,
    canvas_width: template.width,
    canvas_height: template.height,
  };

  // Try with user_id first; fall back without it if column doesn't exist yet
  let { error } = await supabase
    .from('templates')
    .insert({ ...baseRow, user_id: userId } as any);

  if (error?.code === 'PGRST204') {
    // user_id column not in schema yet — publish without it
    console.warn('user_id column not found, publishing without ownership.');
    ({ error } = await supabase
      .from('templates')
      .insert(baseRow as any));
  }

  if (error) {
    console.error('Error publishing template:', error);
    return null;
  }

  return { slug };
};

export const updateTemplateSlug = async (
  originalSlug: string,
  newCustomSlug: string,
  userId: string
): Promise<{ custom_slug: string } | null> => {
  // Validate slug format
  const sanitized = newCustomSlug.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30);
  if (sanitized.length < 3) return null;

  // Check availability against both slug and custom_slug columns
  const { data: existing } = await supabase
    .from('templates')
    .select('id')
    .or(`slug.eq.${sanitized},custom_slug.eq.${sanitized}`)
    .maybeSingle();

  if (existing) return null; // slug taken

  const query = supabase
    .from('templates')
    .update({ custom_slug: sanitized } as any)
    .eq('slug', originalSlug) as any;

  const { error } = await query.eq('user_id', userId);

  if (error) {
    console.error('Error updating custom slug:', error);
    return null;
  }

  return { custom_slug: sanitized };
};

export const getTemplateBySlug = async (slug: string): Promise<TemplateData | null> => {
  // Try matching against the primary slug first
  let { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  // If not found, try matching against custom_slug
  if (!data) {
    ({ data, error } = await (supabase
      .from('templates')
      .select('*') as any)
      .eq('custom_slug', slug)
      .maybeSingle());
  }

  if (error || !data) {
    console.error('Error fetching template:', error);
    return null;
  }

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    width: data.canvas_width,
    height: data.canvas_height,
    elements: data.elements as unknown as CanvasElement[],
    backgroundColor: data.background_color,
    backgroundImage: data.background_image,
  };
};
