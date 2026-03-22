import { useEffect, useMemo, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { fetchMyGrades, joinGroupByInvite } from '../../api/services/groups';
import { useAuth } from '../../auth/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { enrollmentStatusLabel } from '../../i18n/format';
import type { GradeRecord } from '../../types/models';

const copy = {
  ru: {
    eyebrow: 'Пространство студента',
    title: 'Мои оценки',
    description: 'Оценки, обратная связь преподавателей и быстрый вход в группу по invite-токену.',
    invitePlaceholder: 'Введите invite-токен',
    joinGroup: 'Вступить в группу',
    publishedGrades: 'Опубликованные оценки',
    averageResult: 'Средний результат',
    draftReviews: 'Черновики',
    groupAccess: 'Доступ к группе',
    updated: 'Обновлен',
    ready: 'Готов',
    course: 'Курс',
    group: 'Группа',
    score: 'Оценка',
    status: 'Статус',
    feedback: 'Комментарий',
  },
  en: {
    eyebrow: 'Student space',
    title: 'My grades',
    description: 'Grades, teacher feedback, and quick group join by invite token.',
    invitePlaceholder: 'Paste invite token',
    joinGroup: 'Join group',
    publishedGrades: 'Published grades',
    averageResult: 'Average result',
    draftReviews: 'Draft reviews',
    groupAccess: 'Group access',
    updated: 'Updated',
    ready: 'Ready',
    course: 'Course',
    group: 'Group',
    score: 'Score',
    status: 'Status',
    feedback: 'Feedback',
  },
} as const;

export function MyGradesPage() {
  const { user } = useAuth();
  const { language } = useI18n();
  const text = copy[language];
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [inviteToken, setInviteToken] = useState('');
  const [joinStatus, setJoinStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void fetchMyGrades(user.id).then(setGrades);
  }, [user?.id]);

  const average = useMemo(() => {
    if (grades.length === 0) {
      return 0;
    }

    return Math.round(grades.reduce((sum, grade) => sum + (grade.score / grade.maxScore) * 100, 0) / grades.length);
  }, [grades]);

  return (
    <div className="stack-xl">
      <PageIntro
        eyebrow={text.eyebrow}
        title={text.title}
        description={text.description}
        actions={
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!inviteToken.trim()) {
                return;
              }
              void joinGroupByInvite(inviteToken).then((result) => setJoinStatus(result.status));
            }}
          >
            <input
              value={inviteToken}
              onChange={(event) => setInviteToken(event.target.value)}
              placeholder={text.invitePlaceholder}
            />
            <button type="submit" className="primary-button">{text.joinGroup}</button>
          </form>
        }
      />

      <section className="stats-grid">
        <article className="stat-card">
          <span>{text.publishedGrades}</span>
          <strong>{grades.filter((grade) => grade.status === 'published').length}</strong>
        </article>
        <article className="stat-card">
          <span>{text.averageResult}</span>
          <strong>{average}%</strong>
        </article>
        <article className="stat-card">
          <span>{text.draftReviews}</span>
          <strong>{grades.filter((grade) => grade.status === 'draft').length}</strong>
        </article>
        <article className="stat-card">
          <span>{text.groupAccess}</span>
          <strong>{joinStatus ? text.updated : text.ready}</strong>
        </article>
      </section>

      {joinStatus ? <div className="notice-card">{joinStatus}</div> : null}

      <section className="table-card">
        <table>
          <thead>
            <tr>
              <th>{text.course}</th>
              <th>{text.group}</th>
              <th>{text.score}</th>
              <th>{text.status}</th>
              <th>{text.feedback}</th>
            </tr>
          </thead>
          <tbody>
            {grades.map((grade) => (
              <tr key={grade.id}>
                <td>
                  <strong>{grade.courseTitle}</strong>
                  <div className="muted">{grade.assignedAt}</div>
                </td>
                <td>{grade.groupName}</td>
                <td>{grade.score}/{grade.maxScore}</td>
                <td><span className={`pill pill--${grade.status === 'published' ? 'enrolled' : 'waitlist'}`}>{enrollmentStatusLabel(grade.status, language)}</span></td>
                <td>{grade.feedback}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
