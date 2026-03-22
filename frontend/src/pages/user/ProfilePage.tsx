import { PageIntro } from '../../components/PageIntro';
import { useAuth } from '../../auth/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { roleLabel } from '../../i18n/format';

const copy = {
  ru: {
    eyebrow: 'Пространство студента',
    title: 'Профиль',
    description: 'Персональные данные пользователя, роль в системе и параметры учебного пространства.',
    identity: 'Идентичность',
    learningPreferences: 'Учебные предпочтения',
    prefLanguage: 'Предпочитаемый язык: русский / английский',
    prefNotifications: 'Уведомления: email-дайджест и напоминания по курсам',
    prefTrack: 'Трек: инженерия и аналитика',
    security: 'Безопасность',
    secRbac: 'Ролевой доступ включен для student, teacher, assistant и admin',
    secSession: 'Сессионный токен хранится в локальном состоянии рабочего пространства',
    secRefresh: 'Контур готов к refresh-токенам и join по invite-ссылкам',
  },
  en: {
    eyebrow: 'Student space',
    title: 'Profile',
    description: 'Personal user details, role, and learning workspace settings.',
    identity: 'Identity',
    learningPreferences: 'Learning preferences',
    prefLanguage: 'Preferred language: Russian / English',
    prefNotifications: 'Notifications: email digest and course reminders',
    prefTrack: 'Track: engineering and analytics',
    security: 'Security',
    secRbac: 'Role-based access is enabled for student, teacher, assistant, and admin',
    secSession: 'Session token is stored in local workspace state',
    secRefresh: 'Ready for refresh-token flow and invite-based group join',
  },
} as const;

export function ProfilePage() {
  const { user } = useAuth();
  const { language } = useI18n();
  const text = copy[language];

  return (
    <div className="stack-xl">
      <PageIntro
        eyebrow={text.eyebrow}
        title={text.title}
        description={text.description}
      />

      <section className="profile-grid">
        <article className="detail-card detail-card--accent">
          <span className="eyebrow">{text.identity}</span>
          <h3>{user?.fullName}</h3>
          <p>{user?.email}</p>
          <span className="pill pill--enrolled">{user ? roleLabel(user.role, language) : ''}</span>
        </article>

        <article className="detail-card">
          <h3>{text.learningPreferences}</h3>
          <ul className="detail-list">
            <li>{text.prefLanguage}</li>
            <li>{text.prefNotifications}</li>
            <li>{text.prefTrack}</li>
          </ul>
        </article>

        <article className="detail-card">
          <h3>{text.security}</h3>
          <ul className="detail-list">
            <li>{text.secRbac}</li>
            <li>{text.secSession}</li>
            <li>{text.secRefresh}</li>
          </ul>
        </article>
      </section>
    </div>
  );
}
