import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, UserCheck, UserX, UserPlus, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

function TeacherSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex-1 space-y-2">
          <div className="h-4 w-52 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
          <div className="h-3 w-32 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="h-8 w-24 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [addError, setAddError] = useState('');
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { loadTeachers(); }, []);

  async function loadTeachers() {
    setLoading(true);
    setError('');
    const { data, error } = await supabase.rpc('list_teachers');
    if (error) { setError(error.message); setLoading(false); return; }
    setTeachers(data ?? []);
    setLoading(false);
  }

  async function toggleActive(userId, currentState) {
    setTogglingId(userId);
    const { data, error } = await supabase.rpc('toggle_teacher_active', { p_user_id: userId });
    if (!error && data !== null) {
      setTeachers((prev) => prev.map((t) =>
        t.user_id === userId ? { ...t, is_active: data } : t
      ));
    }
    setTogglingId(null);
  }

  async function addTeacher(e) {
    e.preventDefault();
    if (!newUserId.trim()) return;
    setAddError('');
    setSubmittingAdd(true);
    const { error } = await supabase.rpc('add_teacher', { p_user_id: newUserId.trim() });
    setSubmittingAdd(false);
    if (error) { setAddError(error.message); return; }
    setNewUserId('');
    setAdding(false);
    loadTeachers();
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-white px-4 py-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-3xl flex-col gap-6">

        {/* Header */}
        <div className="flex items-center justify-between rounded-3xl border border-[#CAE8BD] bg-[#ECFAE5] px-5 py-4 shadow-soft dark:border-slate-700/60 dark:bg-slate-800/90">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => navigate('/')}>
              <img src="/logo.svg" alt="Logo" className="h-9 w-9 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-600 dark:bg-slate-700" />
            </button>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <span className="font-bold text-slate-800 dark:text-white">Admin Dashboard</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-slate-500 sm:block">{user?.email}</span>
            <Button variant="outline" size="sm" className="gap-2" onClick={handleSignOut}>
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>

        {/* Title + Add button */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-800 dark:text-white">
            Teachers
            <span className="ml-2 text-base font-normal text-slate-400">({teachers.length})</span>
          </h2>
          <Button size="sm" className="gap-2" onClick={() => setAdding(true)} disabled={adding}>
            <UserPlus className="h-4 w-4" /> Add teacher
          </Button>
        </div>

        {/* Add teacher form */}
        {adding && (
          <Card className="border-green-200 bg-green-50 dark:border-green-800/40 dark:bg-green-900/10">
            <CardContent className="p-5">
              <form onSubmit={addTeacher} className="flex flex-col gap-3">
                <h3 className="font-semibold text-slate-700 dark:text-slate-200">Add Teacher</h3>
                <p className="text-sm text-slate-500">
                  First create the user in <strong>Supabase → Authentication → Users</strong>, then paste their User ID here.
                </p>
                <input
                  autoFocus
                  required
                  value={newUserId}
                  onChange={(e) => setNewUserId(e.target.value)}
                  placeholder="User ID (UUID)"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                  disabled={submittingAdd}
                />
                {addError && <p className="text-sm text-rose-500">{addError}</p>}
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={submittingAdd} className="gap-2 min-w-[100px]">
                    {submittingAdd && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {submittingAdd ? 'Adding…' : 'Add'}
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={submittingAdd} onClick={() => { setAdding(false); setAddError(''); setNewUserId(''); }}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Card className="border-rose-200 bg-rose-50 dark:border-rose-800/40 dark:bg-rose-900/10">
            <CardContent className="p-4 text-sm text-rose-600">{error}</CardContent>
          </Card>
        )}

        {/* Teacher list */}
        {loading ? (
          <div className="flex flex-col gap-3">
            <TeacherSkeleton />
            <TeacherSkeleton />
          </div>
        ) : teachers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 p-12 text-center">
              <UserPlus className="h-12 w-12 text-slate-300" />
              <p className="text-slate-500">No teachers yet. Add your first teacher!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-3">
            {teachers.map((teacher) => (
              <Card key={teacher.user_id} className="group">
                <CardContent className="flex items-center gap-4 p-5">
                  {/* Status dot */}
                  <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${teacher.is_active ? 'bg-green-500' : 'bg-slate-300'}`} />

                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-white truncate">{teacher.email}</p>
                    <p className="text-xs text-slate-400 font-mono truncate">{teacher.user_id}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`hidden sm:block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      teacher.is_active
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                    }`}>
                      {teacher.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={togglingId === teacher.user_id}
                      onClick={() => toggleActive(teacher.user_id, teacher.is_active)}
                      className={`gap-2 min-w-[110px] ${teacher.is_active ? 'hover:border-rose-300 hover:text-rose-600' : 'hover:border-green-300 hover:text-green-600'}`}
                    >
                      {togglingId === teacher.user_id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : teacher.is_active ? (
                        <UserX className="h-3.5 w-3.5" />
                      ) : (
                        <UserCheck className="h-3.5 w-3.5" />
                      )}
                      {togglingId === teacher.user_id
                        ? 'Updating…'
                        : teacher.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
