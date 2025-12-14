import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../config/supabase';
import { clearSupabaseStorage } from '../utils/clearStorage';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }: AuthProviderProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Initialize auth - skip storage operations to avoid errors
    const initializeAuth = async () => {
      try {
        // Get initial session (will be null since persistence is disabled)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        // Even if there's an error, stop loading so app can continue
        if (mounted) {
          setSession(null);
          setUser(null);
          setLoading(false);
        }
      }
    };

    // Listen for auth changes - wrapped in try-catch to prevent crashes
    let subscription: any = null;
    try {
      const {
        data: { subscription: sub },
      } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
        if (mounted) {
          setSession(session);
          setUser(session?.user ?? null);
          setLoading(false);
        }
      });
      subscription = sub;
    } catch (error) {
      console.error('Error setting up auth listener:', error);
      if (mounted) {
        setLoading(false);
      }
    }

    // Initialize auth after a small delay
    const timer = setTimeout(() => {
      initializeAuth();
    }, 100);

    return () => {
      mounted = false;
      clearTimeout(timer);
      if (subscription) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing:', error);
        }
      }
    };
  }, []);

  const signUp = async (email: string, password: string, username: string): Promise<{ error: AuthError | null }> => {
    try {
      // Sign up with Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        return { error: authError };
      }

      if (data.user) {
        // Create user record in our users table
        // Note: We need to handle password_hash - since Supabase Auth handles passwords,
        // we can either make it nullable in the DB or use a placeholder
        // For now, we'll use a placeholder since the column is NOT NULL
        const { error: dbError } = await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email,
          username: username,
          password_hash: 'supabase_auth', // Placeholder - actual auth handled by Supabase
        });

        if (dbError) {
          // If user creation fails, we should clean up the auth user
          await supabase.auth.signOut();
          // Convert database error to AuthError-like object
          return { error: { message: dbError.message, status: 400 } as AuthError };
        }
      }

      return { error: null };
    } catch (error) {
      return { error: { message: 'An unexpected error occurred', status: 500 } as AuthError };
    }
  };

  const signIn = async (email: string, password: string): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

