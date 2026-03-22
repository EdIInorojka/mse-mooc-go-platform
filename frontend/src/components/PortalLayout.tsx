import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import type { Role } from '../types/models';

interface NavItem {
  to: string;
  label: string;
  hint: string;
}

const navMap: Record<Role, NavItem[]> = {
  student: [
    { to: '/app/courses', label: 'Catalog', hint: 'Find MOOCs and join tracks' },
    { to: '/app/my-courses', label: 'My Courses', hint: 'Progress, starts, active load' },
    { to: '/app/grades', label: 'My Grades', hint: 'Feedback and assessment results' },
    { to: '/app/profile', label: 'Profile', hint: 'Account and learning preferences' },
  ],
  teacher: [
    { to: '/teacher/courses', label: 'My Courses', hint: 'Create and manage authored courses' },
    { to: '/teacher/groups', label: 'Groups', hint: 'Student cohorts and invite links' },
    { to: '/teacher/grades', label: 'Grades', hint: 'Assessment and score publishing' },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', hint: 'Operational overview' },
    { to: '/admin/courses', label: 'Courses', hint: 'Moderate the learning portfolio' },
    { to: '/admin/users', label: 'Users', hint: 'Access, roles and platform control' },
  ],
};

const roleTitle: Record<Role, string> = {
  student: 'Student workspace',
  teacher: 'Teacher studio',
  admin: 'Admin control room',
};

const roleDescription: Record<Role, string> = {
  student: 'Каталог, мои курсы, оценки и персональная траектория обучения.',
  teacher: 'Авторские курсы, учебные группы, инвайт-ссылки и оценивание студентов.',
  admin: 'Управление курсами, пользователями и общей динамикой платформы.',
};

const roleEyebrow: Record<Role, string> = {
  student: 'Learning space',
  teacher: 'Teaching space',
  admin: 'Operations panel',
};

export function PortalLayout({ role }: { role: Role }) {
  const { logout, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navItems = useMemo(() => navMap[role], [role]);

  return (
    <div className="shell">
      <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
        <div className="brand-block">
          <span className="brand-badge">MSE-MOOC</span>
          <h1>{roleTitle[role]}</h1>
          <p>{roleDescription[role]}</p>
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
          <p className="sidebar-card__eyebrow">Signed in as</p>
          <strong>{user?.fullName}</strong>
          <span>{user?.email}</span>
          <span className="pill pill--role">{user?.role}</span>
          <button type="button" className="ghost-button" onClick={logout}>
            Log out
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
            Menu
          </button>
          <div>
            <p className="eyebrow">{roleEyebrow[role]}</p>
            <h2>{location.pathname.replace('/', ' ').trim() || 'overview'}</h2>
          </div>
          <div className="topbar-status">
            <span className="status-dot" />
            <span>{role === 'admin' ? 'Governance active' : role === 'teacher' ? 'Teaching flow ready' : 'Study flow ready'}</span>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

