import { AxiosError } from 'axios';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { LanguageToggle } from '../components/LanguageToggle';
import { useI18n } from '../i18n/I18nContext';
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

const copy = {
  ru: {
    title: 'Служебный шлюз администратора',
    description:
      'Страница предназначена только для операционного доступа платформы. Для обычного входа используйте публичную страницу.',
    restrictedAccess: 'Ограниченный доступ',
    adminSignIn: 'Вход администратора',
    adminHint: 'Используйте корпоративные учетные данные администратора.',
    loginOrEmail: 'Логин или email',
    password: 'Пароль',
    passwordPlaceholder: 'Введите админ-пароль',
    adminLoginFailed: 'Ошибка админ-входа. Проверьте учетные данные.',
    signingIn: 'Входим...',
    enterAdminConsole: 'Перейти в админ-панель',
    backToRegular: 'Вернуться на обычный вход',
  },
  en: {
    title: 'Admin service gateway',
    description:
      'This page is intended for platform operations only. Use the public sign-in page for regular access.',
    restrictedAccess: 'Restricted Access',
    adminSignIn: 'Admin sign in',
    adminHint: 'Use corporate administrator credentials.',
    loginOrEmail: 'Login or email',
    password: 'Password',
    passwordPlaceholder: 'Enter admin password',
    adminLoginFailed: 'Admin login failed. Check credentials.',
    signingIn: 'Signing in...',
    enterAdminConsole: 'Enter admin console',
    backToRegular: 'Back to regular sign-in',
  },
} as const;

export function AdminLoginPage() {
  const { isAuthenticated, login, role } = useAuth();
  const { language } = useI18n();
  const text = copy[language];
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
      setError(resolveErrorMessage(nextError, text.adminLoginFailed));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <section className="login-panel login-panel--hero">
        <div className="login-hero-head">
          <span className="brand-badge">MSE-MOOC</span>
          <LanguageToggle />
        </div>
        <h1>{text.title}</h1>
        <p>{text.description}</p>
      </section>

      <section className="login-panel login-panel--form">
        <div className="page-intro page-intro--compact">
          <div>
            <p className="eyebrow">{text.restrictedAccess}</p>
            <h2>{text.adminSignIn}</h2>
            <p className="page-intro__description">{text.adminHint}</p>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            {text.loginOrEmail}
            <input
              type="text"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              required
            />
          </label>

          <label>
            {text.password}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={text.passwordPlaceholder}
              required
            />
          </label>

          {error ? <div className="form-error">{error}</div> : null}

          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? text.signingIn : text.enterAdminConsole}
          </button>

          <p className="auth-form__hint">
            <Link to="/login">{text.backToRegular}</Link>
          </p>
        </form>
      </section>
    </div>
  );
}
