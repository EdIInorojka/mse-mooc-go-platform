import { NavLink, Outlet } from 'react-router-dom';
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
        { to: '/app/courses', label: 'Каталог', hint: 'Поиск и запись на курсы' },
        { to: '/app/my-courses', label: 'Мои курсы', hint: 'Текущие записи и прогресс' },
        { to: '/app/grades', label: 'Оценки', hint: 'Результаты и обратная связь' },
        { to: '/app/profile', label: 'Профиль', hint: 'Личные данные и настройки' },
      ],
      teacher: [
        { to: '/teacher/courses', label: 'Курсы', hint: 'Авторские и внешние курсы' },
        { to: '/teacher/groups', label: 'Группы', hint: 'Учебные группы и инвайты' },
        { to: '/teacher/grades', label: 'Оценки', hint: 'Проверка и публикация' },
      ],
      teacher_assistant: [
        { to: '/teacher/courses', label: 'Курсы', hint: 'Назначенные курсы' },
        { to: '/teacher/groups', label: 'Группы', hint: 'Сопровождение учебных групп' },
        { to: '/teacher/grades', label: 'Оценки', hint: 'Ассистирование проверок' },
      ],
      admin: [
        { to: '/admin', label: 'Дашборд', hint: 'Операционный обзор' },
        { to: '/admin/courses', label: 'Курсы', hint: 'Модерация каталога' },
        { to: '/admin/users', label: 'Пользователи', hint: 'Роли и управление доступом' },
      ],
    } as Record<Role, NavItem[]>,
    menu: 'Меню',
    signedInAs: 'Аккаунт',
    logOut: 'Выйти',
    platform: 'Платформа онлайн-курсов',
    online: 'Платформа в сети',
  },
  en: {
    navMap: {
      student: [
        { to: '/app/courses', label: 'Catalog', hint: 'Search and enroll in courses' },
        { to: '/app/my-courses', label: 'My Courses', hint: 'Current enrollments and progress' },
        { to: '/app/grades', label: 'Grades', hint: 'Results and feedback' },
        { to: '/app/profile', label: 'Profile', hint: 'Personal data and preferences' },
      ],
      teacher: [
        { to: '/teacher/courses', label: 'Courses', hint: 'Authored and external courses' },
        { to: '/teacher/groups', label: 'Groups', hint: 'Study groups and invites' },
        { to: '/teacher/grades', label: 'Grades', hint: 'Assessment and publishing' },
      ],
      teacher_assistant: [
        { to: '/teacher/courses', label: 'Courses', hint: 'Assigned courses' },
        { to: '/teacher/groups', label: 'Groups', hint: 'Group operations support' },
        { to: '/teacher/grades', label: 'Grades', hint: 'Assessment assistance' },
      ],
      admin: [
        { to: '/admin', label: 'Dashboard', hint: 'Operational overview' },
        { to: '/admin/courses', label: 'Courses', hint: 'Catalog moderation' },
        { to: '/admin/users', label: 'Users', hint: 'Roles and access control' },
      ],
    } as Record<Role, NavItem[]>,
    menu: 'Menu',
    signedInAs: 'Account',
    logOut: 'Log out',
    platform: 'Online course platform',
    online: 'Platform online',
  },
} as const;

export function PortalLayout({ role }: { role: Role }) {
  const { logout, user } = useAuth();
  const { language } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const text = labels[language];

  const navItems = useMemo(() => text.navMap[role], [role, text.navMap]);

  return (
    <div className="shell">
      <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
        <div className="brand-block">
          <span className="brand-badge">MSE-MOOC</span>
          <h1>{text.platform}</h1>
          <p>{text.online}</p>
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
        <header className="topbar topbar--compact">
          <button
            type="button"
            className="menu-button"
            onClick={() => setMobileOpen((value) => !value)}
          >
            {text.menu}
          </button>
          <div className="topbar-account">
            <strong>{user?.fullName}</strong>
            <span className="pill pill--role">{user ? roleLabel(user.role, language) : ''}</span>
          </div>
          <div className="topbar-status">
            <LanguageToggle />
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
