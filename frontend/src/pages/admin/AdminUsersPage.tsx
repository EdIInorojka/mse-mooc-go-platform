import { useEffect, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { fetchUsers } from '../../api/services/users';
import { useI18n } from '../../i18n/I18nContext';
import { enrollmentStatusLabel, roleLabel } from '../../i18n/format';
import type { PlatformUser } from '../../types/models';

const copy = {
  ru: {
    eyebrow: 'Пространство администратора',
    title: 'Управление пользователями',
    description: 'Роли, активность и состояние доступа студентов, преподавателей и ассистентов.',
    user: 'Пользователь',
    role: 'Роль',
    status: 'Статус',
    courses: 'Курсы',
    lastSeen: 'Последняя активность',
  },
  en: {
    eyebrow: 'Admin space',
    title: 'User management',
    description: 'Roles, activity, and access state for students, teachers, and assistants.',
    user: 'User',
    role: 'Role',
    status: 'Status',
    courses: 'Courses',
    lastSeen: 'Last seen',
  },
} as const;

export function AdminUsersPage() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const { language } = useI18n();
  const text = copy[language];

  useEffect(() => {
    void fetchUsers().then(setUsers);
  }, []);

  return (
    <div className="stack-xl">
      <PageIntro
        eyebrow={text.eyebrow}
        title={text.title}
        description={text.description}
      />

      <section className="table-card">
        <table>
          <thead>
            <tr>
              <th>{text.user}</th>
              <th>{text.role}</th>
              <th>{text.status}</th>
              <th>{text.courses}</th>
              <th>{text.lastSeen}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.fullName}</strong>
                  <div className="muted">{user.email}</div>
                </td>
                <td><span className="pill pill--role">{roleLabel(user.role, language)}</span></td>
                <td>
                  <span className={`pill pill--${user.status === 'active' ? 'enrolled' : user.status === 'blocked' ? 'waitlist' : 'open'}`}>
                    {enrollmentStatusLabel(user.status, language)}
                  </span>
                </td>
                <td>{user.enrolledCourses}</td>
                <td>{user.lastSeen}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
