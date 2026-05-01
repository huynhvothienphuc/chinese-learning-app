import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

async function fetchRole(userId) {
  const { data } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('user_id', userId)
    .single();
  if (data?.is_active) return data.role === 'admin' ? 'superadmin' : data.role;
  return null;
}

async function ensureProfile(user) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!profile) {
    await supabase.from('profiles').insert({
      user_id: user.id,
      username: user.user_metadata?.full_name ?? user.email,
      role: 'member',
      is_active: true,
    }).catch(() => {}); // ignore duplicate key — concurrent insert is fine
  }
}

export const useAuthStore = create((set) => ({
  user: null,
  role: null,
  // authReady: true once getSession/onAuthStateChange first fires (unblocks books + auth guards)
  // roleReady: true once role is resolved (unblocks dashboard)
  authReady: false,
  roleReady: false,

  async resolveAuth(session, event) {
    if (window.location.hash.includes('access_token')) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    if (!session?.user) {
      set({ user: null, role: null, authReady: true, roleReady: true });
      return;
    }

    // TOKEN_REFRESHED: just refresh the user object — never re-fetch role
    if (event === 'TOKEN_REFRESHED') {
      set({ user: session.user });
      return;
    }

    // Session is known — unblock books immediately
    set({ user: session.user, authReady: true });

    try {
      if (event === 'SIGNED_IN') {
        await ensureProfile(session.user);
      }
      const r = await fetchRole(session.user.id).catch(() => null);
      set({ role: r, roleReady: true });
    } catch {
      set({ roleReady: true }); // unblock dashboard even on failure
    }
  },

  async signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  },

  async signOut() {
    set({ user: null, role: null, authReady: true, roleReady: true });
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('sb-')) localStorage.removeItem(key);
    });
    await supabase.auth.signOut().catch(() => {});
  },
}));

/** Call once at app startup (e.g. in main.jsx). Returns cleanup fn. */
export function initAuth() {
  const { resolveAuth } = useAuthStore.getState();

  // Resolve initial session — pass null event so ensureProfile is skipped
  // (profile already exists for returning users; SIGNED_IN fires on actual sign-ins)
  supabase.auth.getSession().then(({ data: { session } }) => {
    resolveAuth(session, null);
  });

  // Listen for subsequent auth events
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION') return; // already handled by getSession above
    resolveAuth(session, event);
  });

  return () => subscription.unsubscribe();
}
