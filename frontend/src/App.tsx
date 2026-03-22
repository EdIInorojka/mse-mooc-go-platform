import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PortalLayout } from './components/PortalLayout';
import { LoginPage } from './pages/LoginPage';
import { CourseCatalogPage } from './pages/user/CourseCatalogPage';
import { MyCoursesPage } from './pages/user/MyCoursesPage';
import { ProfilePage } from './pages/user/ProfilePage';
import { MyGradesPage } from './pages/user/MyGradesPage';
import { TeacherCoursesPage } from './pages/teacher/TeacherCoursesPage';
import { TeacherGroupsPage } from './pages/teacher/TeacherGroupsPage';
import { TeacherGradesPage } from './pages/teacher/TeacherGradesPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminCoursesPage } from './pages/admin/AdminCoursesPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import type { Role } from './types/models';

function resolveHome(role: Role) {
  if (role === 'admin') {
    return '/admin';
  }

  if (role === 'teacher') {
    return '/teacher/courses';
  }

  return '/app/courses';
}

function DefaultRedirect() {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated || !role) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={resolveHome(role)} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute allowedRoles={['student']} />}>
        <Route path="/app" element={<PortalLayout role="student" />}>
          <Route index element={<Navigate to="courses" replace />} />
          <Route path="courses" element={<CourseCatalogPage />} />
          <Route path="my-courses" element={<MyCoursesPage />} />
          <Route path="grades" element={<MyGradesPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
        <Route path="/teacher" element={<PortalLayout role="teacher" />}>
          <Route index element={<Navigate to="courses" replace />} />
          <Route path="courses" element={<TeacherCoursesPage />} />
          <Route path="groups" element={<TeacherGroupsPage />} />
          <Route path="grades" element={<TeacherGradesPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin" element={<PortalLayout role="admin" />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="courses" element={<AdminCoursesPage />} />
          <Route path="users" element={<AdminUsersPage />} />
        </Route>
      </Route>

      <Route path="*" element={<DefaultRedirect />} />
    </Routes>
  );
}

export default App;

