import { useEffect, useMemo, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { fetchCourses } from '../../api/services/courses';
import { useI18n } from '../../i18n/I18nContext';
import { audienceLabel, enrollmentStatusLabel, localeFor } from '../../i18n/format';
import type { Course } from '../../types/models';

const copy = {
  ru: {
    eyebrow: 'Пространство студента',
    title: 'Каталог курсов',
    description: 'Подборка MOOC-курсов с быстрым поиском по направлению, формату и аудитории.',
    quickSearch: 'Быстрый поиск',
    searchPlaceholder: 'аналитика, безопасность, инженерия...',
    availableNow: 'Доступно сейчас',
    studentReady: 'Подходит студентам',
    freeOptions: 'Бесплатные',
    avgRating: 'Средний рейтинг',
    free: 'Бесплатно',
    weeks: 'недель',
    seatsLeft: 'мест осталось',
  },
  en: {
    eyebrow: 'Student space',
    title: 'Course catalog',
    description: 'MOOC selection with quick search by domain, format, and audience.',
    quickSearch: 'Quick search',
    searchPlaceholder: 'analytics, security, engineering...',
    availableNow: 'Available now',
    studentReady: 'Student-ready',
    freeOptions: 'Free options',
    avgRating: 'Avg. rating',
    free: 'Free',
    weeks: 'weeks',
    seatsLeft: 'seats left',
  },
} as const;

export function CourseCatalogPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [query, setQuery] = useState('');
  const { language } = useI18n();
  const text = copy[language];
  const locale = localeFor(language);

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
        eyebrow={text.eyebrow}
        title={text.title}
        description={text.description}
        actions={
          <label className="search-field">
            <span>{text.quickSearch}</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={text.searchPlaceholder}
            />
          </label>
        }
      />

      <section className="stats-grid">
        <article className="stat-card">
          <span>{text.availableNow}</span>
          <strong>{courses.length}</strong>
        </article>
        <article className="stat-card">
          <span>{text.studentReady}</span>
          <strong>{courses.filter((course) => course.audience !== 'teacher').length}</strong>
        </article>
        <article className="stat-card">
          <span>{text.freeOptions}</span>
          <strong>{courses.filter((course) => course.price === 0).length}</strong>
        </article>
        <article className="stat-card">
          <span>{text.avgRating}</span>
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
              <span className={`pill pill--${course.enrollmentStatus}`}>{enrollmentStatusLabel(course.enrollmentStatus, language)}</span>
              <span className="pill pill--role">{audienceLabel(course.audience, language)}</span>
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
