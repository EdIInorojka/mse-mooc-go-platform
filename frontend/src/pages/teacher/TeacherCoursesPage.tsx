import { useEffect, useMemo, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { fetchTeacherCourses } from '../../api/services/courses';
import { useAuth } from '../../auth/AuthContext';
import type { Course } from '../../types/models';

export function TeacherCoursesPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void fetchTeacherCourses(user.id).then(setCourses);
  }, [user?.id]);

  const authored = useMemo(() => courses.filter((course) => course.audience !== 'student'), [courses]);

  return (
    <div className="stack-xl">
      <PageIntro
        eyebrow="Teacher space"
        title="My courses"
        description="Курсы преподавателя, их готовность к запуску и площадка для дальнейшего подключения CRUD."
        actions={<button className="primary-button">Create course</button>}
      />

      <section className="stats-grid">
        <article className="stat-card stat-card--highlight">
          <span>Authored courses</span>
          <strong>{authored.length}</strong>
        </article>
        <article className="stat-card">
          <span>Free electives</span>
          <strong>{authored.filter((course) => course.price === 0).length}</strong>
        </article>
        <article className="stat-card">
          <span>Avg. rating</span>
          <strong>{authored.length ? (authored.reduce((sum, course) => sum + course.rating, 0) / authored.length).toFixed(1) : '0.0'}</strong>
        </article>
        <article className="stat-card">
          <span>Upcoming starts</span>
          <strong>{authored.filter((course) => course.enrollmentStatus !== 'waitlist').length}</strong>
        </article>
      </section>

      <section className="card-grid">
        {authored.map((course) => (
          <article key={course.id} className="course-card">
            <div className="course-card__header">
              <span className="pill pill--role">teacher</span>
              <span className={`pill pill--${course.enrollmentStatus}`}>{course.enrollmentStatus}</span>
            </div>
            <h3>{course.title}</h3>
            <p>{course.description}</p>
            <div className="course-meta">
              <span>{course.category}</span>
              <span>{course.language}</span>
              <span>{course.startDate}</span>
            </div>
            <div className="course-footer">
              <div>
                <strong>{course.price === 0 ? 'Free' : `${course.price.toLocaleString('ru-RU')} RUB`}</strong>
                <span>{course.durationWeeks} weeks</span>
              </div>
              <div>
                <strong>{course.rating.toFixed(1)}</strong>
                <span>{course.seatsLeft} seats left</span>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

