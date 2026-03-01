import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getRecentTemplates, PublicTemplate } from "@/lib/templates";
import { 
  ArrowRight, Share2,
  ChevronRight, LayoutDashboard, Zap, 
  Globe2, BarChart3, Shield, Moon, Sun,
  LogOut, Eye, Download, Image as ImageIcon, Clock
} from "lucide-react";

// --- REFINED ANIMATION ---
const SectionWrapper = ({ children, className = "" }) => (
  <motion.section
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-100px" }}
    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    className={className}
  >
    {children}
  </motion.section>
);

const Homepage = () => {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const { user, signOut } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const [recentTemplates, setRecentTemplates] = useState<PublicTemplate[]>([]);

  // Fetch recent templates
  useEffect(() => {
    getRecentTemplates(3).then((data) => {
      console.log('Recent templates fetched:', data);
      setRecentTemplates(data);
    }).catch((err) => console.error('Error fetching recent templates:', err));
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const navigate = useNavigate();
  const handleCreateNew = (e: React.MouseEvent) => {
    e.preventDefault();
    localStorage.removeItem('canvas_editor_state');
    navigate('/create');
  };

  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || '?';

  return (
    <main className="min-h-screen bg-[#fafafa] dark:bg-[#000] text-[#1d1d1f] dark:text-[#f5f5f7] selection:bg-blue-500/30 font-sans tracking-tight transition-colors duration-500">
      
      {/* 1. NAV - Restored All Links */}
      <header className="fixed top-0 w-full z-[100] border-b border-black/[0.05] dark:border-white/[0.05] bg-white/70 dark:bg-black/70 backdrop-blur-2xl">
        <div className="max-w-[1440px] mx-auto h-14 flex items-center px-6">
          {/* Left — Logo (fixed width for balance) */}
          <div className="flex-1 flex items-center">
            <Link to="/" className="text-xl font-semibold tracking-tighter hover:opacity-70 transition-opacity">
              Dummy<span className="text-blue-500">.</span>
            </Link>
          </div>
          
          {/* Center — Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium opacity-80">
            <a href="/create" onClick={handleCreateNew} className="hover:text-blue-500 transition-colors">Create</a>
            <Link to="/explore" className="hover:text-blue-500 transition-colors">Explore</Link>
          </nav>

          {/* Right — Actions (fixed width for balance) */}
          <div className="flex-1 flex items-center justify-end gap-3">
            <button onClick={toggleTheme} className="p-2 opacity-60 hover:opacity-100 transition-opacity">
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {user ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2.5 h-9 pl-1 pr-3 rounded-full bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] transition-all active:scale-95"
                >
                  <div className="w-7 h-7 rounded-full bg-[#0071e3] flex items-center justify-center text-white text-[11px] font-bold shadow-sm">
                    {userInitials}
                  </div>
                  <span className="text-[13px] font-medium hidden sm:block max-w-[120px] truncate">
                    {user.user_metadata?.full_name || user.email?.split('@')[0]}
                  </span>
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.95 }}
                      transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 top-full mt-2 w-[240px] bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl border border-black/[0.06] dark:border-white/[0.08] overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-black/[0.05] dark:border-white/[0.05]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#0071e3] flex items-center justify-center text-white text-[13px] font-bold shadow-sm">
                            {userInitials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold truncate">
                              {user.user_metadata?.full_name || 'User'}
                            </p>
                            <p className="text-[11px] text-[#86868b] truncate">{user.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-1.5">
                        <Link
                          to="/dashboard"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                        >
                          <LayoutDashboard size={15} className="text-[#86868b]" />
                          Dashboard
                        </Link>
                        <Link
                          to="/create"
                          onClick={(e) => { setProfileOpen(false); handleCreateNew(e); }}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium hover:bg-black/[0.04] dark:hover:bg-white/[0.04] transition-colors"
                        >
                          <Zap size={15} className="text-[#86868b]" />
                          Create New
                        </Link>
                        <div className="h-px bg-black/[0.05] dark:bg-white/[0.05] my-1 mx-2" />
                        <button
                          onClick={async () => { setProfileOpen(false); await signOut(); }}
                          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium hover:bg-red-500/[0.06] text-red-500 transition-colors w-full text-left"
                        >
                          <LogOut size={15} />
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <>
                <Link to="/signin">
                    <Button variant="ghost" className="text-[13px] h-8 rounded-full">Sign In</Button>
                </Link>
                <a href="/create" onClick={handleCreateNew}>
                    <Button className="bg-[#0071e3] hover:bg-[#0077ed] text-white text-[13px] h-8 px-4 rounded-full transition-all">
                    Get Started
                    </Button>
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 2. HERO - Fixed Gallery Link */}
      <section className="relative pt-44 pb-32 overflow-hidden text-center">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,113,227,0.12),transparent_50%)]" />
        
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-500 text-[13px] font-semibold mb-6">
              Edit your dummies in Minutes
            </span>
            <h1 className="text-5xl md:text-8xl font-bold tracking-tight leading-[1.05] mb-8">
              Momentum, <br /> 
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-[#1d1d1f] to-[#86868b] dark:from-[#f5f5f7] dark:to-[#86868b]">
                made effortless
              </span>
            </h1>
            <p className="text-lg md:text-2xl text-[#86868b] max-w-2xl mx-auto leading-relaxed mb-12">
              Transform your template into a viral movement. One frame, 
              infinite personalized updates, zero friction.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <a href="/create" onClick={handleCreateNew}>
                <Button className="bg-[#1d1d1f] dark:bg-[#f5f5f7] text-white dark:text-black rounded-full px-10 py-7 text-lg font-medium hover:scale-[1.02] active:scale-95 transition-all">
                    Launch your campaign
                </Button>
              </a>
              <Link to="/explore" className="flex items-center justify-center gap-2 group text-lg font-medium hover:opacity-70 transition-opacity">
                See the gallery <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. BENTO GRID - Fixed Internal Route Links */}
      <SectionWrapper className="max-w-[1200px] mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-full">
          {/* Main Card */}
          <a href="/create" onClick={handleCreateNew} className="md:col-span-8 group relative overflow-hidden rounded-[2rem] bg-white dark:bg-[#121212] p-10 border border-black/[0.03] dark:border-white/[0.03] shadow-sm transition-all hover:shadow-xl">
             <div className="relative z-10">
               <Zap className="text-blue-500 mb-6" />
               <h3 className="text-3xl font-bold mb-4">Instant Studio</h3>
               <p className="text-[#86868b] max-w-sm mb-6">Drop an image frame and publish in seconds. Our engine handles the rest.</p>
               <span className="text-blue-500 font-medium flex items-center gap-1">Open editor <ArrowRight size={14}/></span>
             </div>
             <div className="absolute bottom-[-20%] right-[-10%] w-2/3 aspect-square bg-gradient-to-br from-blue-500/20 to-transparent rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
          </a>

          {/* Side Card */}
          <Link to="/explore" className="md:col-span-4 group rounded-[2rem] bg-[#f5f5f7] dark:bg-[#1d1d1f] p-10 flex flex-col justify-between hover:opacity-90 transition-all">
            <Globe2 className="text-emerald-500" />
            <div>
              <h3 className="text-xl font-bold mb-2">Reach Global Audience</h3>
              <p className="text-sm text-[#86868b]">2.6M Dummies edited across 40+ countries this month.</p>
            </div>
          </Link>

          {/* Analytics Card */}
          <div className="md:col-span-4 rounded-[2rem] border border-black/[0.05] dark:border-white/[0.05] p-10 bg-white dark:bg-transparent">
            <BarChart3 className="text-purple-500 mb-6" />
            <h3 className="text-xl font-bold mb-2">Realtime Insights</h3>
            <p className="text-sm text-[#86868b]">Track conversion rates, clicks, and renders as they happen.</p>
          </div>

          {/* Safety Card */}
          <div className="md:col-span-8 rounded-[2rem] bg-[#0071e3] text-white p-10 flex items-center justify-between overflow-hidden relative">
            <div className="relative z-10">
              <h3 className="text-3xl font-bold mb-2">Secure by Design.</h3>
              <p className="opacity-80 max-w-xs">Links are private until you publish, with revocable URLs and end-to-end privacy.</p>
            </div>
            <Shield className="w-32 h-32 opacity-10 absolute right-[-10px]" />
          </div>
        </div>
      </SectionWrapper>

      {/* MOST RECENT TEMPLATES */}
      {recentTemplates.length > 0 && (
        <SectionWrapper className="max-w-[1200px] mx-auto px-6 py-20">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Most Recent</h2>
              <p className="text-[#86868b] text-[15px] mt-2">Fresh templates from the community</p>
            </div>
            <Link to="/explore" className="hidden sm:flex items-center gap-1.5 text-[13px] font-semibold text-[#0071e3] hover:underline">
              View all <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {recentTemplates.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  to={`/dp/${t.custom_slug || t.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group bg-white dark:bg-[#1c1c1e] border border-black/[0.05] dark:border-white/[0.05] rounded-2xl overflow-hidden hover:shadow-xl hover:border-blue-500/10 transition-all duration-300 block"
                >
                  {/* Thumbnail */}
                  <div
                    className="aspect-[4/3] relative overflow-hidden"
                    style={{ backgroundColor: t.background_color }}
                  >
                    {t.background_image ? (
                      <img
                        src={t.background_image}
                        alt={t.name}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ImageIcon size={32} className="text-white/20" />
                      </div>
                    )}
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                      <span className="h-8 px-3.5 rounded-full bg-white/95 text-[11px] font-semibold text-[#1d1d1f] flex items-center gap-1.5 shadow-lg">
                        Generate DP <ArrowRight size={12} />
                      </span>
                    </div>
                  </div>
                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-[14px] font-semibold truncate mb-2 group-hover:text-blue-500 transition-colors">{t.name}</h3>
                    {t.creator_name && (
                      <p className="text-[11px] text-[#86868b] mb-1.5 truncate">Created by: {t.creator_name}</p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-[#86868b]">
                      <span className="flex items-center gap-1"><Eye size={10} /> {(t.views || 0).toLocaleString()}</span>
                      <span className="flex items-center gap-1"><Download size={10} /> {(t.downloads || 0).toLocaleString()}</span>
                      <span className="flex items-center gap-1"><Clock size={10} /> {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
          <div className="sm:hidden mt-6 text-center">
            <Link to="/explore">
              <Button variant="outline" className="rounded-full border-black/10 dark:border-white/10 h-10 px-6 text-[13px]">
                View all campaigns
              </Button>
            </Link>
          </div>
        </SectionWrapper>
      )}

      {/* 4. SHOWCASE - Generic Links */}
      <SectionWrapper className="bg-[#f5f5f7] dark:bg-[#121212] py-32 mt-20">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-6xl font-bold mb-20 tracking-tight">Built for every scale.</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 opacity-50">
             <div className="font-bold text-2xl cursor-default">TECH.CV</div>
             <div className="font-bold text-2xl cursor-default">Lumina</div>
             <div className="font-bold text-2xl cursor-default">Summit'25</div>
             <div className="font-bold text-2xl cursor-default">Nexus</div>
          </div>
          <Link to="/explore">
            <Button variant="outline" className="mt-20 rounded-full border-black/10 dark:border-white/10 h-12 px-8 hover:bg-black/5 dark:hover:bg-white/5">
                Browse all campaigns
            </Button>
          </Link>
        </div>
      </SectionWrapper>

      {/* 5. FOOTER - Full Link Restoration */}
      <footer className="pt-32 pb-12 px-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex flex-col md:flex-row justify-between gap-16 pb-20 border-b border-black/[0.05] dark:border-white/[0.05]">
            <div className="max-w-xs">
              <Link to="/" className="text-xl font-bold tracking-tighter">Dummy</Link>
              <p className="mt-4 text-[13px] text-[#86868b] leading-relaxed">
                Elevating community engagement through world-class design tools. Built in Lagos for the world.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-12">
              <FooterGroup 
                title="Product" 
                links={[
                    {name: "Create Campaign", path: "/create"},
                    {name: "Explore", path: "/explore"},
                    {name: "Pricing", path: "/pricing"},
                    {name: "Templates", path: "/create"}
                ]} 
              />
              <FooterGroup 
                title="Company" 
                links={[
                    {name: "About Us", path: "/about"},
                    {name: "Privacy Policy", path: "/privacy-policy"},
                    {name: "Terms", path: "/terms"}
                ]} 
              />
              <FooterGroup 
                title="Connect" 
                links={[
                    {name: "Twitter", path: "#"},
                    {name: "Instagram", path: "#"},
                    {name: "LinkedIn", path: "#"}
                ]} 
              />
            </div>
          </div>
          <div className="pt-8 text-[12px] text-[#86868b] flex flex-col md:flex-row justify-between gap-4">
            <p>© {new Date().getFullYear()} HSD Inc. All rights reserved.</p>
            <div className="flex gap-6">
              <p>Nigeria</p>
              <p>English (US)</p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
};

const FooterGroup = ({ title, links }) => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-[12px] font-semibold uppercase tracking-widest text-[#1d1d1f] dark:text-[#f5f5f7] mb-2">{title}</h4>
      {links.map(link => (
        link.path === '/create' ? (
          <a
            key={link.name}
            href="/create"
            onClick={(e) => { e.preventDefault(); localStorage.removeItem('canvas_editor_state'); navigate('/create'); }}
            className="text-[13px] text-[#86868b] hover:text-blue-500 transition-colors"
          >
            {link.name}
          </a>
        ) : (
          <Link 
            key={link.name} 
            to={link.path} 
            className="text-[13px] text-[#86868b] hover:text-blue-500 transition-colors"
          >
            {link.name}
          </Link>
        )
      ))}
    </div>
  );
};

export default Homepage;