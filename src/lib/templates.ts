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
    is_private: !!template.isPrivate,
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
    is_private: !!template.isPrivate,
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
    isPrivate: (data as any).is_private || false,
    width: data.canvas_width,
    height: data.canvas_height,
    elements: data.elements as unknown as CanvasElement[],
    backgroundColor: data.background_color,
    backgroundImage: data.background_image,
    registrationLink: (data as any).registration_link || undefined,
    eventName: (data as any).event_name || undefined,
    user_id: data.user_id || null,
    deleted_at: (data as any).deleted_at || null,
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

export interface TemplateRow {
  id: string;
  slug: string;
  custom_slug?: string | null;
  name: string;
  is_private?: boolean;
  canvas_width: number;
  canvas_height: number;
  background_color: string;
  background_image?: string | null;
  created_at: string;
  updated_at: string;
  views: number;
  downloads: number;
  shares: number;
  registration_link?: string | null;
  user_id?: string | null;
  creator_name?: string | null;
  deleted_at?: string | null;
}

export const getUserTemplatesWithStats = async (userId: string): Promise<TemplateRow[]> => {
  try {
    let { data, error } = await supabase
      .from('templates' as any)
      .select('id, slug, custom_slug, name, is_private, canvas_width, canvas_height, background_color, background_image, created_at, updated_at, views, downloads, shares, registration_link, deleted_at, user_id, creator_name')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false }) as any;

    if (error?.code === '42703') {
      // Column deleted_at not yet created - fallback to without deleted_at
      const fallback = await supabase
        .from('templates' as any)
        .select('id, slug, custom_slug, name, is_private, canvas_width, canvas_height, background_color, background_image, created_at, updated_at, views, downloads, shares, registration_link, user_id, creator_name')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false }) as any;
      data = fallback.data;
    }

    if (!data) return [];
    return data.filter((t: any) => !t.deleted_at);
  } catch (e) {
    console.error('Error in getUserTemplatesWithStats:', e);
    return [];
  }
};

/** Get templates moved to trash for a specific user */
export const getUserTrashedTemplates = async (userId: string): Promise<TemplateRow[]> => {
  try {
    const { data, error } = await supabase
      .from('templates' as any)
      .select('id, slug, custom_slug, name, is_private, canvas_width, canvas_height, background_color, background_image, created_at, updated_at, views, downloads, shares, registration_link, deleted_at, user_id, creator_name')
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }) as any;

    if (error || !data) return [];
    return data;
  } catch (e) {
    console.error('Error in getUserTrashedTemplates:', e);
    return [];
  }
};

/** Get all trashed templates across the platform (for admins) */
export const getAllTrashedTemplates = async (): Promise<TemplateRow[]> => {
  try {
    const { data, error } = await supabase
      .from('templates' as any)
      .select('id, slug, custom_slug, name, is_private, canvas_width, canvas_height, background_color, background_image, created_at, updated_at, views, downloads, shares, registration_link, deleted_at, user_id, creator_name')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false }) as any;

    if (error || !data) return [];
    return data;
  } catch (e) {
    console.error('Error in getAllTrashedTemplates:', e);
    return [];
  }
};

/** Calculate how many days remaining in trash before 30-day auto-purge */
export const getDaysRemainingInTrash = (deletedAt?: string | null): number => {
  if (!deletedAt) return 30;
  const deletedTime = new Date(deletedAt).getTime();
  const now = Date.now();
  const elapsedMs = Math.max(0, now - deletedTime);
  const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
  return Math.max(0, 30 - elapsedDays);
};

/** Move a template to trash (soft delete) */
export const softDeleteTemplate = async (
  templateId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Try calling the SECURITY DEFINER RPC first (handles owner and admin permissions bypass)
    const { error: rpcError } = await (supabase.rpc as any)('soft_delete_template', {
      p_template_id: templateId,
    });

    if (!rpcError) {
      return { success: true };
    }

    // 2. If RPC is not found or fails, try direct update with deleted_at
    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('templates' as any)
      .update({ deleted_at: nowIso } as any)
      .eq('id', templateId);

    if (!updateError) {
      return { success: true };
    }

    // 3. If column deleted_at doesn't exist (error 42703), fall back to hard delete
    if (updateError.code === '42703') {
      const { error: deleteError } = await supabase
        .from('templates' as any)
        .delete()
        .eq('id', templateId);

      if (!deleteError) return { success: true };
      return { success: false, error: deleteError.message };
    }

    return { success: false, error: updateError.message };
  } catch (err: any) {
    console.error('Error in softDeleteTemplate:', err);
    return { success: false, error: err?.message || 'Failed to move template to trash' };
  }
};

/** Restore a template from trash */
export const restoreTemplate = async (
  templateId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Try calling the SECURITY DEFINER RPC first
    const { error: rpcError } = await (supabase.rpc as any)('restore_template', {
      p_template_id: templateId,
    });

    if (!rpcError) {
      return { success: true };
    }

    // 2. Fallback: direct update
    const { error: updateError } = await supabase
      .from('templates' as any)
      .update({ deleted_at: null } as any)
      .eq('id', templateId);

    if (!updateError) {
      return { success: true };
    }

    return { success: false, error: updateError.message };
  } catch (err: any) {
    console.error('Error in restoreTemplate:', err);
    return { success: false, error: err?.message || 'Failed to restore template' };
  }
};

/** Permanently delete a template immediately */
export const permanentDeleteTemplate = async (
  templateId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Try calling the SECURITY DEFINER RPC first
    const { error: rpcError } = await (supabase.rpc as any)('permanent_delete_template', {
      p_template_id: templateId,
    });

    if (!rpcError) {
      return { success: true };
    }

    // 2. Fallback: direct delete
    const { error: deleteError } = await supabase
      .from('templates' as any)
      .delete()
      .eq('id', templateId);

    if (!deleteError) {
      return { success: true };
    }

    return { success: false, error: deleteError.message };
  } catch (err: any) {
    console.error('Error in permanentDeleteTemplate:', err);
    return { success: false, error: err?.message || 'Failed to permanently delete template' };
  }
};

/** Empty trash for current user or admin */
export const emptyTrash = async (
  isAdmin?: boolean,
  userId?: string
): Promise<{ success: boolean; count?: number; error?: string }> => {
  try {
    const { data, error: rpcError } = await (supabase.rpc as any)('empty_trash');
    if (!rpcError) {
      return { success: true, count: typeof data === 'number' ? data : undefined };
    }

    // Fallback: direct delete
    let query = supabase.from('templates' as any).delete().not('deleted_at', 'is', null);
    if (!isAdmin && userId) {
      query = (query as any).eq('user_id', userId);
    }
    const { error: delError } = await query;
    if (!delError) return { success: true };
    return { success: false, error: delError.message };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to empty trash' };
  }
};

/** Purge all templates trashed more than 30 days ago */
export const purgeExpiredTrash = async (): Promise<void> => {
  try {
    // Try RPC
    const { error } = await (supabase.rpc as any)('purge_expired_trash');
    if (!error) return;

    // Fallback: direct delete where deleted_at < 30 days ago
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('templates' as any)
      .delete()
      .not('deleted_at', 'is', null)
      .lt('deleted_at', thirtyDaysAgo);
  } catch {
    // Non-critical background task
  }
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
  custom_slug?: string | null;
  name: string;
  is_private?: boolean;
  background_color: string;
  background_image: string | null;
  canvas_width: number;
  canvas_height: number;
  views: number;
  downloads: number;
  shares: number;
  created_at: string;
  creator_name: string | null;
  deleted_at?: string | null;
}

/** Fetch the N most recent public templates. */
export const getRecentTemplates = async (limit = 3): Promise<PublicTemplate[]> => {
  const all = await getAllPublicTemplates();
  return all.slice(0, limit);
};

/** Fetch all public templates ordered by most recent (excludes trashed). */
export const getAllPublicTemplates = async (): Promise<PublicTemplate[]> => {
  try {
    let { data, error } = await supabase
      .from('templates' as any)
      .select('id, slug, custom_slug, name, is_private, background_color, background_image, canvas_width, canvas_height, views, downloads, shares, created_at, creator_name, deleted_at')
      .eq('is_private', false)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }) as unknown as { data: PublicTemplate[] | null; error: any };

    if (error?.code === '42703') {
      const fallback = await supabase
        .from('templates' as any)
        .select('id, slug, custom_slug, name, is_private, background_color, background_image, canvas_width, canvas_height, views, downloads, shares, created_at, creator_name')
        .eq('is_private', false)
        .order('created_at', { ascending: false }) as unknown as { data: PublicTemplate[] | null; error: any };
      data = fallback.data;
    }

    if (error || !data) return [];
    return data.filter(t => !t.deleted_at);
  } catch {
    return [];
  }
};

