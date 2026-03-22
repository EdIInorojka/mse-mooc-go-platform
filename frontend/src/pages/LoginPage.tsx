import { AxiosError } from 'axios';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import type { RegisterPayload, Role } from '../types/models';

function resolveHome(role: Role) {
  if (role === 'admin') {
    return '/admin';
  }

  if (role === 'teacher' || role === 'teacher_assistant') {
    return '/teacher/courses';
  }

  return '/app/courses';
}

type AuthMode = 'login' | 'register';

function resolveErrorMessage(error: unknown, fallback: string) {
  if (error instanceof AxiosError) {
    const apiError = (error.response?.data as { error?: string } | undefined)?.error;
    if (apiError) {
      return apiError;
    }
  }
  return fallback;
}

export function LoginPage() {
  const { isAuthenticated, login, register, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('student@edu.hse.ru');
  const [password, setPassword] = useState('demo-password');
  const [fullName, setFullName] = useState('Anastasia Volkova');
  const [loginRole, setLoginRole] = useState<Exclude<Role, 'admin'>>('student');
  const [registerRole, setRegisterRole] = useState<Extract<Role, 'student' | 'teacher'>>('student');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTarget = useMemo(() => {
    const fallback = resolveHome(mode === 'login' ? loginRole : registerRole);
    const state = location.state as { from?: { pathname?: string } } | null;
    return state?.from?.pathname ?? fallback;
  }, [location.state, loginRole, mode, registerRole]);

  if (isAuthenticated && role) {
    return <Navigate to={resolveHome(role)} replace />;
  }

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await login({ email, password, role: loginRole });
      navigate(redirectTarget, { replace: true });
    } catch (nextError: unknown) {
      setError(resolveErrorMessage(nextError, 'Login failed. Please verify credentials and try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload: RegisterPayload = {
      fullName,
      email,
      password,
      role: registerRole,
    };

    try {
      await register(payload);
      navigate(resolveHome(registerRole), { replace: true });
    } catch (nextError: unknown) {
      setError(resolveErrorMessage(nextError, 'Registration failed. Please try a different email or try again later.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-panel login-panel--hero">
        <span className="brand-badge">MSE-MOOC</span>
        <h1>Digital campus for students, teachers, and teaching assistants.</h1>
        <p>
          Student space focuses on discovery and grades. Teacher space adds authoring,
          cohort invites and assessment. Assistant space helps run groups and grading.
        </p>

        <div className="feature-grid">
          <article className="feature-card">
            <strong>Student flow</strong>
            <span>Каталог курсов, мои записи, оценки и профиль студента.</span>
          </article>
          <article className="feature-card">
            <strong>Teacher flow</strong>
            <span>Новые курсы, учебные группы, инвайт-ссылки и выставление оценок.</span>
          </article>
          <article className="feature-card">
            <strong>Operations flow</strong>
            <span>Административный доступ работает через отдельный служебный вход.</span>
          </article>
        </div>
      </section>

      <section className="login-panel login-panel--form">
        <div className="page-intro page-intro--compact">
          <div>
            <p className="eyebrow">Authentication</p>
            <h2>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
            <p className="page-intro__description">
              Саморегистрация доступна только для `student` и `teacher`. Админ-вход вынесен в отдельный служебный маршрут.
            </p>
          </div>
        </div>

        <div className="auth-mode-toggle" role="tablist" aria-label="Auth mode selection">
          <button
            type="button"
            className={mode === 'login' ? 'role-toggle__item role-toggle__item--active' : 'role-toggle__item'}
            onClick={() => setMode('login')}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'role-toggle__item role-toggle__item--active' : 'role-toggle__item'}
            onClick={() => setMode('register')}
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={mode === 'login' ? handleLogin : handleRegister}>
          <div className="role-toggle" role="tablist" aria-label="Role selection">
            {mode === 'login' ? (
              <>
                <button
                  type="button"
                  className={loginRole === 'student' ? 'role-toggle__item role-toggle__item--active' : 'role-toggle__item'}
                  onClick={() => setLoginRole('student')}
                >
                  Student
                </button>
                <button
                  type="button"
                  className={loginRole === 'teacher' ? 'role-toggle__item role-toggle__item--active' : 'role-toggle__item'}
                  onClick={() => setLoginRole('teacher')}
                >
                  Teacher
                </button>
                <button
                  type="button"
                  className={loginRole === 'teacher_assistant' ? 'role-toggle__item role-toggle__item--active' : 'role-toggle__item'}
                  onClick={() => setLoginRole('teacher_assistant')}
                >
                  Assistant
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={registerRole === 'student' ? 'role-toggle__item role-toggle__item--active' : 'role-toggle__item'}
                  onClick={() => setRegisterRole('student')}
                >
                  Student
                </button>
                <button
                  type="button"
                  className={registerRole === 'teacher' ? 'role-toggle__item role-toggle__item--active' : 'role-toggle__item'}
                  onClick={() => setRegisterRole('teacher')}
                >
                  Teacher
                </button>
              </>
            )}
          </div>

          {mode === 'register' ? (
            <label>
              Full name
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Anastasia Volkova"
                required
              />
            </label>
          ) : null}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@edu.hse.ru"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />
          </label>

          {error ? <div className="form-error">{error}</div> : null}

          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting
              ? mode === 'login'
                ? 'Signing in...'
                : 'Creating account...'
              : mode === 'login'
                ? 'Open workspace'
                : 'Create workspace account'}
          </button>

          <p className="auth-form__hint">
            Admin sign-in: <Link to="/staff/admin-login">service-only access</Link>.
          </p>
        </form>
      </section>
    </div>
  );
}
