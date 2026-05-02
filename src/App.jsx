import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import ProtectedRoute from '@/routes/ProtectedRoute';
import RoleRoute from '@/routes/RoleRoute';

// ── standalone pages (own full-page layout) ────────────────────────────────
const LoginPage          = lazy(() => import('@/pages/LoginPage'));
const SharedBookPage     = lazy(() => import('@/pages/SharedBookPage'));
const StudentDashboard   = lazy(() => import('@/pages/StudentDashboard'));
const TeacherDashboard   = lazy(() => import('@/pages/teacher/TeacherDashboard'));
const BookEditor         = lazy(() => import('@/pages/teacher/BookEditor'));
const SectionEditor      = lazy(() => import('@/pages/teacher/SectionEditor'));
const AdminDashboard     = lazy(() => import('@/pages/AdminDashboard'));
const FeedbackReviewPage    = lazy(() => import('@/pages/FeedbackReviewPage'));
const SuperadminDashboard   = lazy(() => import('@/pages/SuperadminDashboard'));
const NotFoundPage       = lazy(() => import('@/pages/NotFoundPage'));

// ── main-layout pages (rendered inside MainLayout with navbar) ─────────────
const LearnPage   = lazy(() => import('@/pages/LearnPage'));
const MyQuizPage  = lazy(() => import('@/pages/MyQuizPage'));
const UploadPage  = lazy(() => import('@/pages/UploadPage'));
const InfoPage    = lazy(() => import('@/pages/InfoPage'));
const FeedbackPage = lazy(() => import('@/pages/FeedbackPage'));
const LeaderboardPage    = lazy(() => import('@/pages/LeaderboardPage'));
const DesignSystemPage   = lazy(() => import('@/pages/DesignSystemPage'));

const MAINTENANCE_MODE = import.meta.env.VITE_MAINTENANCE_MODE === 'true';

function MaintenancePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)', color: '#fff', fontFamily: 'sans-serif', textAlign: 'center', padding: '2rem' }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔧</div>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.75rem', color: '#86efac' }}>Đang bảo trì</h1>
      <p style={{ fontSize: '1.25rem', color: '#bbf7d0', marginBottom: '0.5rem' }}>We'll be back soon!</p>
      <p style={{ fontSize: '1.5rem', fontWeight: '600', color: '#fff', background: 'rgba(134,239,172,0.15)', border: '1px solid rgba(134,239,172,0.3)', borderRadius: '0.75rem', padding: '0.6rem 1.5rem', marginTop: '0.5rem' }}>
        🕑 Back at <span style={{ color: '#4ade80' }}>2:00 PM</span> Vietnam Time (ICT)
      </p>
      <p style={{ marginTop: '1.5rem', fontSize: '0.9rem', color: '#86efac', opacity: 0.7 }}>
        Xin lỗi vì sự bất tiện này. Vui lòng quay lại lúc 14:00 ICT.
      </p>
    </div>
  );
}

const pageFallback = (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  </div>
);

export default function App() {
  if (MAINTENANCE_MODE) return <MaintenancePage />;

  return (
    <Suspense fallback={pageFallback}>
      <Routes>
        {/* ── Standalone full-page layouts ── */}
        <Route path="/login"          element={<LoginPage />} />
        <Route path="/thisisadmin"    element={<LoginPage />} />
        <Route path="/shared/:token"  element={<SharedBookPage />} />

        <Route element={<RoleRoute allowed={['teacher', 'admin']} />}>
          <Route path="/teacher"                                       element={<TeacherDashboard />} />
          <Route path="/teacher/books/:bookId"                         element={<BookEditor />} />
          <Route path="/teacher/books/:bookId/sections/:sectionId"     element={<SectionEditor />} />
        </Route>

        <Route element={<RoleRoute allowed={['admin']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>

        <Route element={<RoleRoute allowed={['superadmin']} />}>
          <Route path="/feedback-review"  element={<FeedbackReviewPage />} />
          <Route path="/superadmin"       element={<SuperadminDashboard />} />
        </Route>

        {/* ── Main layout (navbar + footer) ── */}
        <Route element={<MainLayout />}>
          <Route path="/"            element={<LearnPage />} />
          <Route path="/quiz"        element={<MyQuizPage />} />
          <Route path="/upload-word" element={<UploadPage />} />
          <Route path="/info"        element={<InfoPage />} />
          <Route path="/feedback"    element={<FeedbackPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/design"      element={<DesignSystemPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<StudentDashboard />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
