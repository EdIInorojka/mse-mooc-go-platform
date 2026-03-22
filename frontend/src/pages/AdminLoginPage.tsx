import { AxiosError } from 'axios';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { Role } from '../types/models';

function resolveHome(role: Role) {
  if (role === 'admin') {
    return '/admin';
  }

  if (role === 'teacher' || role === 'teacher_assistant') {
    return '/teacher/courses';
  }

  return '/app/courses';
}

function resolveErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const apiError = (error.response?.data as { error?: string } | undefined)?.error;
    if (apiError) {
      return apiError;
    }
  }
  return fallback;
}

export function AdminLoginPage() {
  const { isAuthenticated, login, role } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (isAuthenticated && role) {
    return <Navigate to={resolveHome(role)} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login({ email, password, role: 'admin' });
      navigate('/admin', { replace: true });
    } catch (nextError: unknown) {
      setError(resolveErrorMessage(nextError, 'Admin login failed. Check credentials.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-panel login-panel--hero">
        <span className="brand-badge">MSE-MOOC</span>
        <h1>Admin service gateway.</h1>
        <p>
          This page is intended for platform operations only.
          If you are a student, teacher, or assistant, use the regular sign-in page.
        </p>
      </section>

      <section className="login-panel login-panel--form">
        <div className="page-intro page-intro--compact">
          <div>
            <p className="eyebrow">Restricted Access</p>
            <h2>Admin sign in</h2>
            <p className="page-intro__description">
              Используйте корпоративные учетные данные администратора платформы.
            </p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Login or email
            <input
              type="text"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter admin password"
              required
            />
          </label>

          {error ? <div className="form-error">{error}</div> : null}

          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? 'Signing in...' : 'Enter admin console'}
          </button>

          <p className="auth-form__hint">
            <Link to="/login">Back to regular sign-in</Link>
          </p>
        </form>
      </section>
    </div>
  );
}
