import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Users, Share2, UploadCloud, Star, Quote, Moon, Sun } from "lucide-react";

// --- ANIMATION COMPONENTS ---

const FadeIn = ({ children, delay = 0, className = "" }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98], delay }}
    className={className}
  >
    {children}
  </motion.div>
);

// --- DATA ---

const campaignHooks = [
  { verb: "Hype Your", noun: "Next Event", color: "from-blue-600 to-cyan-500" },
  { verb: "Grow Your", noun: "Community", color: "from-emerald-500 to-green-600" },
  { verb: "Launch Your", noun: "New Brand", color: "from-purple-600 to-pink-500" },
  { verb: "Spread Your", noun: "Movement", color: "from-orange-500 to-red-600" },
  { verb: "Celebrate Your", noun: "Birthday", color: "from-yellow-500 to-amber-600" }
];

const campaignExamples = [
  "Tech Summit 2025", "DevFest Lagos", "Product Launch", "Community Meetup",
  "Wedding RSVP", "Birthday Bash", "Hackathon v1.0", "Charity Walk"
];

const Homepage = () => {
  const [current, setCurrent] = useState(0);
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [hookIndex, setHookIndex] = useState(0);
  const visibleCount = 3;

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  useEffect(() => {
    const interval = setInterval(() => {
      handleNext();
    }, 4000);
    return () => clearInterval(interval);
  }, [current]);

  useEffect(() => {
    const interval = setInterval(() => {
        setHookIndex((prev) => (prev + 1) % campaignHooks.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleNext = () => {
    setCurrent((prev) => (prev + 1) % campaignExamples.length);
  };

  const handlePrev = () => {
    setCurrent((prev) =>
      prev === 0 ? campaignExamples.length - 1 : prev - 1
    );
  };

  const displayCampaigns = [...campaignExamples, ...campaignExamples.slice(0, visibleCount)];
  const activeHook = campaignHooks[hookIndex];

  return (
    <main className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 relative overflow-x-hidden selection:bg-primary/20 transition-colors duration-300">
      
      {/* GLOBAL BACKGROUND ELEMENTS */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] dark:opacity-20"></div>
      <div className="fixed top-0 left-0 right-0 h-[500px] bg-primary/5 blur-[120px] rounded-full pointer-events-none -z-10 -translate-y-1/2" />

      {/* NAVBAR */}
      <header className="w-full fixed top-0 z-50 border-b border-slate-200 dark:border-white/10 bg-white/60 dark:bg-slate-950/60 backdrop-blur-xl transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2 text-2xl font-bold tracking-tighter">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground text-sm">DP</div>
            <span>Generator</span>
          </Link>
          
          <div className="flex items-center gap-4 md:gap-8">
            <nav className="hidden md:flex gap-8 font-medium text-sm text-slate-500 dark:text-slate-400">
                {["Create Campaign", "Explore", "Pricing", "About"].map((item) => (
                <Link key={item} to={`/${item.toLowerCase().replace(" ", "-")}`} className="hover:text-primary transition-colors">
                    {item}
                </Link>
                ))}
            </nav>

            <button 
                onClick={toggleTheme} 
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-600 dark:text-slate-300"
                aria-label="Toggle theme"
            >
                <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                        key={theme}
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 20, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                    </motion.div>
                </AnimatePresence>
            </button>
            
            <Link to="/create" className="md:block hidden">
                <Button size="sm" className="rounded-full px-6 shadow-lg shadow-primary/20">Create Campaign</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="max-w-6xl mx-auto px-6 pt-32 pb-24 md:pt-40 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.21, 0.47, 0.32, 0.98] }}
          className="text-center flex flex-col items-center"
        >
          <div className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300 mb-8 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
            Trusted by 5,000+ Organizers
          </div>

          <div className="min-h-[160px] md:min-h-[120px] flex items-center justify-center">
            <h1 className="text-4xl md:text-7xl font-bold tracking-tight leading-[1.15] max-w-5xl text-slate-900 dark:text-white flex flex-col md:block items-center justify-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={hookIndex}
                        initial={{ y: 20, opacity: 0, filter: "blur(4px)" }}
                        animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                        exit={{ y: -20, opacity: 0, filter: "blur(4px)" }}
                        transition={{ duration: 0.4, ease: "easeOut" }}
                        className="inline-flex flex-wrap justify-center gap-x-2 md:gap-x-4 mb-2 md:mb-0"
                    >
                        <span>{activeHook.verb}</span>
                        <span className={`text-transparent bg-clip-text bg-gradient-to-r ${activeHook.color}`}>
                            {activeHook.noun}
                        </span>
                    </motion.div>
                </AnimatePresence>
                
                <br /><span className="md:ml-3">
                    With DPs.
                </span>
            </h1>
          </div>
          
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="max-w-2xl mx-auto mt-6 text-lg text-slate-500 dark:text-slate-400 leading-relaxed px-4 md:px-0"
          >
            Upload your design frame, create a custom link, and let your audience generate personalized DPs in seconds. The ultimate tool for massive visibility.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mt-10 flex flex-col sm:flex-row justify-center gap-4 w-full sm:w-auto px-6 md:px-0"
          >
            <Link to="/create" className="w-full sm:w-auto">
              <Button size="lg" className="rounded-full w-full sm:w-auto px-8 py-4 h-auto text-base md:text-lg shadow-xl shadow-primary/20 hover:shadow-primary/40 transition-all duration-300">
                Start Your Campaign
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link to="/explore" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="rounded-full w-full sm:w-auto px-8 py-4 h-auto text-base md:text-lg backdrop-blur-sm bg-white/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 dark:border-slate-700 dark:text-white">
                See Examples
              </Button>
            </Link>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-10 flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400"
          >
             <div className="flex -space-x-3">
                {[1,2,3,4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-zinc-200 dark:bg-zinc-700" />
                ))}
             </div>
             <p>Joined by 120k+ attendees this month</p>
          </motion.div>
        </motion.div>
      </section>

      {/* FEATURES */}
      <section className="bg-slate-50/50 dark:bg-white/5 border-y border-slate-200 dark:border-white/5 py-24 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {[
            { icon: UploadCloud, title: "1. Upload Design", desc: "Upload your event flyer or brand frame. Our tool automatically sets up the image area for your users.", color: "text-amber-500" },
            { icon: Share2, title: "2. Share Link", desc: "Get a unique link (e.g., dpgenerator.com/my-launch) and share it with your community across socials.", color: "text-blue-500" },
            { icon: Users, title: "3. Viral Growth", desc: "Users upload their photo, personalize it, and share the result instantly. Watch the momentum build.", color: "text-emerald-500" }
          ].map((feature, i) => (
            <FadeIn key={i} delay={i * 0.1}>
                <div className="group p-8 bg-white dark:bg-slate-900 backdrop-blur-sm rounded-3xl border border-slate-200 dark:border-slate-800 hover:border-primary/20 dark:hover:border-primary/40 hover:shadow-lg transition-all duration-300 h-full">
                <div className={`w-14 h-14 mx-auto rounded-2xl bg-slate-50 dark:bg-slate-800 shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 ${feature.color}`}>
                    <feature.icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold mb-3 dark:text-white">{feature.title}</h3>
                <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                    {feature.desc}
                </p>
                </div>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* CAROUSEL */}
      <section className="py-24 relative overflow-hidden bg-slate-900 dark:bg-black text-white transition-colors duration-300">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 blur-[100px] rounded-full pointer-events-none mix-blend-screen" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 blur-[100px] rounded-full pointer-events-none mix-blend-screen" />

        <div className="max-w-6xl mx-auto px-6 text-center relative z-10">
          <FadeIn>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Trending Campaigns
            </h2>
            <p className="text-slate-400 mb-12 max-w-2xl mx-auto">
                See how other leaders are using DP Generator to hype their movements.
            </p>
          </FadeIn>

          <FadeIn delay={0.2} className="relative overflow-hidden p-4 -mx-4">
            <motion.div
              className="flex gap-6 md:gap-8"
              animate={{ x: `-${(current * 100) / visibleCount}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {displayCampaigns.map((name, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 w-[85vw] md:w-[calc(33.333%-1.5rem)] bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl hover:bg-white/10 transition-all duration-300 aspect-square flex flex-col items-center justify-center cursor-pointer group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-50" />
                  
                  <div className="w-24 h-24 rounded-full bg-white/10 border border-white/20 group-hover:bg-primary/20 group-hover:border-primary/50 transition-colors flex items-center justify-center mb-4 relative z-10">
                     <span className="text-3xl font-bold text-white/70 group-hover:text-white transition-colors">{name.charAt(0)}</span>
                  </div>
                  <span className="font-semibold text-lg z-10 relative">{name}</span>
                  <p className="text-xs text-slate-400 mt-1 z-10 relative">500+ DPs Generated</p>
                </div>
              ))}
            </motion.div>

            <div className="flex justify-center gap-4 mt-10">
                <button onClick={handlePrev} className="w-12 h-12 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-white flex items-center justify-center transition-colors backdrop-blur-sm">
                    <ArrowRight className="w-5 h-5 rotate-180" />
                </button>
                <button onClick={handleNext} className="w-12 h-12 rounded-full bg-white text-slate-900 hover:bg-white/90 flex items-center justify-center transition-colors shadow-lg shadow-white/10">
                    <ArrowRight className="w-5 h-5" />
                </button>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="bg-slate-50/50 dark:bg-white/5 py-24 border-y border-slate-200 dark:border-white/5 transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-6">
          <FadeIn className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4 text-slate-900 dark:text-white">Success Stories</h2>
            <p className="text-slate-500 dark:text-slate-400">See why communities love using our platform.</p>
          </FadeIn>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Sarah J.", role: "Event Host", quote: "I uploaded my design, shared the link on WhatsApp, and woke up to 200 people using my DP design. Insane reach!" },
              { name: "David K.", role: "Community Lead", quote: "The best part is I don't have to edit pictures manually for my members anymore. They do it themselves instantly." },
              { name: "TechNexus Team", role: "Brand Launch", quote: "We used DP Generator for our new product reveal. It created a massive buzz on Twitter before the launch even started." }
            ].map((testimonial, i) => (
              <FadeIn key={i} delay={i * 0.1}>
                <div className="p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative transition-colors duration-300 h-full">
                    <Quote className="absolute top-6 left-6 w-8 h-8 text-primary/10" />
                    <div className="flex gap-1 mb-4 text-amber-500 justify-end">
                        {[1,2,3,4,5].map(star => <Star key={star} className="w-4 h-4 fill-current" />)}
                    </div>
                    <p className="text-slate-700 dark:text-slate-300 mb-6 relative z-10 leading-relaxed">
                    “{testimonial.quote}”
                    </p>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800" />
                        <div>
                            <span className="block font-semibold text-sm dark:text-white">{testimonial.name}</span>
                            <span className="block text-xs text-slate-500 dark:text-slate-400">{testimonial.role}</span>
                        </div>
                    </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION - Updated Button Scaling */}
      <section className="py-24 px-6 bg-white dark:bg-slate-950 transition-colors duration-300">
        <FadeIn className="max-w-5xl mx-auto bg-primary rounded-3xl p-8 md:p-16 text-center text-primary-foreground relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
          
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to go viral?
            </h2>
            <p className="mb-10 text-lg text-primary-foreground/80">
                Create your first campaign in under 2 minutes. No design skills needed.
            </p>
            
            <div className="flex justify-center">
            
            <Link to="/create" className="md:block hidden">
                 <Button 
                    variant="secondary" 
                    className="rounded-full w-full sm:w-auto px-8 py-4 md:px-10 md:py-4 h-auto text-base md:text-lg font-bold shadow-xl"
                 >
                    Create Campaign Now
                 </Button>
                 </Link>
            </div>
          </div>
        </FadeIn>
      </section>

      {/* FOOTER */}
      <footer className="bg-slate-950 dark:bg-black text-slate-300 py-16 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="text-2xl font-bold text-white mb-4 block tracking-tight">DP Generator</Link>
            <p className="leading-relaxed text-sm text-slate-400">
              The easiest way to create viral DP campaigns for events, communities, and brands.
            </p>
          </div>

          {[
            { header: "Use Cases", links: ["Tech Conferences", "Brand Launches", "Community Drives", "Parties", "and much more..."] },
            { header: "Company", links: ["About Us", "Blog", "Success Stories"] },
            { header: "Support", links: ["Help Center", "Privacy Policy", "Terms"] },
          ].map((col, i) => (
              <div key={i}>
                <h4 className="font-bold text-white mb-4">{col.header}</h4>
                <ul className="space-y-3 text-sm">
                    {col.links.map(link => (
                        <li key={link}>
                            <Link to={`/${link.toLowerCase().replace(' ', '-')}`} className="hover:text-white transition-colors">
                                {link}
                            </Link>
                        </li>
                    ))}
                </ul>
              </div>
          ))}
        </div>

        <div className="border-t border-white/10 mx-6 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-sm gap-4 text-slate-500">
          <div>© {new Date().getFullYear()} DP Generator. All rights reserved.</div>
          <div className="flex gap-6">
             <a href="#" className="hover:text-white transition-colors">Twitter</a>
             <a href="#" className="hover:text-white transition-colors">Instagram</a>
             <a href="#" className="hover:text-white transition-colors">LinkedIn</a>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Homepage;