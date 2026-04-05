import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null); // 'teacher' | 'admin' | null
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      }
      setLoading(false); // Unblock immediately — role arrives via onAuthStateChange
    });

    // Keep in sync with Supabase auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        setLoading(false); // Unblock immediately — don't wait for fetchRole
        // Fetch role in background so it doesn't block navigation
        fetchRole(session.user.id)
          .then((r) => { setRole(r); })
          .catch(() => { setRole(null); });
      } else {
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email, password) {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      throw error;
    }
    // setLoading(false) is handled by onAuthStateChange after role is fetched
  }

  async function signOut() {
    setUser(null);
    setRole(null);
    setLoading(false);

    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
