import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import {
  Plus, LayoutGrid, LogOut, Loader2, ExternalLink,
  Copy, Trash2, ChevronLeft, BarChart3, Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TemplateRow {
  id: string;
  slug: string;
  name: string;
  canvas_width: number;
  canvas_height: number;
  background_color: string;
  background_image: string | null;
  created_at: string;
  updated_at: string;
}

const Dashboard: React.FC = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Redirect to home if not logged in
  useEffect(() => {
    if (!authLoading && !user) navigate('/');
  }, [user, authLoading, navigate]);

  // Load user templates
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('templates' as any)
        .select('id, slug, name, canvas_width, canvas_height, background_color, background_image, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false }) as unknown as { data: TemplateRow[] | null; error: any };

      if (!error && data) setTemplates(data);
      setLoading(false);
    };
    load();
  }, [user]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase.from('templates').delete().eq('id', id);
    if (!error) {
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast.success('Template deleted');
    } else {
      toast.error('Failed to delete');
    }
    setDeleting(null);
  };

  const handleCopyLink = (slug: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/dp/${slug}`);
    toast.success('Link copied!');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-[#fafafa] dark:bg-[#000]">
        <Loader2 className="w-6 h-6 animate-spin text-[#86868b]" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#fafafa] dark:bg-[#000] text-[#1d1d1f] dark:text-[#f5f5f7] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#111]/80 backdrop-blur-2xl border-b border-black/[0.05] dark:border-white/[0.05] safe-top">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-1.5 -ml-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors active:scale-95">
              <ChevronLeft size={18} className="text-[#86868b]" />
            </Link>
            <div>
              <h1 className="text-[15px] font-bold">My Templates</h1>
              <p className="text-[11px] text-[#86868b]">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/create">
              <Button className="h-9 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-[12px] font-semibold px-4 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                <Plus size={14} className="mr-1.5" />
                New Template
              </Button>
            </Link>
            <button
              onClick={handleSignOut}
              className="h-9 w-9 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/5 transition-colors active:scale-95"
              title="Sign out"
            >
              <LogOut size={16} className="text-[#86868b]" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#86868b]" />
            <p className="text-[13px] text-[#86868b]">Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
          /* Empty State */
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 rounded-3xl bg-black/[0.03] dark:bg-white/[0.03] flex items-center justify-center mb-5">
              <LayoutGrid size={32} className="text-[#86868b]/40" />
            </div>
            <h2 className="text-[17px] font-bold mb-1.5">No templates yet</h2>
            <p className="text-[13px] text-[#86868b] max-w-[280px] mb-6 leading-relaxed">
              Create your first DP template and share it with your community.
            </p>
            <Link to="/create">
              <Button className="h-11 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-2xl text-[14px] font-semibold px-6 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                <Plus size={16} className="mr-2" />
                Create Template
              </Button>
            </Link>
          </motion.div>
        ) : (
          /* Templates Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group bg-white dark:bg-[#1c1c1e] border border-black/[0.05] dark:border-white/[0.05] rounded-2xl overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Thumbnail */}
                <div
                  className="aspect-square relative overflow-hidden"
                  style={{ backgroundColor: t.background_color }}
                >
                  {t.background_image && (
                    <img src={t.background_image} alt={t.name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  )}
                  {!t.background_image && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <LayoutGrid size={32} className="text-white/20" />
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/dp/${t.slug}`}
                        className="h-9 px-4 rounded-full bg-white/90 text-[12px] font-semibold text-[#1d1d1f] flex items-center gap-1.5 hover:bg-white transition-colors active:scale-95"
                      >
                        <ExternalLink size={13} />
                        View
                      </Link>
                      <button
                        onClick={() => handleCopyLink(t.slug)}
                        className="h-9 w-9 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors active:scale-95"
                        title="Copy link"
                      >
                        <Copy size={14} className="text-[#1d1d1f]" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-[14px] font-semibold truncate">{t.name}</h3>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-[11px] text-[#86868b]">
                          <Calendar size={10} />
                          {new Date(t.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-[11px] text-[#86868b]">
                          {t.canvas_width}×{t.canvas_height}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={deleting === t.id}
                      className={cn(
                        "p-2 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-90 shrink-0",
                        deleting === t.id ? "opacity-50" : "text-[#86868b]"
                      )}
                      title="Delete"
                    >
                      {deleting === t.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
