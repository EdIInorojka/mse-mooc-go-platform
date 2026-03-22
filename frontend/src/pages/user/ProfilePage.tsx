import { useEffect, useState } from 'react';
import { AxiosError } from 'axios';
import { PageIntro } from '../../components/PageIntro';
import { useAuth } from '../../auth/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { roleLabel } from '../../i18n/format';

const copy = {
  ru: {
    title: 'Профиль',
    description: 'Обновляйте личные данные аккаунта и параметры доступа.',
    fullName: 'ФИО',
    email: 'Email',
    password: 'Новый пароль',
    passwordHint: 'Оставьте пустым, если менять не нужно',
    save: 'Сохранить изменения',
    saving: 'Сохраняем...',
    success: 'Профиль обновлен',
    saveFailed: 'Не удалось сохранить профиль',
  },
  en: {
    title: 'Profile',
    description: 'Update personal account details and access parameters.',
    fullName: 'Full name',
    email: 'Email',
    password: 'New password',
    passwordHint: 'Leave empty to keep current password',
    save: 'Save changes',
    saving: 'Saving...',
    success: 'Profile updated',
    saveFailed: 'Failed to save profile',
  },
} as const;

export function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const { language } = useI18n();
  const text = copy[language];
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setFullName(user?.fullName ?? '');
    setEmail(user?.email ?? '');
  }, [user?.email, user?.fullName]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      await updateProfile({
        fullName,
        email,
        password: password.trim() ? password : undefined,
      });
      setPassword('');
      setSuccess(text.success);
    } catch (nextError: unknown) {
      if (nextError instanceof AxiosError) {
        const apiError = (nextError.response?.data as { error?: string } | undefined)?.error;
        setError(apiError ?? text.saveFailed);
      } else {
        setError(text.saveFailed);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="stack-xl">
      <PageIntro
        title={text.title}
        description={text.description}
      />

      <section className="profile-grid">
        <article className="detail-card detail-card--accent">
          <h3>{user?.fullName}</h3>
          <p>{user?.email}</p>
          <span className="pill pill--enrolled">{user ? roleLabel(user.role, language) : ''}</span>
        </article>

        <form className="detail-card profile-form" onSubmit={handleSubmit}>
          <label>
            {text.fullName}
            <input value={fullName} onChange={(event) => setFullName(event.target.value)} required />
          </label>

          <label>
            {text.email}
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>

          <label>
            {text.password}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={text.passwordHint}
            />
          </label>

          {error ? <div className="form-error">{error}</div> : null}
          {success ? <div className="notice-card">{success}</div> : null}

          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? text.saving : text.save}
          </button>
        </form>
      </section>
    </div>
  );
}
