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
  userId: string,
  creatorName?: string
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
    registration_link: template.registrationLink || null,
    event_name: (template as any).eventName || null,
    creator_name: creatorName || null,
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

export const updateExistingTemplate = async (
  slug: string,
  template: Omit<TemplateData, 'id' | 'slug'>,
  userId: string,
  creatorName?: string
): Promise<{ slug: string } | null> => {
  const updateRow = {
    name: template.name || 'Untitled Template',
    elements: template.elements as unknown as Json,
    background_color: template.backgroundColor,
    background_image: template.backgroundImage || null,
    canvas_width: template.width,
    canvas_height: template.height,
    registration_link: template.registrationLink || null,
    event_name: (template as any).eventName || null,
    creator_name: creatorName || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await (supabase
    .from('templates')
    .update(updateRow as any)
    .eq('slug', slug) as any)
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating template:', error);
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

  // Get this template's ID so we can exclude it from the conflict check
  const { data: self } = await supabase
    .from('templates')
    .select('id')
    .eq('slug', originalSlug)
    .maybeSingle();

  if (!self) return null;

  // Check if any OTHER template already uses this slug
  const { data: allMatches } = await (supabase
    .from('templates')
    .select('id')
    .or(`slug.eq.${sanitized},custom_slug.eq.${sanitized}`) as any);

  const conflict = (allMatches || []).some((row: any) => row.id !== self.id);
  if (conflict) return null; // slug taken by another template

  const { error } = await (supabase
    .from('templates')
    .update({ custom_slug: sanitized } as any)
    .eq('slug', originalSlug) as any)
    .eq('user_id', userId);

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
    custom_slug: (data as any).custom_slug || null,
    name: data.name,
    width: data.canvas_width,
    height: data.canvas_height,
    elements: data.elements as unknown as CanvasElement[],
    backgroundColor: data.background_color,
    backgroundImage: data.background_image,
    registrationLink: (data as any).registration_link || undefined,
    eventName: (data as any).event_name || undefined,
  };
};

// --- Stats helpers ---

export type StatName = 'views' | 'downloads' | 'shares';

export const incrementTemplateStat = async (slugOrCustom: string, stat: StatName) => {
  try {
    // Resolve the primary slug (the URL param could be a custom_slug)
    let primarySlug = slugOrCustom;
    const { data: row } = await supabase
      .from('templates')
      .select('slug')
      .eq('slug', slugOrCustom)
      .maybeSingle();

    if (!row) {
      // Try matching by custom_slug
      const { data: customRow } = await (supabase
        .from('templates')
        .select('slug') as any)
        .eq('custom_slug', slugOrCustom)
        .maybeSingle();
      if (customRow) primarySlug = customRow.slug;
      else return; // template not found
    }

    // Try RPC first (atomic increment)
    const { error: rpcError } = await (supabase.rpc as any)('increment_template_stat', {
      template_slug: primarySlug,
      stat_name: stat,
      amount: 1,
    });

    if (rpcError) {
      // Fallback: direct update (non-atomic but works without the RPC function)
      const { data } = await supabase
        .from('templates')
        .select(stat)
        .eq('slug', primarySlug)
        .maybeSingle() as any;

      if (data) {
        await supabase
          .from('templates')
          .update({ [stat]: (data[stat] || 0) + 1 } as any)
          .eq('slug', primarySlug);
      }
    }
  } catch {
    // Silently fail — stats are non-critical
  }
};

export interface TemplateStats {
  views: number;
  downloads: number;
  shares: number;
}

export const getTemplateStats = async (slug: string): Promise<TemplateStats> => {
  try {
    const { data } = await supabase
      .from('templates')
      .select('views, downloads, shares')
      .eq('slug', slug)
      .maybeSingle() as any;

    return {
      views: data?.views || 0,
      downloads: data?.downloads || 0,
      shares: data?.shares || 0,
    };
  } catch {
    return { views: 0, downloads: 0, shares: 0 };
  }
};

export const getUserTemplatesWithStats = async (userId: string) => {
  const { data, error } = await supabase
    .from('templates' as any)
    .select('id, slug, custom_slug, name, canvas_width, canvas_height, background_color, background_image, created_at, updated_at, views, downloads, shares, registration_link')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false }) as any;

  if (error || !data) return [];
  return data;
};

export const getTemplateFullData = async (slug: string) => {
  // Try slug first, then custom_slug
  let { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('slug', slug)
    .maybeSingle() as any;

  if (!data) {
    ({ data, error } = await (supabase
      .from('templates')
      .select('*') as any)
      .eq('custom_slug', slug)
      .maybeSingle());
  }

  if (error || !data) return null;
  return data;
};

// --- Public template helpers ---

export interface PublicTemplate {
  id: string;
  slug: string;
  name: string;
  background_color: string;
  background_image: string | null;
  canvas_width: number;
  canvas_height: number;
  views: number;
  downloads: number;
  shares: number;
  created_at: string;
  creator_name: string | null;
}

/** Fetch the N most recent public templates (all templates are public once published). */
export const getRecentTemplates = async (limit = 3): Promise<PublicTemplate[]> => {
  const all = await getAllPublicTemplates();
  return all.slice(0, limit);
};

/** Fetch all public templates ordered by most recent. */
export const getAllPublicTemplates = async (): Promise<PublicTemplate[]> => {
  const { data, error } = await supabase
    .from('templates' as any)
    .select('id, slug, name, background_color, background_image, canvas_width, canvas_height, views, downloads, shares, created_at, creator_name')
    .order('created_at', { ascending: false }) as unknown as { data: PublicTemplate[] | null; error: any };

  if (error || !data) return [];
  return data;
};
