import { PageIntro } from '../../components/PageIntro';
import { useAuth } from '../../auth/AuthContext';

export function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="stack-xl">
      <PageIntro
        eyebrow="Student space"
        title="Profile"
        description="Персональные данные пользователя, роль в системе и параметры учебного пространства."
      />

      <section className="profile-grid">
        <article className="detail-card detail-card--accent">
          <span className="eyebrow">Identity</span>
          <h3>{user?.fullName}</h3>
          <p>{user?.email}</p>
          <span className="pill pill--enrolled">{user?.role}</span>
        </article>

        <article className="detail-card">
          <h3>Learning preferences</h3>
          <ul className="detail-list">
            <li>Preferred language: Russian / English</li>
            <li>Notifications: email digest + course reminders</li>
            <li>Track: engineering and analytics</li>
          </ul>
        </article>

        <article className="detail-card">
          <h3>Security</h3>
          <ul className="detail-list">
            <li>Role-based access is enabled for student, teacher and admin</li>
            <li>Session token is stored in local workspace state</li>
            <li>Ready for backend refresh-token rotation and invite-based group join</li>
          </ul>
        </article>
      </section>
    </div>
  );
}

