import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getTemplateFullData, incrementTemplateStat } from '@/lib/templates';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import {
  ChevronLeft, Copy, ExternalLink, Loader2, Eye, Download,
  Share2, Calendar, Layers, Clock, Link2, BarChart3,
  ArrowUpRight, Globe2, MousePointerClick, TrendingUp, Image as ImageIcon,
  Trash2, QrCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TemplateDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Apply theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(savedTheme);
  }, []);

  // Load template data
  useEffect(() => {
    if (!slug) return;
    const load = async () => {
      setLoading(true);
      const data = await getTemplateFullData(slug);
      if (data) {
        setTemplate(data);
      }
      setLoading(false);
    };
    load();
  }, [slug]);

  // Set up real-time subscription for live stats
  useEffect(() => {
    if (!template?.id) return;
    const channel = supabase
      .channel(`template-stats-${template.id}`)
      .on(
        'postgres_changes' as any,
        { event: 'UPDATE', schema: 'public', table: 'templates', filter: `id=eq.${template.id}` },
        (payload: any) => {
          if (payload.new) {
            setTemplate((prev: any) => prev ? { ...prev, ...payload.new } : prev);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [template?.id]);

  const generatorUrl = `${window.location.origin}/dp/${template?.custom_slug || template?.slug || slug}`;

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(generatorUrl);
    toast.success('Generator link copied!');
  }, [generatorUrl]);

  const handleShare = useCallback(async () => {
    if (template?.slug) {
      await incrementTemplateStat(template.slug, 'shares');
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: template?.name || 'Check out this design', url: generatorUrl });
      } catch { /* user cancelled */ }
    } else {
      navigator.clipboard.writeText(generatorUrl);
      toast.success('Link copied!');
    }
  }, [template, generatorUrl]);

  const handleDelete = async () => {
    if (!template?.id) return;
    setDeleting(true);
    const { error } = await supabase.from('templates').delete().eq('id', template.id);
    if (!error) {
      toast.success('Template deleted');
      navigate('/dashboard');
    } else {
      toast.error('Failed to delete');
    }
    setDeleting(false);
  };

  const isOwner = user && template?.user_id === user.id;

  if (loading || authLoading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-[#fafafa] dark:bg-[#000]">
        <div className="text-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-[#86868b] mx-auto" />
          <p className="text-[13px] text-[#86868b]">Loading template...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="h-[100dvh] flex flex-col items-center justify-center bg-[#fafafa] dark:bg-[#000] text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-4">
          <ImageIcon size={28} className="text-red-500" />
        </div>
        <h1 className="text-[20px] font-bold mb-2 text-[#1d1d1f] dark:text-[#f5f5f7]">Template Not Found</h1>
        <p className="text-[14px] text-[#86868b] mb-6">This template may have been removed or doesn't exist.</p>
        <Link to="/dashboard">
          <Button className="bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full h-10 px-5 text-[13px] font-semibold">
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  const stats = {
    views: template.views || 0,
    downloads: template.downloads || 0,
    shares: template.shares || 0,
  };
  const totalEngagement = stats.views + stats.downloads + stats.shares;
  const conversionRate = stats.views > 0 ? ((stats.downloads / stats.views) * 100).toFixed(1) : '0.0';

  const createdDate = new Date(template.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
  const updatedDate = new Date(template.updated_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  return (
    <div className="min-h-[100dvh] bg-[#fafafa] dark:bg-[#000] text-[#1d1d1f] dark:text-[#f5f5f7] font-sans tracking-tight transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#111]/80 backdrop-blur-2xl border-b border-black/[0.05] dark:border-white/[0.05] safe-top">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/dashboard" className="p-1.5 -ml-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors active:scale-95 shrink-0">
              <ChevronLeft size={18} className="text-[#86868b]" />
            </Link>
            <h1 className="text-[15px] font-semibold truncate">{template.name}</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleShare}
              className="h-8 px-3 rounded-full bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-[12px] font-medium flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Share2 size={13} />
              <span className="hidden sm:inline">Share</span>
            </button>
            <Link
              to={`/dp/${template.custom_slug || template.slug}`}
              className="h-8 px-3 rounded-full bg-[#0071e3] hover:bg-[#0077ed] text-white text-[12px] font-semibold flex items-center gap-1.5 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
            >
              <ExternalLink size={13} />
              <span className="hidden sm:inline">Open Generator</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">
        {/* HERO — Template preview + name */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row gap-6 md:gap-8 mb-8 md:mb-10"
        >
          {/* Thumbnail */}
          <div
            className="w-full md:w-[280px] aspect-[4/3] rounded-2xl overflow-hidden border border-black/[0.05] dark:border-white/[0.05] shrink-0 relative shadow-xl"
            style={{ backgroundColor: template.background_color }}
          >
            {template.background_image ? (
              <img src={template.background_image} alt={template.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon size={40} className="text-white/20" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-[26px] md:text-[32px] font-bold tracking-tight mb-2">{template.name}</h1>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-[#86868b] mb-5">
              <span className="flex items-center gap-1.5">
                <Calendar size={13} />
                Created {createdDate}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={13} />
                Updated {updatedDate}
              </span>
              <span className="flex items-center gap-1.5">
                <Layers size={13} />
                {template.canvas_width}×{template.canvas_height}
              </span>
            </div>

            {/* Generator link box */}
            <div className="space-y-2 mb-5">
              <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#86868b] flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Generator Link
              </label>
              <div className="flex bg-[#f5f5f7] dark:bg-white/[0.04] rounded-xl items-center border border-black/[0.04] dark:border-white/[0.06] overflow-hidden transition-all focus-within:border-[#0071e3]/30 focus-within:ring-2 focus-within:ring-[#0071e3]/10">
                <input
                  value={generatorUrl}
                  readOnly
                  className="bg-transparent flex-1 pl-4 pr-2 py-2.5 text-[13px] font-medium outline-none truncate text-[#1d1d1f] dark:text-[#f5f5f7]"
                  onFocus={(e) => e.target.select()}
                />
                <Button
                  onClick={handleCopyLink}
                  className="bg-[#0071e3] hover:bg-[#0077ed] rounded-lg h-8 px-3.5 text-[11px] font-bold text-white shrink-0 mr-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <Copy size={12} className="mr-1" />
                  Copy
                </Button>
              </div>
            </div>

            {/* Registration link */}
            {template.registration_link && (
              <div className="flex items-center gap-2 text-[12px]">
                <Link2 size={13} className="text-blue-500 shrink-0" />
                <span className="text-[#86868b]">Registration:</span>
                <a
                  href={template.registration_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline truncate"
                >
                  {template.registration_link}
                </a>
              </div>
            )}
          </div>
        </motion.div>

        {/* BENTO STATS GRID */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-8 md:mb-10"
        >
          <h2 className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#86868b] mb-4 flex items-center gap-2">
            <BarChart3 size={14} />
            Real-time Analytics
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {/* Views */}
            <div className="bg-white dark:bg-[#1c1c1e] border border-black/[0.05] dark:border-white/[0.05] rounded-2xl p-4 md:p-5 space-y-2 group hover:border-emerald-500/20 transition-colors">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Eye size={17} className="text-emerald-500" />
                </div>
                <TrendingUp size={14} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <p className="text-[28px] md:text-[32px] font-bold tracking-tight tabular-nums">{stats.views.toLocaleString()}</p>
                <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">Page Views</p>
              </div>
            </div>

            {/* Downloads */}
            <div className="bg-white dark:bg-[#1c1c1e] border border-black/[0.05] dark:border-white/[0.05] rounded-2xl p-4 md:p-5 space-y-2 group hover:border-purple-500/20 transition-colors">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Download size={17} className="text-purple-500" />
                </div>
                <TrendingUp size={14} className="text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <p className="text-[28px] md:text-[32px] font-bold tracking-tight tabular-nums">{stats.downloads.toLocaleString()}</p>
                <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">Downloads</p>
              </div>
            </div>

            {/* Shares */}
            <div className="bg-white dark:bg-[#1c1c1e] border border-black/[0.05] dark:border-white/[0.05] rounded-2xl p-4 md:p-5 space-y-2 group hover:border-blue-500/20 transition-colors">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Share2 size={17} className="text-blue-500" />
                </div>
                <TrendingUp size={14} className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <p className="text-[28px] md:text-[32px] font-bold tracking-tight tabular-nums">{stats.shares.toLocaleString()}</p>
                <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">Shares</p>
              </div>
            </div>

            {/* Conversion */}
            <div className="bg-white dark:bg-[#1c1c1e] border border-black/[0.05] dark:border-white/[0.05] rounded-2xl p-4 md:p-5 space-y-2 group hover:border-amber-500/20 transition-colors">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <MousePointerClick size={17} className="text-amber-500" />
                </div>
                <TrendingUp size={14} className="text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <p className="text-[28px] md:text-[32px] font-bold tracking-tight tabular-nums">{conversionRate}%</p>
                <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">Conversion</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ENGAGEMENT OVERVIEW */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 md:mb-10"
        >
          {/* Traffic breakdown */}
          <div className="bg-white dark:bg-[#1c1c1e] border border-black/[0.05] dark:border-white/[0.05] rounded-2xl p-5 md:p-6">
            <h3 className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#86868b] mb-4 flex items-center gap-2">
              <Globe2 size={14} />
              Traffic Breakdown
            </h3>
            <div className="space-y-4">
              {/* Views bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[12px]">
                  <span className="font-medium flex items-center gap-1.5"><Eye size={12} className="text-emerald-500" />Page Views</span>
                  <span className="font-bold tabular-nums">{stats.views.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-black/[0.04] dark:bg-white/[0.04] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: totalEngagement > 0 ? `${(stats.views / totalEngagement) * 100}%` : '0%' }}
                    transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
              {/* Downloads bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[12px]">
                  <span className="font-medium flex items-center gap-1.5"><Download size={12} className="text-purple-500" />Downloads</span>
                  <span className="font-bold tabular-nums">{stats.downloads.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-black/[0.04] dark:bg-white/[0.04] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-purple-500"
                    initial={{ width: 0 }}
                    animate={{ width: totalEngagement > 0 ? `${(stats.downloads / totalEngagement) * 100}%` : '0%' }}
                    transition={{ delay: 0.5, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
              {/* Shares bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[12px]">
                  <span className="font-medium flex items-center gap-1.5"><Share2 size={12} className="text-blue-500" />Shares</span>
                  <span className="font-bold tabular-nums">{stats.shares.toLocaleString()}</span>
                </div>
                <div className="h-2 rounded-full bg-black/[0.04] dark:bg-white/[0.04] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: totalEngagement > 0 ? `${(stats.shares / totalEngagement) * 100}%` : '0%' }}
                    transition={{ delay: 0.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-[#1c1c1e] border border-black/[0.05] dark:border-white/[0.05] rounded-2xl p-5 md:p-6">
            <h3 className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#86868b] mb-4 flex items-center gap-2">
              <Layers size={14} />
              Quick Actions
            </h3>
            <div className="space-y-2.5">
              <Link
                to={`/dp/${template.custom_slug || template.slug}`}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-black/[0.04] dark:border-white/[0.06] hover:border-blue-500/20 hover:bg-blue-500/[0.02] transition-all active:scale-[0.98] group"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <ExternalLink size={16} className="text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold">Open Generator Page</p>
                  <p className="text-[11px] text-[#86868b] truncate">Where users customize & download</p>
                </div>
                <ArrowUpRight size={14} className="text-[#86868b] group-hover:text-blue-500 transition-colors shrink-0" />
              </Link>

              <button
                onClick={handleCopyLink}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-black/[0.04] dark:border-white/[0.06] hover:border-emerald-500/20 hover:bg-emerald-500/[0.02] transition-all active:scale-[0.98] group text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Copy size={16} className="text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold">Copy Shareable Link</p>
                  <p className="text-[11px] text-[#86868b] truncate">{generatorUrl}</p>
                </div>
                <ArrowUpRight size={14} className="text-[#86868b] group-hover:text-emerald-500 transition-colors shrink-0" />
              </button>

              <button
                onClick={handleShare}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-black/[0.04] dark:border-white/[0.06] hover:border-purple-500/20 hover:bg-purple-500/[0.02] transition-all active:scale-[0.98] group text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                  <Share2 size={16} className="text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold">Share Template</p>
                  <p className="text-[11px] text-[#86868b]">Share via social media or messaging</p>
                </div>
                <ArrowUpRight size={14} className="text-[#86868b] group-hover:text-purple-500 transition-colors shrink-0" />
              </button>

              {isOwner && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-black/[0.04] dark:border-white/[0.06] hover:border-red-500/20 hover:bg-red-500/[0.02] transition-all active:scale-[0.98] group text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                    {deleting ? <Loader2 size={16} className="text-red-500 animate-spin" /> : <Trash2 size={16} className="text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-red-500">Delete Template</p>
                    <p className="text-[11px] text-[#86868b]">This action cannot be undone</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* TEMPLATE DETAILS */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="bg-white dark:bg-[#1c1c1e] border border-black/[0.05] dark:border-white/[0.05] rounded-2xl p-5 md:p-6"
        >
          <h3 className="text-[12px] font-bold uppercase tracking-[0.12em] text-[#86868b] mb-4 flex items-center gap-2">
            <BarChart3 size={14} />
            Template Details
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#86868b]">Canvas Size</p>
              <p className="text-[14px] font-semibold">{template.canvas_width}×{template.canvas_height}</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#86868b]">Slug</p>
              <p className="text-[14px] font-semibold font-mono">{template.slug}</p>
            </div>
            {template.custom_slug && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#86868b]">Custom URL</p>
                <p className="text-[14px] font-semibold font-mono text-blue-500">{template.custom_slug}</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#86868b]">Total Engagement</p>
              <p className="text-[14px] font-semibold">{totalEngagement.toLocaleString()}</p>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default TemplateDetail;
