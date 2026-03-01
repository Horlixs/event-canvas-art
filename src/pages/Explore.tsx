import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { getAllPublicTemplates, PublicTemplate } from "@/lib/templates";
import {
  ArrowRight, Eye, Download, Clock,
  ChevronLeft, Moon, Sun, Loader2,
  Image as ImageIcon, Search, Layers
} from "lucide-react";

const Explore = () => {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [templates, setTemplates] = useState<PublicTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const handleCreateNew = (e: React.MouseEvent) => {
    e.preventDefault();
    localStorage.removeItem('canvas_editor_state');
    navigate('/create');
  };

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    getAllPublicTemplates().then((data) => {
      setTemplates(data);
      setLoading(false);
    });
  }, []);

  const filtered = templates.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#000] text-[#1d1d1f] dark:text-[#f5f5f7] font-sans tracking-tight transition-colors duration-500">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-[#111]/80 backdrop-blur-2xl border-b border-black/[0.05] dark:border-white/[0.05]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="p-1.5 -ml-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors active:scale-95">
              <ChevronLeft size={18} className="text-[#86868b]" />
            </Link>
            <Link to="/" className="text-[17px] font-semibold tracking-tighter hover:opacity-70 transition-opacity">
              Dummy<span className="text-blue-500">.</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <a href="/create" onClick={handleCreateNew}>
              <Button className="h-9 bg-[#0071e3] hover:bg-[#0077ed] text-white rounded-full text-[12px] font-semibold px-4 shadow-lg shadow-blue-500/20 active:scale-95 transition-all">
                Create Yours
              </Button>
            </a>
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="p-2 opacity-60 hover:opacity-100 transition-opacity"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-14">
        {/* Page Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10"
        >
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-3">Explore Campaigns</h1>
          <p className="text-[15px] text-[#86868b] max-w-lg">
            Browse community templates and generate your personalized DP in seconds.
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4 }}
          className="mb-8"
        >
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#86868b]" />
            <input
              type="text"
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-[14px] outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all placeholder:text-[#86868b]/50"
            />
          </div>
        </motion.div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#86868b]" />
            <p className="text-[13px] text-[#86868b]">Loading templates...</p>
          </div>
        ) : filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-20 h-20 rounded-3xl bg-black/[0.03] dark:bg-white/[0.03] flex items-center justify-center mb-5">
              <Layers size={32} className="text-[#86868b]/40" />
            </div>
            <h2 className="text-[17px] font-bold mb-1.5">
              {search ? "No matching templates" : "No templates yet"}
            </h2>
            <p className="text-[13px] text-[#86868b] max-w-[280px] leading-relaxed">
              {search
                ? "Try a different search term."
                : "Be the first to create and publish a template!"}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
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
                    <h3 className="text-[14px] font-semibold truncate mb-2 group-hover:text-blue-500 transition-colors">
                      {t.name}
                    </h3>
                    {t.creator_name && (
                      <p className="text-[11px] text-[#86868b] mb-1.5 truncate">Created by: {t.creator_name}</p>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-[#86868b]">
                      <span className="flex items-center gap-1">
                        <Eye size={10} /> {(t.views || 0).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Download size={10} /> {(t.downloads || 0).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={10} />{" "}
                        {new Date(t.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Explore;
