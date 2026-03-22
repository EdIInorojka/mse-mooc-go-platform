import { useEffect, useMemo, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { fetchCourses } from '../../api/services/courses';
import type { Course } from '../../types/models';

export function CourseCatalogPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    void fetchCourses().then(setCourses);
  }, []);

  const filteredCourses = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (!normalized) {
      return courses;
    }

    return courses.filter((course) => {
      return [course.title, course.provider, course.category, course.language, course.audience]
        .join(' ')
        .toLowerCase()
        .includes(normalized);
    });
  }, [courses, query]);

  return (
    <div className="stack-xl">
      <PageIntro
        eyebrow="Student space"
        title="Course catalog"
        description="Подборка MOOC-курсов с быстрым поиском по направлению, формату и целевой аудитории."
        actions={
          <label className="search-field">
            <span>Quick search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="analytics, security, engineering..."
            />
          </label>
        }
      />

      <section className="stats-grid">
        <article className="stat-card">
          <span>Available now</span>
          <strong>{courses.length}</strong>
        </article>
        <article className="stat-card">
          <span>Student-ready</span>
          <strong>{courses.filter((course) => course.audience !== 'teacher').length}</strong>
        </article>
        <article className="stat-card">
          <span>Free options</span>
          <strong>{courses.filter((course) => course.price === 0).length}</strong>
        </article>
        <article className="stat-card">
          <span>Avg. rating</span>
          <strong>
            {courses.length > 0
              ? (courses.reduce((sum, course) => sum + course.rating, 0) / courses.length).toFixed(1)
              : '0.0'}
          </strong>
        </article>
      </section>

      <section className="card-grid">
        {filteredCourses.map((course) => (
          <article key={course.id} className="course-card">
            <div className="course-card__header">
              <span className={`pill pill--${course.enrollmentStatus}`}>{course.enrollmentStatus}</span>
              <span className="pill pill--role">{course.audience}</span>
              <span className="muted">{course.startDate}</span>
            </div>
            <h3>{course.title}</h3>
            <p>{course.description}</p>
            <div className="course-meta">
              <span>{course.provider}</span>
              <span>{course.category}</span>
              <span>{course.language}</span>
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

