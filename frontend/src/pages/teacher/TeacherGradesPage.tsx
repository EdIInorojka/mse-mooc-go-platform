import { useEffect, useMemo, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { assignGrade, fetchTeacherGrades, fetchTeacherGroups } from '../../api/services/groups';
import { useAuth } from '../../auth/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { enrollmentStatusLabel } from '../../i18n/format';
import type { GradeRecord, StudentGroup } from '../../types/models';

const copy = {
  ru: {
    eyebrow: 'Пространство преподавателя',
    title: 'Оценки и обратная связь',
    description: 'Выставление оценок по группам, публикация результатов и быстрая обратная связь.',
    assignGrade: 'Выставить оценку',
    group: 'Группа',
    student: 'Студент',
    score: 'Оценка',
    feedback: 'Комментарий',
    publishGrade: 'Опубликовать оценку',
    gradePulse: 'Пульс оценивания',
    publishedGrades: 'Опубликовано',
    draftGrades: 'Черновики',
    trackedGroups: 'Групп в работе',
    course: 'Курс',
    status: 'Статус',
  },
  en: {
    eyebrow: 'Teacher space',
    title: 'Grades and feedback',
    description: 'Assign grades by groups, publish results, and provide fast feedback.',
    assignGrade: 'Assign grade',
    group: 'Group',
    student: 'Student',
    score: 'Score',
    feedback: 'Feedback',
    publishGrade: 'Publish grade',
    gradePulse: 'Grade pulse',
    publishedGrades: 'Published grades',
    draftGrades: 'Draft grades',
    trackedGroups: 'Tracked groups',
    course: 'Course',
    status: 'Status',
  },
} as const;

export function TeacherGradesPage() {
  const { user } = useAuth();
  const { language } = useI18n();
  const text = copy[language];
  const [grades, setGrades] = useState<GradeRecord[]>([]);
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [groupId, setGroupId] = useState('group-1');
  const [studentId, setStudentId] = useState('student-1');
  const [score, setScore] = useState('90');
  const [feedback, setFeedback] = useState('Strong result and solid project execution.');

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void fetchTeacherGrades(user.id).then(setGrades);
    void fetchTeacherGroups(user.id).then((items) => {
      setGroups(items);
      if (items[0]) {
        setGroupId(items[0].id);
        if (items[0].members[0]) {
          setStudentId(items[0].members[0].id);
        }
      }
    });
  }, [user?.id]);

  const selectedGroup = useMemo(() => groups.find((group) => group.id === groupId) ?? groups[0], [groupId, groups]);

  return (
    <div className="stack-xl">
      <PageIntro
        eyebrow={text.eyebrow}
        title={text.title}
        description={text.description}
      />

      <section className="split-grid">
        <article className="detail-card detail-card--accent">
          <h3>{text.assignGrade}</h3>
          <form
            className="stack-md"
            onSubmit={(event) => {
              event.preventDefault();
              void assignGrade({
                groupId,
                studentId,
                score: Number(score),
                maxScore: 100,
                feedback,
              }).then((grade) => setGrades((current) => [grade, ...current]));
            }}
          >
            <label>
              {text.group}
              <select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </label>

            <label>
              {text.student}
              <select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
                {(selectedGroup?.members ?? []).map((member) => (
                  <option key={member.id} value={member.id}>{member.fullName}</option>
                ))}
              </select>
            </label>

            <label>
              {text.score}
              <input value={score} onChange={(event) => setScore(event.target.value)} />
            </label>

            <label>
              {text.feedback}
              <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={4} />
            </label>

            <button type="submit" className="primary-button">{text.publishGrade}</button>
          </form>
        </article>

        <article className="detail-card">
          <h3>{text.gradePulse}</h3>
          <ul className="detail-list">
            <li>{text.publishedGrades}: {grades.filter((grade) => grade.status === 'published').length}</li>
            <li>{text.draftGrades}: {grades.filter((grade) => grade.status === 'draft').length}</li>
            <li>{text.trackedGroups}: {groups.length}</li>
          </ul>
        </article>
      </section>

      <section className="table-card">
        <table>
          <thead>
            <tr>
              <th>{text.student}</th>
              <th>{text.course}</th>
              <th>{text.group}</th>
              <th>{text.score}</th>
              <th>{text.status}</th>
            </tr>
          </thead>
          <tbody>
            {grades.map((grade) => (
              <tr key={grade.id}>
                <td>
                  <strong>{grade.studentName}</strong>
                  <div className="muted">{grade.feedback}</div>
                </td>
                <td>{grade.courseTitle}</td>
                <td>{grade.groupName}</td>
                <td>{grade.score}/{grade.maxScore}</td>
                <td><span className={`pill pill--${grade.status === 'published' ? 'enrolled' : 'waitlist'}`}>{enrollmentStatusLabel(grade.status, language)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
