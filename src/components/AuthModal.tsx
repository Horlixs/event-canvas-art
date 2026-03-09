import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'signup';
  message?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ open, onClose, defaultTab = 'login', message }) => {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const [tab, setTab] = useState<'login' | 'signup'>(defaultTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setName('');
    setError(null);
    setSuccessMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (tab === 'login') {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          setError(error.message);
        } else {
          onClose();
          resetForm();
        }
      } else {
        if (password.length < 6) {
          setError('Password must be at least 6 characters');
          setLoading(false);
          return;
        }
        const { error } = await signUpWithEmail(email, password, name);
        if (error) {
          setError(error.message);
        } else {
          setSuccessMessage('Check your email for a confirmation link!');
        }
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch {
      setError('Google sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 40, opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="bg-white dark:bg-[#1c1c1e] w-full sm:max-w-[420px] sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden border border-black/5 dark:border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-0">
              <div>
                <h2 className="text-[18px] font-bold text-[#1d1d1f] dark:text-[#f5f5f7]">
                  {tab === 'login' ? 'Welcome back' : 'Create account'}
                </h2>
                {message && (
                  <p className="text-[12px] text-[#86868b] mt-0.5">{message}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors active:scale-95"
              >
                <X size={18} className="text-[#86868b]" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex mx-5 mt-4 p-0.5 bg-black/[0.04] dark:bg-white/[0.04] rounded-lg">
              <button
                onClick={() => { setTab('login'); setError(null); setSuccessMessage(null); }}
                className={cn(
                  "flex-1 py-2 text-[12px] font-semibold rounded-md transition-all",
                  tab === 'login' ? "bg-white dark:bg-[#2c2c2e] shadow-sm text-[#1d1d1f] dark:text-[#f5f5f7]" : "text-[#86868b]"
                )}
              >
                Sign In
              </button>
              <button
                onClick={() => { setTab('signup'); setError(null); setSuccessMessage(null); }}
                className={cn(
                  "flex-1 py-2 text-[12px] font-semibold rounded-md transition-all",
                  tab === 'signup' ? "bg-white dark:bg-[#2c2c2e] shadow-sm text-[#1d1d1f] dark:text-[#f5f5f7]" : "text-[#86868b]"
                )}
              >
                Sign Up
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              {/* Error / Success */}
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[12px] text-red-600 dark:text-red-400 font-medium">
                  {error}
                </div>
              )}
              {successMessage && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-[12px] text-green-600 dark:text-green-400 font-medium">
                  {successMessage}
                </div>
              )}

              {/* Name field (signup only) */}
              {tab === 'signup' && (
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
                  <input
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] text-[14px] outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all placeholder:text-[#86868b]/50"
                  />
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

              {/* Password */}
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#86868b]" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full pl-10 pr-12 py-3 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] text-[14px] outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/30 transition-all placeholder:text-[#86868b]/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#86868b] hover:text-[#1d1d1f] dark:hover:text-[#f5f5f7] transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#0071e3] hover:bg-[#0077ed] text-white text-[14px] font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-blue-500/20"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {tab === 'login' ? 'Sign In' : 'Create Account'}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-black/[0.06] dark:bg-white/[0.06]" />
                <span className="text-[11px] text-[#86868b] font-medium">or</span>
                <div className="flex-1 h-px bg-black/[0.06] dark:bg-white/[0.06]" />
              </div>

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-3 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-[14px] font-medium text-[#1d1d1f] dark:text-[#f5f5f7] transition-all hover:bg-black/[0.02] dark:hover:bg-white/[0.05] flex items-center justify-center gap-2.5 active:scale-[0.98] disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </form>

            {/* Forgot password */}
            {tab === 'login' && (
              <div className="px-5 pb-4 text-center">
                <Link
                  to="/forgot-password"
                  onClick={onClose}
                  className="text-[12px] text-[#0071e3] hover:underline font-medium"
                >
                  Forgot your password?
                </Link>
              </div>
            )}

            {/* Safe area padding */}
            <div className="safe-bottom" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
