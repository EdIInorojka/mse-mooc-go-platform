import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { Role } from '../types/models';

interface ProtectedRouteProps {
  allowedRoles: Role[];
}

function resolveHome(role: Role) {
  if (role === 'admin') {
    return '/admin';
  }

  if (role === 'teacher') {
    return '/teacher/courses';
  }

  return '/app/courses';
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to={role ? resolveHome(role) : '/login'} replace />;
  }

  return <Outlet />;
}

