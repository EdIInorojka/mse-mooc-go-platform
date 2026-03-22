import { useEffect, useMemo, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { assignGrade, fetchTeacherGrades, fetchTeacherGroups } from '../../api/services/groups';
import { useAuth } from '../../auth/AuthContext';
import type { GradeRecord, StudentGroup } from '../../types/models';

export function TeacherGradesPage() {
  const { user } = useAuth();
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
        eyebrow="Teacher space"
        title="Grades and feedback"
        description="Выставление оценок по группам, публикация результатов и быстрая обратная связь студентам."
      />

      <section className="split-grid">
        <article className="detail-card detail-card--accent">
          <h3>Assign grade</h3>
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
              Group
              <select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </label>

            <label>
              Student
              <select value={studentId} onChange={(event) => setStudentId(event.target.value)}>
                {(selectedGroup?.members ?? []).map((member) => (
                  <option key={member.id} value={member.id}>{member.fullName}</option>
                ))}
              </select>
            </label>

            <label>
              Score
              <input value={score} onChange={(event) => setScore(event.target.value)} />
            </label>

            <label>
              Feedback
              <textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={4} />
            </label>

            <button type="submit" className="primary-button">Publish grade</button>
          </form>
        </article>

        <article className="detail-card">
          <h3>Grade pulse</h3>
          <ul className="detail-list">
            <li>Published grades: {grades.filter((grade) => grade.status === 'published').length}</li>
            <li>Draft grades: {grades.filter((grade) => grade.status === 'draft').length}</li>
            <li>Tracked groups: {groups.length}</li>
          </ul>
        </article>
      </section>

      <section className="table-card">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Course</th>
              <th>Group</th>
              <th>Score</th>
              <th>Status</th>
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
                <td><span className={`pill pill--${grade.status === 'published' ? 'enrolled' : 'waitlist'}`}>{grade.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

