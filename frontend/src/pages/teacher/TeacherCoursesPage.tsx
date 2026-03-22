import { useEffect, useMemo, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { fetchTeacherCourses } from '../../api/services/courses';
import { useAuth } from '../../auth/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { enrollmentStatusLabel, localeFor } from '../../i18n/format';
import type { Course } from '../../types/models';

const copy = {
  ru: {
    eyebrow: 'Пространство преподавателя',
    title: 'Мои курсы',
    description: 'Курсы преподавателя, их готовность к запуску и площадка для дальнейшего CRUD.',
    createCourse: 'Создать курс',
    authoredCourses: 'Авторские курсы',
    freeElectives: 'Бесплатные курсы',
    avgRating: 'Средний рейтинг',
    upcomingStarts: 'Ближайшие старты',
    teacher: 'Преподаватель',
    free: 'Бесплатно',
    weeks: 'недель',
    seatsLeft: 'мест осталось',
  },
  en: {
    eyebrow: 'Teacher space',
    title: 'My courses',
    description: 'Teacher-owned courses, launch readiness, and future CRUD workflow.',
    createCourse: 'Create course',
    authoredCourses: 'Authored courses',
    freeElectives: 'Free electives',
    avgRating: 'Avg. rating',
    upcomingStarts: 'Upcoming starts',
    teacher: 'Teacher',
    free: 'Free',
    weeks: 'weeks',
    seatsLeft: 'seats left',
  },
} as const;

export function TeacherCoursesPage() {
  const { user } = useAuth();
  const { language } = useI18n();
  const text = copy[language];
  const locale = localeFor(language);
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
        eyebrow={text.eyebrow}
        title={text.title}
        description={text.description}
        actions={<button className="primary-button">{text.createCourse}</button>}
      />

      <section className="stats-grid">
        <article className="stat-card stat-card--highlight">
          <span>{text.authoredCourses}</span>
          <strong>{authored.length}</strong>
        </article>
        <article className="stat-card">
          <span>{text.freeElectives}</span>
          <strong>{authored.filter((course) => course.price === 0).length}</strong>
        </article>
        <article className="stat-card">
          <span>{text.avgRating}</span>
          <strong>{authored.length ? (authored.reduce((sum, course) => sum + course.rating, 0) / authored.length).toFixed(1) : '0.0'}</strong>
        </article>
        <article className="stat-card">
          <span>{text.upcomingStarts}</span>
          <strong>{authored.filter((course) => course.enrollmentStatus !== 'waitlist').length}</strong>
        </article>
      </section>

      <section className="card-grid">
        {authored.map((course) => (
          <article key={course.id} className="course-card">
            <div className="course-card__header">
              <span className="pill pill--role">{text.teacher}</span>
              <span className={`pill pill--${course.enrollmentStatus}`}>{enrollmentStatusLabel(course.enrollmentStatus, language)}</span>
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
                <strong>{course.price === 0 ? text.free : `${course.price.toLocaleString(locale)} RUB`}</strong>
                <span>{course.durationWeeks} {text.weeks}</span>
              </div>
              <div>
                <strong>{course.rating.toFixed(1)}</strong>
                <span>{course.seatsLeft} {text.seatsLeft}</span>
              </div>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
