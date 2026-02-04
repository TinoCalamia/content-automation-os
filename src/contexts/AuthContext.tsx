'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  signInWithEmail: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshWorkspaces: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  
  const supabase = createClient();

  const refreshWorkspaces = useCallback(async () => {
    if (!user) {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      return;
    }

    try {
      // Fetch workspaces where user is a member
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          role,
          workspace:workspaces (
            id,
            name,
            owner_id
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      const rawData = data as Array<{
        role: string;
        workspace: { id: string; name: string; owner_id: string } | null;
      }> | null;

      const fetchedWorkspaces: Workspace[] = (rawData || [])
        .filter((item): item is typeof item & { workspace: NonNullable<typeof item.workspace> } => 
          item.workspace !== null
        )
        .map(item => ({
          id: item.workspace.id,
          name: item.workspace.name,
          owner_id: item.workspace.owner_id,
          role: item.role
        }));

      setWorkspaces(fetchedWorkspaces);

      // Set current workspace if not already set
      if (!currentWorkspace && fetchedWorkspaces.length > 0) {
        // Try to get from localStorage first
        const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
        const savedWorkspace = fetchedWorkspaces.find(w => w.id === savedWorkspaceId);
        setCurrentWorkspace(savedWorkspace || fetchedWorkspaces[0]);
      }
    } catch (error) {
      logger.error('Failed to fetch workspaces', { error });
    }
  }, [user, currentWorkspace, supabase]);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  // Fetch workspaces when user changes
  useEffect(() => {
    if (user) {
      refreshWorkspaces();
    }
  }, [user, refreshWorkspaces]);

  // Save current workspace to localStorage
  useEffect(() => {
    if (currentWorkspace) {
      localStorage.setItem('currentWorkspaceId', currentWorkspace.id);
    }
  }, [currentWorkspace]);

  const signInWithEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      logger.error('Sign in failed', { error });
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setWorkspaces([]);
      setCurrentWorkspace(null);
      localStorage.removeItem('currentWorkspaceId');
    } catch (error) {
      logger.error('Sign out failed', { error });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        workspaces,
        currentWorkspace,
        setCurrentWorkspace,
        signInWithEmail,
        signOut,
        refreshWorkspaces,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
