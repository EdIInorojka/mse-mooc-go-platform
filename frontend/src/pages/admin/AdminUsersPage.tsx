import { useEffect, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { fetchUsers } from '../../api/services/users';
import type { PlatformUser } from '../../types/models';

export function AdminUsersPage() {
  const [users, setUsers] = useState<PlatformUser[]>([]);

  useEffect(() => {
    void fetchUsers().then(setUsers);
  }, []);

  return (
    <div className="stack-xl">
      <PageIntro
        eyebrow="Admin space"
        title="User management"
        description="Роли, активность и состояние доступа студентов, преподавателей и администраторов платформы."
      />

      <section className="table-card">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Courses</th>
              <th>Last seen</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.fullName}</strong>
                  <div className="muted">{user.email}</div>
                </td>
                <td><span className="pill pill--role">{user.role}</span></td>
                <td>
                  <span className={`pill pill--${user.status === 'active' ? 'enrolled' : user.status === 'blocked' ? 'waitlist' : 'open'}`}>
                    {user.status}
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

