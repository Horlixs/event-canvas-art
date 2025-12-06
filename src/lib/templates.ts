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

export const publishTemplate = async (template: TemplateData): Promise<{ slug: string } | null> => {
  const slug = generateSlug();
  
  const { error } = await supabase
    .from('templates')
    .insert({
      slug,
      name: template.name || 'Untitled Template',
      elements: template.elements as unknown as Json,
      background_color: template.backgroundColor,
      background_image: template.backgroundImage || null,
      canvas_width: template.width,
      canvas_height: template.height,
    });

  if (error) {
    console.error('Error publishing template:', error);
    return null;
  }

  return { slug };
};

export const getTemplateBySlug = async (slug: string): Promise<TemplateData | null> => {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    console.error('Error fetching template:', error);
    return null;
  }

  return {
    name: data.name,
    width: data.canvas_width,
    height: data.canvas_height,
    elements: data.elements as unknown as CanvasElement[],
    backgroundColor: data.background_color,
    backgroundImage: data.background_image,
  };
};
