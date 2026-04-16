import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'teacher' | 'admin' | 'superadmin' | null
  const [loading, setLoading] = useState(true);

  async function fetchRole(userId) {
    const { data } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('user_id', userId)
      .single();

    if (data?.is_active) return data.role;
    return null;
  }

  useEffect(() => {
    // Restore session and fetch role before unblocking — prevents stale role on startup
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        const r = await fetchRole(session.user.id).catch(() => null);
        setRole(r);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // INITIAL_SESSION is already handled by getSession above
      if (event === 'INITIAL_SESSION') return;
      if (session?.user) {
        // Clean up OAuth hash from URL
        if (window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', window.location.pathname);
        }
        setUser(session.user);
        setLoading(false);
        // Ensure profile exists — fallback if trigger missed it
        if (event === 'SIGNED_IN') {
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id')
            .eq('user_id', session.user.id)
            .maybeSingle();
          if (!profile) {
            await supabase.from('profiles').insert({
              user_id: session.user.id,
              username: session.user.user_metadata?.full_name ?? session.user.email,
              role: 'member',
              is_active: true,
            }).select().maybeSingle();
          }
        }
        fetchRole(session.user.id).then((r) => setRole(r)).catch(() => setRole(null));
      } else {
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(usernameOrEmail, password) {
    // Teachers use real email; members use username → converted to username@member.local
    const email = usernameOrEmail.includes('@')
      ? usernameOrEmail
      : `${usernameOrEmail.toLowerCase()}@member.local`;
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      throw error;
    }
    const r = await fetchRole(data.user.id).catch(() => null);
    setRole(r);
    // setLoading(false) is handled by onAuthStateChange
    return r;
  }

  async function signUp(username, password) {
    const email = `${username.toLowerCase()}@member.local`;
    setLoading(true);
    // Check username is not already taken
    const { data: existing } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('username', username.toLowerCase())
      .maybeSingle();
    if (existing) {
      setLoading(false);
      throw new Error('Username already taken.');
    }
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setLoading(false); throw error; }
    if (data.user) {
      await supabase.from('profiles').insert({
        user_id: data.user.id,
        username: username.toLowerCase(),
        role: 'member',
        is_active: true,
      });
    }
    setLoading(false);
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  }

  async function signOut() {
    setUser(null);
    setRole(null);
    setLoading(false);

    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signUp, signOut, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
