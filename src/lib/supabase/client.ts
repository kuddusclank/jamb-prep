import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey || !url.startsWith("http")) {
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signUp: async () => ({ data: { user: null }, error: new Error("Supabase is not configured yet.") }),
        signInWithPassword: async () => ({ data: { user: null }, error: new Error("Supabase is not configured yet.") }),
        signOut: async () => ({ error: null }),
      },
    } as any;
  }

  return createBrowserClient(url, anonKey);
}
