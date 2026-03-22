import { AxiosError } from 'axios';
import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { LanguageToggle } from '../components/LanguageToggle';
import { useI18n } from '../i18n/I18nContext';
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

const copy = {
  ru: {
    title: 'Платформа для студентов, преподавателей и ассистентов',
    description:
      'Студентам доступен каталог и оценки. Преподаватели и ассистенты управляют группами, инвайтами и результатами.',
    studentFlow: 'Студенческий контур',
    studentFlowDesc: 'Каталог, мои курсы, оценки и профиль.',
    teacherFlow: 'Преподавательский контур',
    teacherFlowDesc: 'Курсы, учебные группы, инвайты и оценивание.',
    assistantFlow: 'Контур ассистента',
    assistantFlowDesc: 'Поддержка групп и выставление оценок.',
    authentication: 'Аутентификация',
    signIn: 'Вход',
    createAccount: 'Создать аккаунт',
    selfRegister:
      'Саморегистрация доступна только для ролей student и teacher. Ассистенты и администраторы создаются через служебный контур.',
    loginTab: 'Войти',
    registerTab: 'Регистрация',
    student: 'Студент',
    teacher: 'Преподаватель',
    assistant: 'Ассистент',
    fullName: 'ФИО',
    email: 'Email',
    password: 'Пароль',
    emailPlaceholder: 'name@edu.hse.ru',
    passwordPlaceholder: 'Введите пароль',
    loginFailed: 'Ошибка входа. Проверьте логин и пароль.',
    registerFailed: 'Ошибка регистрации. Попробуйте другой email или повторите позже.',
    signingIn: 'Входим...',
    creatingAccount: 'Создаем аккаунт...',
    openWorkspace: 'Открыть рабочее пространство',
    createWorkspaceAccount: 'Создать рабочий аккаунт',
  },
  en: {
    title: 'Platform for students, teachers, and assistants',
    description:
      'Students use catalog and grades. Teachers and assistants manage groups, invite links, and assessment.',
    studentFlow: 'Student flow',
    studentFlowDesc: 'Catalog, my courses, grades, and profile.',
    teacherFlow: 'Teacher flow',
    teacherFlowDesc: 'Courses, study groups, invites, and grading.',
    assistantFlow: 'Assistant flow',
    assistantFlowDesc: 'Group support and grading operations.',
    authentication: 'Authentication',
    signIn: 'Sign in',
    createAccount: 'Create account',
    selfRegister:
      'Self-registration is available only for student and teacher roles. Assistants and administrators are provisioned through the service flow.',
    loginTab: 'Login',
    registerTab: 'Register',
    student: 'Student',
    teacher: 'Teacher',
    assistant: 'Assistant',
    fullName: 'Full name',
    email: 'Email',
    password: 'Password',
    emailPlaceholder: 'name@edu.hse.ru',
    passwordPlaceholder: 'Enter your password',
    loginFailed: 'Login failed. Please verify credentials.',
    registerFailed: 'Registration failed. Please try a different email or try again later.',
    signingIn: 'Signing in...',
    creatingAccount: 'Creating account...',
    openWorkspace: 'Open workspace',
    createWorkspaceAccount: 'Create workspace account',
  },
} as const;

export function LoginPage() {
  const { isAuthenticated, login, register, role } = useAuth();
  const { language } = useI18n();
  const text = copy[language];
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
      setError(resolveErrorMessage(nextError, text.loginFailed));
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
      setError(resolveErrorMessage(nextError, text.registerFailed));
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

        <div className="feature-grid">
          <article className="feature-card">
            <strong>{text.studentFlow}</strong>
            <span>{text.studentFlowDesc}</span>
          </article>
          <article className="feature-card">
            <strong>{text.teacherFlow}</strong>
            <span>{text.teacherFlowDesc}</span>
          </article>
          <article className="feature-card">
            <strong>{text.assistantFlow}</strong>
            <span>{text.assistantFlowDesc}</span>
          </article>
        </div>
      </section>

      <section className="login-panel login-panel--form">
        <div className="page-intro page-intro--compact">
          <div>
            <p className="eyebrow">{text.authentication}</p>
            <h2>{mode === 'login' ? text.signIn : text.createAccount}</h2>
            <p className="page-intro__description">{text.selfRegister}</p>
          </div>
        </div>

        <div className="auth-mode-toggle" role="tablist" aria-label="Auth mode selection">
          <button
            type="button"
            className={mode === 'login' ? 'role-toggle__item role-toggle__item--active' : 'role-toggle__item'}
            onClick={() => setMode('login')}
          >
            {text.loginTab}
          </button>
          <button
            type="button"
            className={mode === 'register' ? 'role-toggle__item role-toggle__item--active' : 'role-toggle__item'}
            onClick={() => setMode('register')}
          >
            {text.registerTab}
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
                  {text.student}
                </button>
                <button
                  type="button"
                  className={loginRole === 'teacher' ? 'role-toggle__item role-toggle__item--active' : 'role-toggle__item'}
                  onClick={() => setLoginRole('teacher')}
                >
                  {text.teacher}
                </button>
                <button
                  type="button"
                  className={loginRole === 'teacher_assistant' ? 'role-toggle__item role-toggle__item--active' : 'role-toggle__item'}
                  onClick={() => setLoginRole('teacher_assistant')}
                >
                  {text.assistant}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className={registerRole === 'student' ? 'role-toggle__item role-toggle__item--active' : 'role-toggle__item'}
                  onClick={() => setRegisterRole('student')}
                >
                  {text.student}
                </button>
                <button
                  type="button"
                  className={registerRole === 'teacher' ? 'role-toggle__item role-toggle__item--active' : 'role-toggle__item'}
                  onClick={() => setRegisterRole('teacher')}
                >
                  {text.teacher}
                </button>
              </>
            )}
          </div>

          {mode === 'register' ? (
            <label>
              {text.fullName}
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
            {text.email}
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={text.emailPlaceholder}
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
            {submitting
              ? mode === 'login'
                ? text.signingIn
                : text.creatingAccount
              : mode === 'login'
                ? text.openWorkspace
                : text.createWorkspaceAccount}
          </button>
        </form>
      </section>
    </div>
  );
}
