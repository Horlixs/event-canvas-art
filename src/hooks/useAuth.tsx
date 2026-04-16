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

  // On mount: check for OAuth return and redirect immediately if returning from OAuth
  useEffect(() => {
    // Check if we're returning from OAuth with a stored return URL and active session
    // Do this BEFORE error checking so we can redirect immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const storedReturnTo = sessionStorage.getItem('oauth_return_to');
        if (storedReturnTo) {
          try {
            const returnTo = atob(storedReturnTo);
            sessionStorage.removeItem('oauth_return_to');
            window.history.replaceState(null, '', window.location.pathname);
            // Redirect immediately to bypass homepage
            window.location.href = returnTo;
            return; // Stop further execution
          } catch (e) {
            console.error('Failed to redirect from OAuth:', e);
            sessionStorage.removeItem('oauth_return_to');
          }
        }
      }
    });

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

    // Store return_to from query params for later use (survives OAuth redirects)
    const searchParams = new URLSearchParams(window.location.search);
    const returnTo = searchParams.get('return_to');
    if (returnTo) {
      try {
        sessionStorage.setItem('oauth_return_to', returnTo);
      } catch (e) {
        console.error('Failed to store return_to:', e);
      }
    }
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
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
    // Encode and store the return URL in session storage so it survives the OAuth redirect
    const redirectUrl = returnTo || window.location.href;
    const encodedReturn = btoa(redirectUrl); // Base64 encode to safely pass in storage
    
    try {
      sessionStorage.setItem('oauth_return_to', encodedReturn);
    } catch (e) {
      console.error('Failed to store return URL:', e);
    }
    
    console.log('🔐 OAuth Debug:');
    console.log('  Current origin:', window.location.origin);
    console.log('  Return to URL:', redirectUrl);
    console.log('  Encoded and stored for redirect after auth');
    
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { 
        redirectTo: `${window.location.origin}`,
      },
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
