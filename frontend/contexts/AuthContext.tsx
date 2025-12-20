import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session, User, AuthError } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../config/supabase';
import { clearSupabaseStorage } from '../utils/clearStorage';
import { createUserProfile } from '../services/userProfileService';

// Complete OAuth flow in Expo
WebBrowser.maybeCompleteAuthSession();

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, username: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signInWithOAuth: (provider: 'google' | 'apple' | 'github') => Promise<void>;
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

    // Initialize auth - check for persisted session
    const initializeAuth = async () => {
      try {
        // Get initial session (will be restored from storage if "remember me" was enabled)
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
        options: {
          data: {
            username: username,
          },
        },
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

        // Create user profile
        try {
          await createUserProfile(data.user.id, username, email || '');
        } catch (profileError) {
          console.error('Error creating user profile:', profileError);
          // Continue even if profile creation fails
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

  const signInWithOAuth = async (provider: 'google' | 'apple' | 'github') => {
    try {
      // Get the OAuth URL from Supabase
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: 'exp://localhost:8081/--/auth/callback',
          skipBrowserRedirect: false,
        },
      });

      if (error) {
        console.error('OAuth error:', error);
        return;
      }

      if (data?.url) {
        // Open the OAuth URL in the browser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          'exp://localhost:8081/--/auth/callback'
        );

        if (result.type === 'success') {
          // Extract the URL from the result
          const url = result.url;
          // Parse the URL to get the code/token
          const urlObj = new URL(url);
          const code = urlObj.searchParams.get('code');
          
          if (code) {
            // Exchange the code for a session
            await supabase.auth.exchangeCodeForSession(code);
          }
        }
      }
    } catch (error) {
      console.error('OAuth sign in error:', error);
    }
  };

  // Handle OAuth callback and create user record if needed
  useEffect(() => {
    const handleOAuthCallback = async (session: Session | null) => {
      if (session?.user) {
        const username = session.user.email?.split('@')[0] || 'user';
        // Check if user record exists in our users table
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', session.user.id)
          .single();

        if (!existingUser) {
          // Create user record for OAuth users
          // Extract username from email or use a default
          const email = session.user.email || '';
          const username = email.split('@')[0] || `user_${session.user.id.slice(0, 8)}`;
          
          await supabase.from('users').insert({
            id: session.user.id,
            email: email,
            username: username,
            password_hash: 'oauth', // OAuth users don't have passwords
          });

          // Create user profile
          try {
            await createUserProfile(session.user.id, username, email);
          } catch (profileError) {
            console.error('Error creating user profile:', profileError);
          }
        }
      }
    };

    if (session) {
      handleOAuthCallback(session);
    }
  }, [session]);

  const signOut = async () => {
    // Clear remember me preference on sign out
    await AsyncStorage.removeItem('@gym_app_remember_me');
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signUp, signIn, signInWithOAuth, signOut }}>
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

