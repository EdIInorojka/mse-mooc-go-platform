import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import { roleLabel } from '../i18n/format';
import { LanguageToggle } from './LanguageToggle';
import type { Role } from '../types/models';

interface NavItem {
  to: string;
  label: string;
  hint: string;
}

const labels = {
  ru: {
    navMap: {
      student: [
        { to: '/app/courses', label: 'Каталог', hint: 'Поиск курсов и записей' },
        { to: '/app/my-courses', label: 'Мои курсы', hint: 'Прогресс и учебная нагрузка' },
        { to: '/app/grades', label: 'Оценки', hint: 'Результаты и фидбек' },
        { to: '/app/profile', label: 'Профиль', hint: 'Аккаунт и настройки' },
      ],
      teacher: [
        { to: '/teacher/courses', label: 'Курсы', hint: 'Авторские курсы и запуск' },
        { to: '/teacher/groups', label: 'Группы', hint: 'Когорты и invite-ссылки' },
        { to: '/teacher/grades', label: 'Оценки', hint: 'Выставление и публикация' },
      ],
      teacher_assistant: [
        { to: '/teacher/courses', label: 'Курсы', hint: 'Назначенные учебные курсы' },
        { to: '/teacher/groups', label: 'Группы', hint: 'Когорты и invite-ссылки' },
        { to: '/teacher/grades', label: 'Оценки', hint: 'Выставление и публикация' },
      ],
      admin: [
        { to: '/admin', label: 'Дашборд', hint: 'Операционный обзор' },
        { to: '/admin/courses', label: 'Курсы', hint: 'Модерация каталога' },
        { to: '/admin/users', label: 'Пользователи', hint: 'Роли и управление доступом' },
      ],
    } as Record<Role, NavItem[]>,
    roleTitle: {
      student: 'Пространство студента',
      teacher: 'Пространство преподавателя',
      teacher_assistant: 'Пространство ассистента',
      admin: 'Панель администратора',
    } as Record<Role, string>,
    roleDescription: {
      student: 'Каталог курсов, мои записи, оценки и персональная траектория обучения.',
      teacher: 'Авторские курсы, учебные группы, инвайты и оценивание студентов.',
      teacher_assistant: 'Сопровождение учебных групп, инвайты и выставление оценок.',
      admin: 'Управление курсами, пользователями и операционными метриками платформы.',
    } as Record<Role, string>,
    roleEyebrow: {
      student: 'Обучение',
      teacher: 'Преподавание',
      teacher_assistant: 'Ассистирование',
      admin: 'Операционный контур',
    } as Record<Role, string>,
    signedInAs: 'Вход выполнен',
    logOut: 'Выйти',
    menu: 'Меню',
    overview: 'обзор',
    governanceActive: 'Контроль платформы активен',
    teachingReady: 'Контур преподавания готов',
    studyReady: 'Контур обучения готов',
  },
  en: {
    navMap: {
      student: [
        { to: '/app/courses', label: 'Catalog', hint: 'Find MOOCs and join tracks' },
        { to: '/app/my-courses', label: 'My Courses', hint: 'Progress and workload' },
        { to: '/app/grades', label: 'Grades', hint: 'Results and feedback' },
        { to: '/app/profile', label: 'Profile', hint: 'Account and preferences' },
      ],
      teacher: [
        { to: '/teacher/courses', label: 'Courses', hint: 'Create and launch authored courses' },
        { to: '/teacher/groups', label: 'Groups', hint: 'Cohorts and invite links' },
        { to: '/teacher/grades', label: 'Grades', hint: 'Assessment and publishing' },
      ],
      teacher_assistant: [
        { to: '/teacher/courses', label: 'Courses', hint: 'Assigned teaching courses' },
        { to: '/teacher/groups', label: 'Groups', hint: 'Cohorts and invite links' },
        { to: '/teacher/grades', label: 'Grades', hint: 'Assessment and publishing' },
      ],
      admin: [
        { to: '/admin', label: 'Dashboard', hint: 'Operational overview' },
        { to: '/admin/courses', label: 'Courses', hint: 'Moderate learning portfolio' },
        { to: '/admin/users', label: 'Users', hint: 'Roles and access control' },
      ],
    } as Record<Role, NavItem[]>,
    roleTitle: {
      student: 'Student workspace',
      teacher: 'Teacher workspace',
      teacher_assistant: 'Assistant workspace',
      admin: 'Admin control room',
    } as Record<Role, string>,
    roleDescription: {
      student: 'Course catalog, enrollments, grades and personalized study path.',
      teacher: 'Authored courses, student groups, invites, and grading operations.',
      teacher_assistant: 'Group support, invite links, and grading assistance.',
      admin: 'Course and user operations with platform-level monitoring.',
    } as Record<Role, string>,
    roleEyebrow: {
      student: 'Learning space',
      teacher: 'Teaching space',
      teacher_assistant: 'Assistant space',
      admin: 'Operations panel',
    } as Record<Role, string>,
    signedInAs: 'Signed in as',
    logOut: 'Log out',
    menu: 'Menu',
    overview: 'overview',
    governanceActive: 'Governance active',
    teachingReady: 'Teaching flow ready',
    studyReady: 'Study flow ready',
  },
} as const;

export function PortalLayout({ role }: { role: Role }) {
  const { logout, user } = useAuth();
  const { language } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const text = labels[language];

  const navItems = useMemo(() => text.navMap[role], [role, text.navMap]);

  return (
    <div className="shell">
      <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
        <div className="brand-block">
          <span className="brand-badge">MSE-MOOC</span>
          <h1>{text.roleTitle[role]}</h1>
          <p>{text.roleDescription[role]}</p>
        </div>

        <nav className="nav-list" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/admin'}
              className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <span>{item.label}</span>
              <small>{item.hint}</small>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-card">
          <p className="sidebar-card__eyebrow">{text.signedInAs}</p>
          <strong>{user?.fullName}</strong>
          <span>{user?.email}</span>
          <span className="pill pill--role">{user ? roleLabel(user.role, language) : ''}</span>
          <button type="button" className="ghost-button" onClick={logout}>
            {text.logOut}
          </button>
        </div>
      </aside>

      <div className="content-area">
        <header className="topbar">
          <button
            type="button"
            className="menu-button"
            onClick={() => setMobileOpen((value) => !value)}
          >
            {text.menu}
          </button>
          <div>
            <p className="eyebrow">{text.roleEyebrow[role]}</p>
            <h2>{location.pathname.replace('/', ' ').trim() || text.overview}</h2>
          </div>
          <div className="topbar-status">
            <LanguageToggle />
            <span className="status-dot" />
            <span>
              {role === 'admin'
                ? text.governanceActive
                : role === 'teacher' || role === 'teacher_assistant'
                  ? text.teachingReady
                  : text.studyReady}
            </span>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
