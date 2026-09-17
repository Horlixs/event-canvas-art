import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, LayoutGrid, LogOut, Loader2, Eye,
  Copy, Trash2, ChevronLeft, Calendar, Layers,
  Clock, Download, Image as ImageIcon, Share2, TrendingUp,
  RotateCcw, AlertTriangle, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  TemplateRow,
  getUserTemplatesWithStats,
  getUserTrashedTemplates,
  softDeleteTemplate,
  restoreTemplate,
  permanentDeleteTemplate,
  emptyTrash,
  purgeExpiredTrash,
  getDaysRemainingInTrash
} from '@/lib/templates';

const Dashboard: React.FC = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [trashedTemplates, setTrashedTemplates] = useState<TemplateRow[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'trash'>('active');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmPermanentDeleteId, setConfirmPermanentDeleteId] = useState<string | null>(null);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const templatesRef = useRef<HTMLDivElement>(null);

  // Apply theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(savedTheme);
  }, []);

  // Redirect to home if not logged in
  useEffect(() => {
    if (!authLoading && !user) navigate('/');
  }, [user, authLoading, navigate]);

  // Load user templates & trashed templates
  const loadTemplates = async () => {
    if (!user) return;
    try {
      // Purge expired templates in background
      purgeExpiredTrash();

      const [activeList, trashedList] = await Promise.all([
        getUserTemplatesWithStats(user.id),
        getUserTrashedTemplates(user.id)
      ]);
      setTemplates(activeList);
      setTrashedTemplates(trashedList);
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    loadTemplates();
  }, [user]);

  // Real-time stats subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('dashboard-stats')
      .on(
        'postgres_changes' as any,
        { event: 'UPDATE', schema: 'public', table: 'templates', filter: `user_id=eq.${user.id}` },
        (payload: any) => {
          if (payload.new) {
            if (payload.new.deleted_at) {
              // Moved to trash
              setTemplates(prev => prev.filter(t => t.id !== payload.new.id));
              setTrashedTemplates(prev => {
                const exists = prev.some(t => t.id === payload.new.id);
                return exists ? prev.map(t => t.id === payload.new.id ? { ...t, ...payload.new } : t) : [payload.new, ...prev];
              });
            } else {
              // Active update
              setTemplates(prev =>
                prev.map(t =>
                  t.id === payload.new.id
                    ? { ...t, views: payload.new.views, downloads: payload.new.downloads, shares: payload.new.shares }
                    : t
                )
              );
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Move to trash
  const handleMoveToTrash = (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmMoveToTrash = async () => {
    const id = confirmDeleteId;
    if (!id) return;
    setConfirmDeleteId(null);

    const templateToTrash = templates.find(t => t.id === id);
    if (!templateToTrash) return;

    // Optimistically update
    setTemplates(prev => prev.filter(t => t.id !== id));
    const trashedItem = { ...templateToTrash, deleted_at: new Date().toISOString() };
    setTrashedTemplates(prev => [trashedItem, ...prev]);

    setActionLoadingId(id);
    const { success, error } = await softDeleteTemplate(id);
    setActionLoadingId(null);

    if (success) {
      toast('Template moved to trash', {
        description: 'It will be permanently deleted after 30 days.',
        duration: 6000,
        action: {
          label: 'Undo',
          onClick: async () => {
            await handleRestore(id, true);
          },
        },
      });
    } else {
      // Revert optimistic update
      setTemplates(prev => [...prev, templateToTrash].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
      setTrashedTemplates(prev => prev.filter(t => t.id !== id));
      toast.error(error || 'Failed to move template to trash');
    }
  };

  // Restore from trash
  const handleRestore = async (id: string, isUndo = false) => {
    const itemToRestore = trashedTemplates.find(t => t.id === id);
    if (!itemToRestore) return;

    // Optimistically update
    setTrashedTemplates(prev => prev.filter(t => t.id !== id));
    const activeItem = { ...itemToRestore, deleted_at: null };
    setTemplates(prev => [activeItem, ...prev].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));

    setActionLoadingId(id);
    const { success, error } = await restoreTemplate(id);
    setActionLoadingId(null);

    if (success) {
      toast.success(isUndo ? 'Deletion undone' : 'Template restored successfully');
    } else {
      // Revert optimistic update
      setTemplates(prev => prev.filter(t => t.id !== id));
      setTrashedTemplates(prev => [itemToRestore, ...prev]);
      toast.error(error || 'Failed to restore template');
    }
  };

  // Permanently delete
  const confirmPermanentDelete = async () => {
    const id = confirmPermanentDeleteId;
    if (!id) return;
    setConfirmPermanentDeleteId(null);

    const item = trashedTemplates.find(t => t.id === id);
    setTrashedTemplates(prev => prev.filter(t => t.id !== id));

    setActionLoadingId(id);
    const { success, error } = await permanentDeleteTemplate(id);
    setActionLoadingId(null);

    if (success) {
      toast.success('Template permanently deleted');
    } else {
      if (item) setTrashedTemplates(prev => [item, ...prev]);
      toast.error(error || 'Failed to permanently delete template');
    }
  };

  // Empty all trash for this user
  const handleEmptyTrash = async () => {
    setConfirmEmptyTrash(false);
    const previous = [...trashedTemplates];
    setTrashedTemplates([]);

    const { success, error } = await emptyTrash(false, user?.id);
    if (success) {
      toast.success('Trash emptied successfully');
    } else {
      setTrashedTemplates(previous);
      toast.error(error || 'Failed to empty trash');
    }
  };

  const handleCopyLink = (template: TemplateRow) => {
    const dpSlug = template.custom_slug || template.slug;
    navigator.clipboard.writeText(`${window.location.origin}/dp/${dpSlug}`);
    toast.success('Link copied!');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleCreateNew = (e: React.MouseEvent) => {
    e.preventDefault();
    localStorage.removeItem('canvas_editor_state');
    navigate('/create');
  };

  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?';

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  // Real stats from database (computed strictly from active templates)
  const totalTemplates = templates.length;
  const totalViews = templates.reduce((sum, t) => sum + (t.views || 0), 0);
  const totalDownloads = templates.reduce((sum, t) => sum + (t.downloads || 0), 0);
  const totalShares = templates.reduce((sum, t) => sum + (t.shares || 0), 0);
  const firstDate = templates.length > 0
    ? new Date(templates[templates.length - 1].created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    : '—';

  const scrollToTemplates = () => {
    templatesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (authLoading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-[#fafafa] dark:bg-[#000]">
        <Loader2 className="w-6 h-6 animate-spin text-[#86868b]" />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#fafafa] dark:bg-[#000] text-[#1d1d1f] dark:text-[#f5f5f7] font-sans tracking-tight transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#111]/80 backdrop-blur-2xl border-b border-black/[0.05] dark:border-white/[0.05] safe-top">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-1.5 -ml-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors active:scale-95">
              <ChevronLeft size={18} className="text-[#86868b]" />
            </Link>
            <Link to="/" className="text-[17px] font-semibold tracking-tighter hover:opacity-70 transition-opacity">
              Dummmy<span className="text-blue-500">.</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <a href="/create" onClick={handleCreateNew}>
              <Button className="h-9 bg-[#0842C7] hover:bg-[#0953D7] text-white rounded-full text-[12px] font-semibold px-4 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                <Plus size={14} className="mr-1.5" />
                <span className="hidden sm:inline">New Template</span>
                <span className="sm:hidden">New</span>
              </Button>
            </a>
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

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-10">
        {/* PROFILE HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-[#0842C7] flex items-center justify-center text-white text-[20px] md:text-[22px] font-bold shadow-xl shadow-blue-500/20">
              {userInitials}
            </div>
            <div>
              <h1 className="text-[22px] md:text-[28px] font-bold tracking-tight">{userName}</h1>
              <p className="text-[13px] text-[#86868b]">{user?.email}</p>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#86868b]" />
            <p className="text-[13px] text-[#86868b]">Loading your workspace...</p>
          </div>
        ) : (
          <>
            {/* BENTO STATS GRID */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8"
            >
              {/* Total Designs */}
              <button
                onClick={() => { setActiveTab('active'); scrollToTemplates(); }}
                className="text-left bg-white dark:bg-[#1c1c1e] border border-black/[0.05] dark:border-white/[0.05] rounded-2xl p-4 md:p-5 space-y-2 hover:border-blue-500/20 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 active:scale-[0.97] cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Layers size={17} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-[24px] md:text-[28px] font-bold tracking-tight">{totalTemplates}</p>
                  <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">Active Templates</p>
                </div>
              </button>

              {/* Total Views */}
              <button
                onClick={() => { setActiveTab('active'); scrollToTemplates(); }}
                className="text-left bg-white dark:bg-[#1c1c1e] border border-black/[0.05] dark:border-white/[0.05] rounded-2xl p-4 md:p-5 space-y-2 hover:border-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300 active:scale-[0.97] cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Eye size={17} className="text-emerald-500" />
                </div>
                <div>
                  <p className="text-[24px] md:text-[28px] font-bold tracking-tight">{totalViews.toLocaleString()}</p>
                  <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide flex items-center gap-1">
                    Page Views
                    <TrendingUp size={10} className="text-emerald-500" />
                  </p>
                </div>
              </button>

              {/* Downloads */}
              <button
                onClick={() => { setActiveTab('active'); scrollToTemplates(); }}
                className="text-left bg-white dark:bg-[#1c1c1e] border border-black/[0.05] dark:border-white/[0.05] rounded-2xl p-4 md:p-5 space-y-2 hover:border-purple-500/20 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 active:scale-[0.97] cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Download size={17} className="text-purple-500" />
                </div>
                <div>
                  <p className="text-[24px] md:text-[28px] font-bold tracking-tight">{totalDownloads.toLocaleString()}</p>
                  <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide flex items-center gap-1">
                    Downloads
                    <TrendingUp size={10} className="text-purple-500" />
                  </p>
                </div>
              </button>

              {/* Shares */}
              <button
                onClick={() => { setActiveTab('active'); scrollToTemplates(); }}
                className="text-left bg-white dark:bg-[#1c1c1e] border border-black/[0.05] dark:border-white/[0.05] rounded-2xl p-4 md:p-5 space-y-2 hover:border-amber-500/20 hover:shadow-lg hover:shadow-amber-500/5 transition-all duration-300 active:scale-[0.97] cursor-pointer group"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Share2 size={17} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-[24px] md:text-[28px] font-bold tracking-tight">{totalShares.toLocaleString()}</p>
                  <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide flex items-center gap-1">
                    Shares
                    <TrendingUp size={10} className="text-amber-500" />
                  </p>
                </div>
              </button>
            </motion.div>

            {/* TEMPLATES & TRASH SECTION */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              ref={templatesRef}
            >
              {/* Tabs Navigation */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-black/[0.06] dark:border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('active')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all",
                      activeTab === 'active'
                        ? "bg-[#0842C7] text-white shadow-md shadow-blue-500/20"
                        : "text-[#86868b] hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                  >
                    <LayoutGrid size={15} />
                    <span>My Templates</span>
                    <span className={cn(
                      "text-[11px] px-2 py-0.5 rounded-full font-bold",
                      activeTab === 'active' ? "bg-white/20 text-white" : "bg-black/5 dark:bg-white/10 text-[#86868b]"
                    )}>
                      {templates.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setActiveTab('trash')}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all",
                      activeTab === 'trash'
                        ? "bg-red-500 text-white shadow-md shadow-red-500/20"
                        : "text-[#86868b] hover:bg-red-500/10 hover:text-red-500"
                    )}
                  >
                    <Trash2 size={15} />
                    <span>Trash</span>
                    {trashedTemplates.length > 0 && (
                      <span className={cn(
                        "text-[11px] px-2 py-0.5 rounded-full font-bold",
                        activeTab === 'trash' ? "bg-white/20 text-white" : "bg-red-500/10 text-red-500"
                      )}>
                        {trashedTemplates.length}
                      </span>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {activeTab === 'active' && (
                    <span className="text-[12px] text-[#86868b] font-medium hidden sm:inline">
                      Since {firstDate}
                    </span>
                  )}
                  {activeTab === 'trash' && trashedTemplates.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setConfirmEmptyTrash(true)}
                      className="h-8 rounded-lg text-red-500 border-red-500/20 hover:bg-red-500/10 text-[12px]"
                    >
                      <Trash2 size={13} className="mr-1.5" />
                      Empty Trash
                    </Button>
                  )}
                </div>
              </div>

              {/* ACTIVE TAB CONTENT */}
              {activeTab === 'active' && (
                <>
                  {templates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] flex items-center justify-center mb-4">
                        <Layers size={28} className="text-[#86868b]/40" />
                      </div>
                      <h2 className="text-[16px] font-bold mb-1">No active templates</h2>
                      <p className="text-[13px] text-[#86868b] max-w-[280px] mb-5 leading-relaxed">
                        Create your first DP template and share it with your community.
                      </p>
                      <a href="/create" onClick={handleCreateNew}>
                        <Button className="h-10 bg-[#0842C7] hover:bg-[#0953D7] text-white rounded-xl text-[13px] font-semibold px-5 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                          <Plus size={15} className="mr-2" />
                          Create Template
                        </Button>
                      </a>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {templates.map((t, i) => (
                        <motion.div
                          key={t.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.03 + i * 0.03 }}
                          className="group bg-white dark:bg-[#1c1c1e] border border-black/[0.05] dark:border-white/[0.05] rounded-2xl overflow-hidden hover:shadow-xl hover:border-blue-500/10 transition-all duration-300"
                        >
                          {/* Thumbnail — clicking goes to detail page */}
                          <Link to={`/template/${t.slug}`}>
                            <div
                              className="aspect-[4/3] relative overflow-hidden cursor-pointer"
                              style={{ backgroundColor: t.background_color }}
                            >
                              {t.background_image && (
                                <img
                                  src={t.background_image}
                                  alt={t.name}
                                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                  loading="lazy"
                                />
                              )}
                              {!t.background_image && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <ImageIcon size={32} className="text-white/20" />
                                </div>
                              )}

                              {/* Hover overlay */}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between p-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="h-8 px-3.5 rounded-full bg-white/95 text-[11px] font-semibold text-[#1d1d1f] flex items-center gap-1.5 shadow-lg">
                                    <TrendingUp size={12} />
                                    View Analytics
                                  </span>
                                </div>
                                {/* Mini stats on hover */}
                                <div className="flex items-center gap-2">
                                  <span className="flex items-center gap-1 text-[11px] text-white/90 font-medium">
                                    <Eye size={10} /> {t.views || 0}
                                  </span>
                                  <span className="flex items-center gap-1 text-[11px] text-white/90 font-medium">
                                    <Download size={10} /> {t.downloads || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </Link>

                          {/* Info */}
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-2">
                              <Link to={`/template/${t.slug}`} className="min-w-0 flex-1">
                                <h3 className="text-[14px] font-semibold truncate mb-1.5 hover:text-blue-500 transition-colors">{t.name}</h3>
                                <div className="mb-2">
                                  <span className={cn(
                                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em]",
                                    t.is_private
                                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  )}>
                                    {t.is_private ? 'Private' : 'Public'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                  <span className="flex items-center gap-1 text-[11px] text-[#86868b]">
                                    <Eye size={10} />
                                    {(t.views || 0).toLocaleString()} views
                                  </span>
                                  <span className="flex items-center gap-1 text-[11px] text-[#86868b]">
                                    <Download size={10} />
                                    {(t.downloads || 0).toLocaleString()}
                                  </span>
                                  <span className="flex items-center gap-1 text-[11px] text-[#86868b]">
                                    <Share2 size={10} />
                                    {(t.shares || 0).toLocaleString()}
                                  </span>
                                </div>
                              </Link>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => handleCopyLink(t)}
                                  className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all active:scale-90 text-[#86868b]"
                                  title="Copy link"
                                >
                                  <Copy size={14} />
                                </button>
                                <button
                                  onClick={() => handleMoveToTrash(t.id)}
                                  disabled={actionLoadingId === t.id}
                                  className={cn(
                                    "p-2 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-90 shrink-0",
                                    actionLoadingId === t.id ? "opacity-50" : "text-[#86868b]"
                                  )}
                                  title="Move to Trash"
                                >
                                  {actionLoadingId === t.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}

                      {/* Create new card */}
                      <a
                        href="/create"
                        onClick={handleCreateNew}
                        className="group flex flex-col items-center justify-center gap-3 aspect-[4/3] rounded-2xl border-2 border-dashed border-black/[0.06] dark:border-white/[0.06] hover:border-blue-500/30 hover:bg-blue-500/[0.02] transition-all active:scale-[0.98]"
                      >
                        <div className="w-12 h-12 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] group-hover:bg-blue-500/10 flex items-center justify-center transition-colors">
                          <Plus size={22} className="text-[#86868b] group-hover:text-blue-500 transition-colors" />
                        </div>
                        <span className="text-[13px] font-semibold text-[#86868b] group-hover:text-blue-500 transition-colors">
                          Create New
                        </span>
                      </a>
                    </div>
                  )}
                </>
              )}

              {/* TRASH TAB CONTENT */}
              {activeTab === 'trash' && (
                <div>
                  <div className="mb-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3 text-[13px] text-amber-700 dark:text-amber-400">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-500" />
                    <div>
                      <p className="font-semibold">30-Day Trash Retention</p>
                      <p className="text-[12px] opacity-90">
                        Templates moved to trash are hidden across the platform. You can restore them anytime within 30 days. After 30 days, they are permanently deleted automatically.
                      </p>
                    </div>
                  </div>

                  {trashedTemplates.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-black/[0.03] dark:bg-white/[0.03] flex items-center justify-center mb-4">
                        <Trash2 size={28} className="text-[#86868b]/30" />
                      </div>
                      <h2 className="text-[16px] font-bold mb-1">Trash is empty</h2>
                      <p className="text-[13px] text-[#86868b] max-w-[280px]">
                        No deleted templates in your trash folder.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {trashedTemplates.map((t, i) => {
                        const daysLeft = getDaysRemainingInTrash(t.deleted_at);
                        return (
                          <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.03 + i * 0.03 }}
                            className="bg-white dark:bg-[#1c1c1e] border border-black/[0.05] dark:border-white/[0.05] rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300"
                          >
                            {/* Thumbnail */}
                            <div
                              className="aspect-[4/3] relative overflow-hidden opacity-75"
                              style={{ backgroundColor: t.background_color }}
                            >
                              {t.background_image && (
                                <img
                                  src={t.background_image}
                                  alt={t.name}
                                  className="absolute inset-0 w-full h-full object-cover grayscale"
                                  loading="lazy"
                                />
                              )}
                              {!t.background_image && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <ImageIcon size={32} className="text-white/20" />
                                </div>
                              )}

                              <div className="absolute top-3 right-3">
                                <span className={cn(
                                  "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm",
                                  daysLeft <= 5
                                    ? "bg-red-500/90 text-white"
                                    : "bg-black/60 text-white"
                                )}>
                                  {daysLeft} {daysLeft === 1 ? 'day' : 'days'} left
                                </span>
                              </div>
                            </div>

                            {/* Info & Actions */}
                            <div className="p-4">
                              <h3 className="text-[14px] font-semibold truncate mb-1">{t.name}</h3>
                              <p className="text-[11px] text-[#86868b] mb-4">
                                Deleted {t.deleted_at ? new Date(t.deleted_at).toLocaleDateString() : 'recently'}
                              </p>

                              <div className="flex items-center gap-2 pt-1 border-t border-black/[0.04] dark:border-white/[0.04]">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleRestore(t.id)}
                                  disabled={actionLoadingId === t.id}
                                  className="flex-1 h-8 rounded-xl text-[12px] font-semibold border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                                >
                                  {actionLoadingId === t.id ? (
                                    <Loader2 size={13} className="animate-spin mr-1.5" />
                                  ) : (
                                    <RotateCcw size={13} className="mr-1.5" />
                                  )}
                                  Restore
                                </Button>

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setConfirmPermanentDeleteId(t.id)}
                                  disabled={actionLoadingId === t.id}
                                  className="h-8 rounded-xl text-[12px] text-red-500 hover:bg-red-500/10 px-3"
                                  title="Delete Forever"
                                >
                                  <Trash2 size={13} />
                                </Button>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </main>

      {/* Move to Trash Confirmation Dialog */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
        <AlertDialogContent className="bg-white dark:bg-[#1c1c1e] border-black/10 dark:border-white/10 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[17px]">Move this template to trash?</AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-[#86868b]">
              It will be hidden from the platform. You can restore it from the Trash folder anytime within 30 days before it is permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-[13px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmMoveToTrash}
              className="rounded-xl text-[13px] bg-red-500 hover:bg-red-600 text-white"
            >
              Move to Trash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Permanent Delete Confirmation Dialog */}
      <AlertDialog open={!!confirmPermanentDeleteId} onOpenChange={(open) => { if (!open) setConfirmPermanentDeleteId(null); }}>
        <AlertDialogContent className="bg-white dark:bg-[#1c1c1e] border-black/10 dark:border-white/10 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[17px] text-red-500 flex items-center gap-2">
              <AlertTriangle size={18} />
              Permanently delete template?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-[#86868b]">
              This action cannot be undone. This template and all of its associated data will be removed forever.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-[13px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPermanentDelete}
              className="rounded-xl text-[13px] bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Empty Trash Confirmation Dialog */}
      <AlertDialog open={confirmEmptyTrash} onOpenChange={setConfirmEmptyTrash}>
        <AlertDialogContent className="bg-white dark:bg-[#1c1c1e] border-black/10 dark:border-white/10 rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[17px] text-red-500 flex items-center gap-2">
              <AlertTriangle size={18} />
              Empty all items in Trash?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[13px] text-[#86868b]">
              All {trashedTemplates.length} template(s) in your trash folder will be permanently deleted right now. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-[13px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEmptyTrash}
              className="rounded-xl text-[13px] bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              Empty Trash Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Dashboard;