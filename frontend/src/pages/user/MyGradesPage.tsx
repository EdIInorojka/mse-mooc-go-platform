import { useEffect, useMemo, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { fetchMyGrades, joinGroupByInvite } from '../../api/services/groups';
import { useAuth } from '../../auth/AuthContext';
import type { GradeRecord } from '../../types/models';

export function MyGradesPage() {
  const { user } = useAuth();
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
        eyebrow="Student space"
        title="My grades"
        description="Оценки, обратная связь преподавателей и быстрый вход в группу по invite-токену."
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
              placeholder="Paste invite token"
            />
            <button type="submit" className="primary-button">Join group</button>
          </form>
        }
      />

      <section className="stats-grid">
        <article className="stat-card">
          <span>Published grades</span>
          <strong>{grades.filter((grade) => grade.status === 'published').length}</strong>
        </article>
        <article className="stat-card">
          <span>Average result</span>
          <strong>{average}%</strong>
        </article>
        <article className="stat-card">
          <span>Draft reviews</span>
          <strong>{grades.filter((grade) => grade.status === 'draft').length}</strong>
        </article>
        <article className="stat-card">
          <span>Group access</span>
          <strong>{joinStatus ? 'Updated' : 'Ready'}</strong>
        </article>
      </section>

      {joinStatus ? <div className="notice-card">{joinStatus}</div> : null}

      <section className="table-card">
        <table>
          <thead>
            <tr>
              <th>Course</th>
              <th>Group</th>
              <th>Score</th>
              <th>Status</th>
              <th>Feedback</th>
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
                <td><span className={`pill pill--${grade.status === 'published' ? 'enrolled' : 'waitlist'}`}>{grade.status}</span></td>
                <td>{grade.feedback}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

