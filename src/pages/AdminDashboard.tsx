import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, LayoutGrid, LogOut, Loader2, Trash2, Shield,
  BarChart3, TrendingUp, Eye, Download, Share2, Search,
  ChevronLeft, AlertCircle, X, Calendar, User as UserIcon,
  ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AdminTemplate {
  id: string;
  slug: string;
  custom_slug?: string | null;
  name: string;
  creator_name?: string | null;
  event_name?: string | null;
  user_id: string;
  views: number;
  downloads: number;
  shares: number;
  is_private: boolean;
  background_image?: string | null;
  canvas_width?: number;
  canvas_height?: number;
  created_at: string;
  updated_at: string;
}

interface AdminUser {
  id: string;
  email: string;
  username: string;
  created_at: string;
  template_count?: number;
  total_views?: number;
  total_downloads?: number;
  total_shares?: number;
}

interface SiteStats {
  totalUsers: number;
  totalTemplates: number;
  totalViews: number;
  totalDownloads: number;
}

const AdminDashboard: React.FC = () => {
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'overview' | 'users' | 'templates'>('overview');
  const [userTab, setUserTab] = useState<'all' | 'with-templates' | 'without-templates'>('all');
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [allUsers, setAllUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<SiteStats>({
    totalUsers: 0,
    totalTemplates: 0,
    totalViews: 0,
    totalDownloads: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<AdminTemplate | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userTemplates, setUserTemplates] = useState<AdminTemplate[]>([]);
  const [previousModal, setPreviousModal] = useState<'user' | null>(null);

  // Apply theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(savedTheme);
  }, []);

  // Check if user is admin
  useEffect(() => {
    if (!authLoading && (!user || user.email !== import.meta.env.VITE_ADMIN_EMAIL)) {
      navigate('/');
      toast.error('Admin access required');
    }
  }, [user, authLoading, navigate]);

  // Load admin data
  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get all templates with creator name
      const { data: templatesData, error: templatesError } = await supabase
        .from('templates' as any)
        .select('id, slug, custom_slug, name, creator_name, event_name, user_id, views, downloads, shares, is_private, background_image, canvas_width, canvas_height, created_at, updated_at')
        .order('created_at', { ascending: false }) as unknown as { data: AdminTemplate[] | null; error: any };

      if (!templatesError && templatesData) {
        setTemplates(templatesData);
      }

      // Get all profiles (all registered users - including generation-only users)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles' as any)
        .select('id, email, username, created_at') as unknown as { data: any[] | null; error: any };

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        toast.error('Failed to load user profiles');
      }

      // Create map of users with template statistics
      const userStatsMap = new Map<string, AdminUser>();

      // Initialize all users from profiles table
      if (profilesData && profilesData.length > 0) {
        profilesData.forEach(profile => {
          userStatsMap.set(profile.id, {
            id: profile.id,
            email: profile.email || '',
            username: profile.username || 'User',
            created_at: profile.created_at,
            template_count: 0,
            total_views: 0,
            total_downloads: 0,
            total_shares: 0,
          });
        });
      } else {
        console.warn('No profiles found in database');
      }

      // Add template statistics to users
      if (templatesData) {
        templatesData.forEach(template => {
          const userId = template.user_id;
          
          if (!userStatsMap.has(userId)) {
            // User created template but not in profiles (shouldn't happen with trigger, but handle it)
            userStatsMap.set(userId, {
              id: userId,
              email: '',
              username: template.creator_name || 'User',
              created_at: template.created_at,
              template_count: 0,
              total_views: 0,
              total_downloads: 0,
              total_shares: 0,
            });
          }

          const userStats = userStatsMap.get(userId)!;
          userStats.template_count = (userStats.template_count || 0) + 1;
          userStats.total_views = (userStats.total_views || 0) + template.views;
          userStats.total_downloads = (userStats.total_downloads || 0) + template.downloads;
          userStats.total_shares = (userStats.total_shares || 0) + template.shares;
        });
      }

      const fullUsersList = Array.from(userStatsMap.values());
      setAllUsers(fullUsersList);
      setUsers(fullUsersList.filter(u => (u.template_count || 0) > 0));

      // Calculate stats
      setStats({
        totalUsers: fullUsersList.length,
        totalTemplates: templatesData?.length || 0,
        totalViews: templatesData?.reduce((sum, t) => sum + (t.views || 0), 0) || 0,
        totalDownloads: templatesData?.reduce((sum, t) => sum + (t.downloads || 0), 0) || 0,
      });
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      setDeletingId(templateId);
      const { error } = await supabase
        .from('templates' as any)
        .delete()
        .eq('id', templateId);

      if (error) {
        toast.error('Failed to delete template');
        return;
      }

      setTemplates(prev => prev.filter(t => t.id !== templateId));
      toast.success('Template deleted successfully');
      setSelectedTemplate(null);
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    } finally {
      setDeletingId(null);
    }
  };

  const handleViewUserDetails = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    setSelectedUser(user);
    setPreviousModal(null);
    const userTmpls = templates.filter(t => t.user_id === userId);
    setUserTemplates(userTmpls);
  };

  const handleViewTemplateFromUser = (template: AdminTemplate) => {
    setPreviousModal('user');
    setSelectedTemplate(template);
  };

  const handleModalBack = () => {
    if (previousModal === 'user') {
      setSelectedTemplate(null);
      setPreviousModal(null);
    } else {
      setSelectedTemplate(null);
      setSelectedUser(null);
      setPreviousModal(null);
    }
  };

  const downloadCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
      toast.error('No data to download');
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value || '';
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success('CSV downloaded successfully');
  };

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.creator_name?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const usersWithTemplates = allUsers.filter(u => (u.template_count || 0) > 0);
  const usersWithoutTemplates = allUsers.filter(u => (u.template_count || 0) === 0);

  const filteredUsers = (() => {
    const list = userTab === 'all' ? allUsers : userTab === 'with-templates' ? usersWithTemplates : usersWithoutTemplates;
    return list.filter(u =>
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  })();

  if (authLoading || loading) {
    return (
      <div className="h-[100dvh] flex items-center justify-center bg-[#fafafa] dark:bg-[#000]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-[#86868b] text-sm font-medium">Loading admin dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-[#fafafa] dark:bg-[#000] text-[#1d1d1f] dark:text-[#f5f5f7] font-sans tracking-tight transition-colors duration-300">
      
      {/* HEADER */}
      <header className="h-14 border-b border-black/5 dark:border-white/5 bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-2xl flex items-center px-6 gap-4">
        <div className="flex items-center gap-3 flex-1">
          <Link
            to="/"
            className="p-2 -ml-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <ChevronLeft size={20} className="text-[#86868b]" />
          </Link>
          <div className="flex items-center gap-2">
            <Shield size={22} className="text-blue-500" />
            <h1 className="text-lg font-bold">Admin Dashboard</h1>
          </div>
        </div>
        <Button
          onClick={async () => {
            await signOut();
            navigate('/');
          }}
          variant="ghost"
          className="text-[13px] gap-2"
        >
          <LogOut size={16} />
          Sign Out
        </Button>
      </header>

      <div className="flex-1 overflow-auto">
        {/* TABS */}
        <div className="sticky top-0 z-10 border-b border-black/5 dark:border-white/5 bg-white/50 dark:bg-[#1c1c1e]/50 backdrop-blur-md px-6 flex gap-8">
          {['overview', 'users', 'templates'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t as any)}
              className={cn(
                'py-4 text-[13px] font-medium border-b-2 transition-all',
                tab === t
                  ? 'text-[#1d1d1f] dark:text-[#f5f5f7] border-blue-500'
                  : 'text-[#86868b] border-transparent hover:border-black/10 dark:hover:border-white/10'
              )}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="max-w-7xl mx-auto px-6 py-8">
          {/* OVERVIEW TAB */}
          {tab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-2xl font-bold mb-6">Site Statistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Users', value: stats.totalUsers, icon: Users },
                    { label: 'Total Templates', value: stats.totalTemplates, icon: LayoutGrid },
                    { label: 'Total Views', value: stats.totalViews, icon: Eye },
                    { label: 'Total Downloads', value: stats.totalDownloads, icon: Download },
                  ].map((stat, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-6 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/5 dark:border-white/10"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <p className="text-[#86868b] text-[12px] font-medium mb-2">{stat.label}</p>
                          <p className="text-3xl font-bold">{stat.value.toLocaleString()}</p>
                        </div>
                        <stat.icon className="text-blue-500/40" size={24} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-bold mb-6">Top Templates</h2>
                <div className="space-y-3">
                  {templates.slice(0, 5).map(t => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-4 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/5 dark:border-white/10 flex items-start gap-4 cursor-pointer hover:border-blue-500/30 transition-colors"
                      onClick={() => setSelectedTemplate(t)}
                    >
                      {/* Template Thumbnail */}
                      <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 flex items-center justify-center">
                        {t.background_image ? (
                          <img src={t.background_image} alt={t.name} className="w-full h-full object-cover" />
                        ) : (
                          <LayoutGrid size={24} className="text-[#86868b] opacity-40" />
                        )}
                      </div>
                      {/* Template Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{t.name}</h3>
                        {t.creator_name && <p className="text-[12px] text-[#86868b] mt-1 truncate">Creator: {t.creator_name}</p>}
                        <div className="flex gap-4 mt-2 text-[12px] text-[#86868b]">
                          <span className="flex items-center gap-1">
                            <Eye size={12} /> {t.views}
                          </span>
                          <span className="flex items-center gap-1">
                            <Download size={12} /> {t.downloads}
                          </span>
                          <span className="flex items-center gap-1">
                            <Share2 size={12} /> {t.shares}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* USERS TAB */}
          {tab === 'users' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold mb-4">Users</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20"
                  >
                    <p className="text-[12px] text-[#86868b] font-medium mb-1">Total Users</p>
                    <p className="text-3xl font-bold text-blue-600">{allUsers.length}</p>
                    <button
                      onClick={() => downloadCSV(
                        allUsers.map(u => ({
                          'User ID': u.id,
                          'Email': u.email,
                          'Username': u.username,
                          'Joined': new Date(u.created_at).toLocaleDateString(),
                          'Templates Created': u.template_count || 0,
                          'Total Views': u.total_views || 0,
                          'Total Downloads': u.total_downloads || 0,
                          'Total Shares': u.total_shares || 0,
                        })),
                        'all_users'
                      )}
                      className="text-[11px] text-blue-600 hover:text-blue-700 mt-3 font-medium"
                    >
                      Download CSV →
                    </button>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 rounded-xl bg-green-500/5 border border-green-500/20"
                  >
                    <p className="text-[12px] text-[#86868b] font-medium mb-1">Users with Templates</p>
                    <p className="text-3xl font-bold text-green-600">{usersWithTemplates.length}</p>
                    <button
                      onClick={() => downloadCSV(
                        usersWithTemplates.map(u => ({
                          'User ID': u.id,
                          'Email': u.email,
                          'Username': u.username,
                          'Joined': new Date(u.created_at).toLocaleDateString(),
                          'Templates Created': u.template_count || 0,
                          'Total Views': u.total_views || 0,
                          'Total Downloads': u.total_downloads || 0,
                          'Total Shares': u.total_shares || 0,
                        })),
                        'users_with_templates'
                      )}
                      className="text-[11px] text-green-600 hover:text-green-700 mt-3 font-medium"
                    >
                      Download CSV →
                    </button>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="p-4 rounded-xl bg-orange-500/5 border border-orange-500/20"
                  >
                    <p className="text-[12px] text-[#86868b] font-medium mb-1">Inactive Users</p>
                    <p className="text-3xl font-bold text-orange-600">{usersWithoutTemplates.length}</p>
                    <button
                      onClick={() => downloadCSV(
                        usersWithoutTemplates.map(u => ({
                          'User ID': u.id,
                          'Email': u.email,
                          'Username': u.username,
                          'Joined': new Date(u.created_at).toLocaleDateString(),
                        })),
                        'inactive_users'
                      )}
                      className="text-[11px] text-orange-600 hover:text-orange-700 mt-3 font-medium"
                    >
                      Download CSV →
                    </button>
                  </motion.div>
                </div>
              </div>

              {/* User Tabs */}
              <div className="flex gap-2 border-b border-black/5 dark:border-white/10">
                {['all', 'with-templates', 'without-templates'].map(t => (
                  <button
                    key={t}
                    onClick={() => setUserTab(t as any)}
                    className={cn(
                      'py-3 px-4 text-[13px] font-medium border-b-2 transition-all',
                      userTab === t
                        ? 'text-[#1d1d1f] dark:text-[#f5f5f7] border-blue-500'
                        : 'text-[#86868b] border-transparent hover:border-black/10 dark:hover:border-white/10'
                    )}
                  >
                    {t === 'all' ? 'All Users' : t === 'with-templates' ? 'With Templates' : 'Inactive'}
                  </button>
                ))}
              </div>

              {/* User Search */}
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]" />
                <input
                  type="text"
                  placeholder="Search by name, email, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-[14px] outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              {/* Users List */}
              <div className="space-y-2">
                {filteredUsers.map(u => (
                  <motion.div
                    key={u.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/5 dark:border-white/10 cursor-pointer hover:border-blue-500/30 transition-colors"
                    onClick={() => handleViewUserDetails(u.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <UserIcon size={16} className="text-blue-500" />
                          <p className="font-medium text-sm">{u.username}</p>
                        </div>
                        <p className="text-[12px] text-[#86868b] mb-2">{u.email}</p>
                        <p className="text-[12px] text-[#86868b] mb-3">
                          Joined: {new Date(u.created_at).toLocaleDateString()}
                        </p>
                        {u.template_count! > 0 && (
                          <div className="flex gap-4 text-[12px] text-[#86868b]">
                            <span className="flex items-center gap-1">
                              <LayoutGrid size={12} /> {u.template_count} templates
                            </span>
                            <span className="flex items-center gap-1">
                              <Eye size={12} /> {u.total_views} views
                            </span>
                            <span className="flex items-center gap-1">
                              <Download size={12} /> {u.total_downloads} downloads
                            </span>
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="sm" className="text-blue-500">
                        View Details →
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TEMPLATES TAB */}
          {tab === 'templates' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold mb-4">All Templates</h2>
                <div className="relative mb-6">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#86868b]" />
                  <input
                    type="text"
                    placeholder="Search templates by name, slug, or creator..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] text-[14px] outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                </div>
              </div>

              {filteredTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-[#86868b] mx-auto mb-4" />
                  <p className="text-[#86868b]">No templates found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredTemplates.map((t, idx) => (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group relative rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/5 dark:border-white/10 overflow-hidden cursor-pointer hover:border-blue-500/30 transition-all hover:shadow-lg"
                      onClick={() => setSelectedTemplate(t)}
                    >
                      {/* Thumbnail */}
                      <div className="h-40 bg-black/5 dark:bg-white/5 overflow-hidden border-b border-black/5 dark:border-white/10 flex items-center justify-center">
                        {t.background_image ? (
                          <img src={t.background_image} alt={t.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        ) : (
                          <LayoutGrid size={32} className="text-[#86868b] opacity-40" />
                        )}
                      </div>
                      {/* Content */}
                      <div className="p-4">
                        <h3 className="font-semibold text-sm mb-1 line-clamp-2">{t.name}</h3>
                        {t.creator_name && (
                          <p className="text-[11px] text-blue-600 dark:text-blue-400 mb-3 truncate">
                            {t.creator_name}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mb-3">
                          <span className={cn('px-2 py-1 text-[10px] rounded font-medium', t.is_private ? 'bg-yellow-500/20 text-yellow-600' : 'bg-green-500/20 text-green-600')}>
                            {t.is_private ? 'Private' : 'Public'}
                          </span>
                          <span className="text-[10px] text-[#86868b] px-2 py-1 bg-black/[0.02] dark:bg-white/[0.02] rounded">
                            {new Date(t.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex gap-3 text-[11px] text-[#86868b]">
                          <span className="flex items-center gap-1">
                            <Eye size={10} /> {t.views}
                          </span>
                          <span className="flex items-center gap-1">
                            <Download size={10} /> {t.downloads}
                          </span>
                          <span className="flex items-center gap-1">
                            <Share2 size={10} /> {t.shares}
                          </span>
                        </div>
                      </div>
                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(t.id);
                        }}
                        disabled={deletingId === t.id}
                        className="absolute top-3 right-3 p-2 rounded-lg bg-white/90 dark:bg-[#1c1c1e]/90 hover:bg-red-500/20 text-red-500 transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                      >
                        {deletingId === t.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* TEMPLATE DETAIL MODAL */}
      <AnimatePresence>
        {selectedTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-4"
            onClick={() => previousModal === 'user' ? handleModalBack() : setSelectedTemplate(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.97 }}
              className="bg-white dark:bg-[#1c1c1e] w-full sm:max-w-4xl sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden border border-black/5 dark:border-white/10 max-h-[90vh] flex flex-col sm:flex-row"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Fixed Image Section */}
              <div className="flex-shrink-0 w-full sm:w-80 bg-black/5 dark:bg-white/5 border-b sm:border-b-0 sm:border-r border-black/5 dark:border-white/10 flex flex-col">
                <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-white/50 dark:bg-[#1c1c1e]/50 backdrop-blur border-b border-black/5 dark:border-white/10 sm:hidden">
                  <div className="flex items-center gap-2">
                    {previousModal && (
                      <button
                        onClick={handleModalBack}
                        className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[#86868b]"
                        title="Go back"
                      >
                        <ChevronLeft size={20} />
                      </button>
                    )}
                    <h2 className="text-lg font-bold">{selectedTemplate.name}</h2>
                  </div>
                  <button
                    onClick={() => setSelectedTemplate(null)}
                    className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <X size={20} />
                  </button>
                </div>
                <div className="p-4 flex-1 flex items-center justify-center sm:p-6">
                  {selectedTemplate.background_image ? (
                    <div className="w-full rounded-xl overflow-hidden border border-black/10 dark:border-white/10">
                      <img
                        src={selectedTemplate.background_image}
                        alt={selectedTemplate.name}
                        className="w-full h-auto"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-square rounded-xl overflow-hidden border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 flex items-center justify-center">
                      <div className="text-center">
                        <LayoutGrid size={48} className="text-[#86868b] mx-auto mb-3 opacity-40" />
                        <p className="text-[13px] text-[#86868b]">No preview available</p>
                        {selectedTemplate.canvas_width && selectedTemplate.canvas_height && (
                          <p className="text-[11px] text-[#86868b] mt-2">
                            {selectedTemplate.canvas_width}×{selectedTemplate.canvas_height}px
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Scrollable Details Section */}
              <div className="flex-1 flex flex-col overflow-hidden">
              <div className="hidden sm:flex items-center justify-between p-6 border-b border-black/5 dark:border-white/10 bg-white/50 dark:bg-[#1c1c1e]/50 backdrop-blur flex-shrink-0">
                  <div>
                    <h2 className="text-xl font-bold">{selectedTemplate.name}</h2>
                    {selectedTemplate.creator_name && (
                      <p className="text-[13px] text-[#86868b] mt-1">Creator: {selectedTemplate.creator_name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {previousModal && (
                      <button
                        onClick={handleModalBack}
                        className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex-shrink-0 text-[#86868b]"
                        title="Go back"
                      >
                        <ChevronLeft size={20} />
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedTemplate(null)}
                      className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 flex-shrink-0"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                <div className="overflow-y-auto flex-1 p-6 space-y-6">
                {/* Template Metadata */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                    <p className="text-[12px] text-[#86868b] font-medium mb-1">Template ID</p>
                    <p className="text-[13px] font-mono truncate">{selectedTemplate.slug}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                    <p className="text-[12px] text-[#86868b] font-medium mb-1">Status</p>
                    <p className={cn('text-[13px] font-medium', selectedTemplate.is_private ? 'text-yellow-600' : 'text-green-600')}>
                      {selectedTemplate.is_private ? 'Private' : 'Public'}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                    <p className="text-[12px] text-[#86868b] font-medium mb-1">Created</p>
                    <p className="text-[13px]">{new Date(selectedTemplate.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02]">
                    <p className="text-[12px] text-[#86868b] font-medium mb-1">Last Updated</p>
                    <p className="text-[13px]">{new Date(selectedTemplate.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Template Links */}
                <div>
                  <h3 className="text-[14px] font-bold mb-3">Template Links</h3>
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                      <p className="text-[12px] text-[#86868b] font-medium mb-2">Standard Link</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-[12px] font-mono bg-black/[0.02] dark:bg-white/[0.02] p-2 rounded truncate">
                          {`${window.location.origin}/dp/${selectedTemplate.slug}`}
                        </code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/dp/${selectedTemplate.slug}`);
                            toast.success('Link copied!');
                          }}
                          className="flex-shrink-0 p-2 rounded-lg hover:bg-blue-500/20 text-blue-600 transition-colors"
                          title="Copy link"
                        >
                          <Share2 size={16} />
                        </button>
                      </div>
                    </div>
                    {selectedTemplate.custom_slug && (
                      <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20">
                        <p className="text-[12px] text-[#86868b] font-medium mb-2">Custom Link</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-[12px] font-mono bg-black/[0.02] dark:bg-white/[0.02] p-2 rounded truncate">
                            {`${window.location.origin}/dp/${selectedTemplate.custom_slug}`}
                          </code>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`${window.location.origin}/dp/${selectedTemplate.custom_slug}`);
                              toast.success('Custom link copied!');
                            }}
                            className="flex-shrink-0 p-2 rounded-lg hover:bg-green-500/20 text-green-600 transition-colors"
                            title="Copy custom link"
                          >
                            <Share2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {selectedTemplate.event_name && (
                  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                    <p className="text-[12px] text-[#86868b] font-medium mb-1">Event Name</p>
                    <p className="text-[14px] font-medium">{selectedTemplate.event_name}</p>
                  </div>
                )}

                {/* Analytics */}
                <div>
                  <h3 className="text-[14px] font-bold mb-4">Engagement Insights</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye size={16} className="text-blue-500" />
                        <p className="text-[12px] text-[#86868b] font-medium">Views</p>
                      </div>
                      <p className="text-2xl font-bold">{selectedTemplate.views.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Download size={16} className="text-green-500" />
                        <p className="text-[12px] text-[#86868b] font-medium">Downloads</p>
                      </div>
                      <p className="text-2xl font-bold">{selectedTemplate.downloads.toLocaleString()}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Share2 size={16} className="text-purple-500" />
                        <p className="text-[12px] text-[#86868b] font-medium">Shares</p>
                      </div>
                      <p className="text-2xl font-bold">{selectedTemplate.shares.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Conversion Metrics */}
                <div>
                  <h3 className="text-[14px] font-bold mb-4">Conversion Metrics</h3>
                  <div className="space-y-3">
                    {selectedTemplate.views > 0 && (
                      <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.02]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[12px] text-[#86868b]">Download Rate</span>
                          <span className="text-[13px] font-semibold">
                            {((selectedTemplate.downloads / selectedTemplate.views) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500"
                            style={{ width: `${Math.min((selectedTemplate.downloads / selectedTemplate.views) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {selectedTemplate.downloads > 0 && (
                      <div className="p-3 rounded-lg bg-black/[0.02] dark:bg-white/[0.02]">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[12px] text-[#86868b]">Share Rate (of Downloads)</span>
                          <span className="text-[13px] font-semibold">
                            {((selectedTemplate.shares / selectedTemplate.downloads) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500"
                            style={{ width: `${Math.min((selectedTemplate.shares / selectedTemplate.downloads) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-black/5 dark:border-white/10">
                  <Button
                    onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                    disabled={deletingId === selectedTemplate.id}
                    className="flex-1 bg-red-500/10 text-red-600 hover:bg-red-500/20"
                  >
                    {deletingId === selectedTemplate.id ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 size={16} />
                        Delete Template
                      </>
                    )}
                  </Button>
                </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* USER DETAIL MODAL */}
      <AnimatePresence>
        {selectedUser && !selectedTemplate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-4"
            onClick={() => setSelectedUser(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0, scale: 0.97 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 40, opacity: 0, scale: 0.97 }}
              className="bg-white dark:bg-[#1c1c1e] w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden border border-black/5 dark:border-white/10 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between p-6 border-b border-black/5 dark:border-white/10 bg-white/50 dark:bg-[#1c1c1e]/50 backdrop-blur">
                <div className="flex items-center gap-3">
                  {previousModal && (
                    <button
                      onClick={handleModalBack}
                      className="p-2 -ml-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[#86868b]"
                      title="Go back"
                    >
                      <ChevronLeft size={20} />
                    </button>
                  )}
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <UserIcon size={20} /> {selectedUser.username}
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* User Info */}
                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
                  <p className="text-[12px] text-[#86868b] font-medium mb-2">Email</p>
                  <p className="text-[14px] font-medium mb-3">{selectedUser.email}</p>
                  <p className="text-[12px] text-[#86868b] font-medium mb-2">Username</p>
                  <p className="text-[14px] font-medium">{selectedUser.username}</p>
                  <p className="text-[11px] text-[#86868b] mt-2 font-mono break-all">ID: {selectedUser.id}</p>
                </div>

                {/* Overall Stats */}
                <div>
                  <h3 className="text-[14px] font-bold mb-4">Overall Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/10">
                      <p className="text-[12px] text-[#86868b] font-medium mb-2">Templates Created</p>
                      <p className="text-3xl font-bold">{selectedUser.template_count}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/10">
                      <p className="text-[12px] text-[#86868b] font-medium mb-2">Total Views</p>
                      <p className="text-3xl font-bold">{selectedUser.total_views?.toLocaleString() || 0}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/10">
                      <p className="text-[12px] text-[#86868b] font-medium mb-2">Total Downloads</p>
                      <p className="text-3xl font-bold">{selectedUser.total_downloads?.toLocaleString() || 0}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/10">
                      <p className="text-[12px] text-[#86868b] font-medium mb-2">Total Shares</p>
                      <p className="text-3xl font-bold">{selectedUser.total_shares?.toLocaleString() || 0}</p>
                    </div>
                  </div>
                </div>

                {/* User Templates */}
                <div>
                  <h3 className="text-[14px] font-bold mb-4">Templates ({userTemplates.length})</h3>
                  <div className="space-y-3">
                    {userTemplates.length === 0 ? (
                      <p className="text-center py-6 text-[#86868b]">No templates found</p>
                    ) : (
                      userTemplates.map(template => (
                        <div
                          key={template.id}
                          className="p-4 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/10 cursor-pointer hover:border-blue-500/30 transition-colors"
                          onClick={() => handleViewTemplateFromUser(template)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-[13px]">{template.name}</p>
                              <p className="text-[12px] text-[#86868b]">{template.slug}</p>
                            </div>
                            <span className={cn('px-2 py-1 text-[11px] rounded font-medium', template.is_private ? 'bg-yellow-500/20 text-yellow-600' : 'bg-green-500/20 text-green-600')}>
                              {template.is_private ? 'Private' : 'Public'}
                            </span>
                          </div>
                          <div className="flex gap-4 text-[12px] text-[#86868b]">
                            <span className="flex items-center gap-1">
                              <Eye size={12} /> {template.views}
                            </span>
                            <span className="flex items-center gap-1">
                              <Download size={12} /> {template.downloads}
                            </span>
                            <span className="flex items-center gap-1">
                              <Share2 size={12} /> {template.shares}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-black/5 dark:border-white/10">
                  <div className="text-[12px] text-[#86868b]">
                    Member since {new Date(selectedUser.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        downloadCSV(
                          [{
                            'User ID': selectedUser.id,
                            'Email': selectedUser.email,
                            'Username': selectedUser.username,
                            'Joined': new Date(selectedUser.created_at).toLocaleDateString(),
                            'Templates Created': selectedUser.template_count || 0,
                            'Total Views': selectedUser.total_views || 0,
                            'Total Downloads': selectedUser.total_downloads || 0,
                            'Total Shares': selectedUser.total_shares || 0,
                          }],
                          selectedUser.username,
                        );
                      }}
                      className="text-[12px] text-blue-600 hover:text-blue-700 font-medium"
                      title="Download user data"
                    >
                      ↓ CSV
                    </button>
                    {previousModal === null && (
                      <button
                        onClick={() => setSelectedUser(null)}
                        className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-[#86868b]"
                        title="Close"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
