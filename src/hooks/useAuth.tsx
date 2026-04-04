import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: (returnTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  checkEmailProvider: (email: string) => Promise<string | null>;
  needsPasswordReset: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsPasswordReset, setNeedsPasswordReset] = useState(false);

  // Check which auth provider owns an email
  const checkEmailProvider = useCallback(async (email: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase.rpc('get_provider_for_email', { lookup_email: email });
      if (error) return null;
      return data as string | null;
    } catch {
      return null;
    }
  }, []);

  // On mount: check for OAuth errors in URL hash and sessionStorage
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const error = params.get('error');
      const errorDescription = params.get('error_description');
      const type = params.get('type');

      if (error && errorDescription && type !== 'recovery') {
        let message = 'Authentication failed. Please try again.';
        if (
          errorDescription.includes('already exists') ||
          errorDescription.includes('duplicate') ||
          errorDescription.includes('unique_violation')
        ) {
          message = 'An account with this email already exists. Please sign in using your original sign-in method.';
        }
        // Delay toast slightly to ensure Sonner is mounted
        setTimeout(() => toast.error(message), 300);
        window.history.replaceState(null, '', window.location.pathname);
      }
    }

    const storedError = sessionStorage.getItem('auth_error');
    if (storedError) {
      setTimeout(() => toast.error(storedError), 300);
      sessionStorage.removeItem('auth_error');
    }
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      // Check if we're returning from OAuth redirect
      const params = new URLSearchParams(window.location.search);
      if (session?.user && params.get('auth_redirect') === 'true') {
        const encodedReturn = params.get('return_to');
        if (encodedReturn) {
          try {
            const returnTo = atob(encodedReturn); // Base64 decode
            // Clean up URL
            window.history.replaceState(null, '', window.location.pathname);
            // Small delay to ensure UI updates, then redirect
            setTimeout(() => {
              window.location.href = returnTo;
            }, 100);
          } catch (e) {
            console.error('Failed to decode return_to parameter:', e);
          }
        }
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // Handle password recovery flow
      if (event === 'PASSWORD_RECOVERY') {
        setNeedsPasswordReset(true);
      }

      // Safety net: detect duplicate OAuth accounts that bypassed the trigger
      if (event === 'SIGNED_IN' && session?.user) {
        const currentUser = session.user;
        const provider = currentUser.app_metadata?.provider;

        if (provider === 'google' && currentUser.email) {
          try {
            const { data: otherProvider } = await supabase.rpc('check_email_exists_for_other_user', {
              check_email: currentUser.email,
              exclude_user_id: currentUser.id,
            });

            if (otherProvider) {
              // Duplicate detected — clean up and sign out
              await supabase.rpc('cleanup_duplicate_user', {
                target_user_id: currentUser.id,
                target_email: currentUser.email,
              });

              await supabase.auth.signOut();

              const providerLabel = otherProvider === 'email' ? 'email and password' : otherProvider;
              sessionStorage.setItem(
                'auth_error',
                `An account with this email already exists using ${providerLabel}. Please sign in with ${providerLabel} instead.`
              );

              window.location.href = window.location.origin + '/signin';
              return;
            }
          } catch {
            // RPC not available yet (migration not applied) — skip safety net
          }
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // Enhance error: check if this email is registered with a different provider
      if (error.message === 'Invalid login credentials') {
        const provider = await checkEmailProvider(email);
        if (provider === 'google') {
          return {
            error: new Error(
              'This email is registered with Google. Please sign in with Google instead.'
            ) as Error,
          };
        }
      }
      return { error: error as Error | null };
    }
    return { error: null };
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    // Pre-check: see if an account already exists with a different provider
    const existingProvider = await checkEmailProvider(email);
    if (existingProvider === 'google') {
      return {
        error: new Error(
          'This email is already registered with Google. Please sign in with Google instead.'
        ) as Error,
      };
    }
    if (existingProvider === 'email') {
      return {
        error: new Error(
          'An account with this email already exists. Please sign in instead.'
        ) as Error,
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });

    if (error) return { error: error as Error | null };

    // Detect fake success (Supabase returns empty identities for existing emails)
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return {
        error: new Error(
          'An account with this email already exists. Please sign in instead.'
        ) as Error,
      };
    }

    return { error: null };
  };

  const signInWithGoogle = async (returnTo?: string) => {
    // Encode the return URL as a query parameter so it survives cross-domain redirects
    const redirectUrl = returnTo || window.location.href;
    const encodedReturn = btoa(redirectUrl); // Base64 encode to safely pass in URL
    
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}?auth_redirect=true&return_to=${encodedReturn}` },
    });
  };

  const signOut = async () => {
    setNeedsPasswordReset(false);
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    // Check if the account uses Google (no password to reset)
    const provider = await checkEmailProvider(email);
    if (provider === 'google') {
      return {
        error: new Error(
          'This account uses Google sign-in. Password reset is not available. Please sign in with Google.'
        ) as Error,
      };
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) return { error: error as Error | null };
    return { error: null };
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (!error) {
      setNeedsPasswordReset(false);
    }
    return { error: error as Error | null };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        resetPassword,
        updatePassword,
        checkEmailProvider,
        needsPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
