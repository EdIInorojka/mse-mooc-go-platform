import { useEffect, useMemo, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { fetchMyCourses } from '../../api/services/courses';
import { useAuth } from '../../auth/AuthContext';
import type { Course } from '../../types/models';

export function MyCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) {
      return;
    }
    void fetchMyCourses(user.id).then(setCourses);
  }, [user?.id]);

  const workload = useMemo(() => courses.reduce((sum, course) => sum + course.durationWeeks, 0), [courses]);

  return (
    <div className="stack-xl">
      <PageIntro
        eyebrow="Student space"
        title="My courses"
        description="Текущая учебная нагрузка, ближайшие старты и личная траектория обучения."
      />

      <section className="stats-grid">
        <article className="stat-card">
          <span>Enrolled</span>
          <strong>{courses.length}</strong>
        </article>
        <article className="stat-card">
          <span>Planned weeks</span>
          <strong>{workload}</strong>
        </article>
        <article className="stat-card">
          <span>Certificates track</span>
          <strong>{courses.length > 0 ? 'Active' : 'Idle'}</strong>
        </article>
        <article className="stat-card">
          <span>Free load</span>
          <strong>{courses.filter((course) => course.price === 0).length}</strong>
        </article>
      </section>

      <section className="timeline-card">
        {courses.length === 0 ? (
          <p className="muted">Пока нет записей на курсы.</p>
        ) : (
          courses.map((course) => (
            <div key={course.id} className="timeline-row">
              <div className="timeline-row__marker" />
              <div>
                <strong>{course.title}</strong>
                <p>{course.provider}</p>
              </div>
              <span>{course.startDate}</span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

