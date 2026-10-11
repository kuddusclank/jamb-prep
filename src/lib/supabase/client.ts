import { createBrowserClient } from '@supabase/ssr';

let cachedBrowserClient: ReturnType<typeof createBrowserClient> | null = null;
let cachedConfigKey = '';

function lockDownBrowserDatabaseAccess<T extends object>(client: T): T {
  const denyTableAccess = () => {
    throw new Error(
      'BROWSER_TABLE_ACCESS_LOCKED: Direct browser database access is disabled. Use the native API with Bearer authentication.'
    );
  };

  try {
    Object.defineProperty(client, 'from', {
      value: denyTableAccess,
      writable: false,
      configurable: true,
    });
    Object.defineProperty(client, 'rpc', {
      value: denyTableAccess,
      writable: false,
      configurable: true,
    });
  } catch {
    // Fallback if client object is sealed in a custom test mock
  }

  return client;
}

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey || !url.startsWith('http')) {
    return lockDownBrowserDatabaseAccess({
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        refreshSession: async () => ({ data: { session: null, user: null }, error: null }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
        signUp: async () => ({
          data: { user: null, session: null },
          error: new Error('Supabase is not configured yet.'),
        }),
        signInWithPassword: async () => ({
          data: { user: null, session: null },
          error: new Error('Supabase is not configured yet.'),
        }),
        signOut: async () => ({ error: null }),
      },
    }) as any;
  }

  const configKey = `${url}::${anonKey}`;
  if (typeof window !== 'undefined' && cachedBrowserClient && cachedConfigKey === configKey) {
    return cachedBrowserClient;
  }

  const client = lockDownBrowserDatabaseAccess(createBrowserClient(url, anonKey));
  if (typeof window !== 'undefined') {
    cachedBrowserClient = client;
    cachedConfigKey = configKey;
  }

  return client;
}
