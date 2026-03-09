import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Loader2, Moon, Sun, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const ForgotPassword: React.FC = () => {
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await resetPassword(email);
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] dark:bg-[#000] text-[#1d1d1f] dark:text-[#f5f5f7] transition-colors duration-500">
      {/* Minimal Header */}
      <header className="w-full border-b border-black/[0.05] dark:border-white/[0.05] bg-white/70 dark:bg-black/70 backdrop-blur-2xl">
        <div className="max-w-[1440px] mx-auto h-14 flex items-center justify-between px-6">
          <Link to="/" className="text-xl font-semibold tracking-tighter hover:opacity-70 transition-opacity">
            Dummy<span className="text-blue-500">.</span>
          </Link>
          <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} className="p-2 opacity-60 hover:opacity-100 transition-opacity">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ y: 30, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="w-full max-w-[420px] bg-white dark:bg-[#1c1c1e] rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 pb-0">
            <h2 className="text-[22px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
              Reset password
            </h2>
            <p className="text-[13px] text-[#86868b] mt-1">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          {success ? (
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-[13px] text-green-600 dark:text-green-400 font-medium leading-relaxed">
                If an account exists with that email, you'll receive a password reset link shortly. Check your inbox (and spam folder).
              </div>
              <Link
                to="/signin"
                className="w-full py-3 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-[14px] font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <ArrowLeft size={16} />
                Back to Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-3">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[12px] text-red-600 dark:text-red-400 font-medium">
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
                <input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] text-[14px] outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all placeholder:text-[#86868b]/50"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-[14px] font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                Send Reset Link
              </button>
            </form>
          )}

          {/* Footer */}
          <div className="px-6 pb-6 text-center">
            <p className="text-[13px] text-[#86868b]">
              Remember your password?{' '}
              <Link to="/signin" className="text-[#0071e3] hover:underline font-medium">
                Sign In
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;
