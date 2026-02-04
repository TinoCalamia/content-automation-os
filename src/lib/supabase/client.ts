import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a mock client during build time
    if (typeof window === 'undefined') {
      return {
        auth: {
          getSession: async () => ({ data: { session: null }, error: null }),
          getUser: async () => ({ data: { user: null }, error: null }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signInWithOtp: async () => ({ error: null }),
          signOut: async () => ({ error: null }),
        },
        from: () => ({
          select: () => ({
            eq: () => ({
              single: async () => ({ data: null, error: null }),
              order: () => ({ data: [], error: null }),
            }),
            order: () => ({ data: [], error: null }),
          }),
        }),
        rpc: async () => ({ data: null, error: null }),
      } as unknown as ReturnType<typeof createBrowserClient<Database>>;
    }
    throw new Error('Supabase URL and Anon Key are required');
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
