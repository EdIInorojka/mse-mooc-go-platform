import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageIntro } from '../../components/PageIntro';
import { fetchCourses } from '../../api/services/courses';
import { useI18n } from '../../i18n/I18nContext';
import { audienceLabel, enrollmentStatusLabel, localeFor } from '../../i18n/format';
import { useAuth } from '../../auth/AuthContext';
import type { Course } from '../../types/models';

const copy = {
  ru: {
    title: 'Каталог курсов',
    description: 'MOOC-курсы для кредитов, элективов и поддержки учебного процесса.',
    search: 'Поиск',
    searchPlaceholder: 'Название, провайдер, предмет, ключевые слова...',
    source: 'Источник',
    sourceAll: 'Все',
    sourceInternal: 'Внутренние',
    sourceExternal: 'Внешние',
    language: 'Язык',
    languageAll: 'Любой',
    credits: 'Кредиты',
    creditsAll: 'Любые',
    creditsHigh: '4+ кредита',
    available: 'Доступно',
    free: 'Бесплатные',
    withCredits: 'С кредитами',
    external: 'Внешние',
    freeLabel: 'Бесплатно',
    weeks: 'недель',
    seatsLeft: 'мест осталось',
    creditsLabel: 'кред.',
    details: 'Подробнее',
  },
  en: {
    title: 'Course Catalog',
    description: 'MOOC courses for credits, electives, and day-to-day learning support.',
    search: 'Search',
    searchPlaceholder: 'Title, provider, subject, keywords...',
    source: 'Source',
    sourceAll: 'All',
    sourceInternal: 'Internal',
    sourceExternal: 'External',
    language: 'Language',
    languageAll: 'Any',
    credits: 'Credits',
    creditsAll: 'Any',
    creditsHigh: '4+ credits',
    available: 'Available',
    free: 'Free',
    withCredits: 'With credits',
    external: 'External',
    freeLabel: 'Free',
    weeks: 'weeks',
    seatsLeft: 'seats left',
    creditsLabel: 'credits',
    details: 'Open details',
  },
} as const;

type SourceFilter = 'all' | 'internal' | 'external';
type CreditsFilter = 'all' | 'high';

export function CourseCatalogPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [creditsFilter, setCreditsFilter] = useState<CreditsFilter>('all');
  const { language } = useI18n();
  const { user } = useAuth();
  const text = copy[language];
  const locale = localeFor(language);

  useEffect(() => {
    void fetchCourses(user?.id).then(setCourses);
  }, [user?.id]);

  const languageOptions = useMemo(() => {
    const allLanguages = Array.from(new Set(courses.map((course) => course.language)));
    return allLanguages.sort((a, b) => a.localeCompare(b));
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return courses.filter((course) => {
      if (sourceFilter !== 'all' && course.sourceType !== sourceFilter) {
        return false;
      }
      if (languageFilter !== 'all' && course.language !== languageFilter) {
        return false;
      }
      if (creditsFilter === 'high' && course.credits < 4) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        course.title,
        course.provider,
        course.category,
        course.language,
        course.description,
        ...course.subjects,
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [courses, creditsFilter, languageFilter, query, sourceFilter]);

  return (
    <div className="stack-xl">
      <PageIntro
        title={text.title}
        description={text.description}
      />

      <section className="catalog-toolbar">
        <label className="search-field search-field--wide">
          <span>{text.search}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={text.searchPlaceholder}
          />
        </label>

        <label className="filter-field">
          <span>{text.source}</span>
          <select value={sourceFilter} onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}>
            <option value="all">{text.sourceAll}</option>
            <option value="internal">{text.sourceInternal}</option>
            <option value="external">{text.sourceExternal}</option>
          </select>
        </label>

        <label className="filter-field">
          <span>{text.language}</span>
          <select value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)}>
            <option value="all">{text.languageAll}</option>
            {languageOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="filter-field">
          <span>{text.credits}</span>
          <select value={creditsFilter} onChange={(event) => setCreditsFilter(event.target.value as CreditsFilter)}>
            <option value="all">{text.creditsAll}</option>
            <option value="high">{text.creditsHigh}</option>
          </select>
        </label>
      </section>

      <section className="stats-grid">
        <article className="stat-card">
          <span>{text.available}</span>
          <strong>{filteredCourses.length}</strong>
        </article>
        <article className="stat-card">
          <span>{text.free}</span>
          <strong>{filteredCourses.filter((course) => course.price === 0).length}</strong>
        </article>
        <article className="stat-card">
          <span>{text.withCredits}</span>
          <strong>{filteredCourses.filter((course) => course.credits > 0).length}</strong>
        </article>
        <article className="stat-card">
          <span>{text.external}</span>
          <strong>{filteredCourses.filter((course) => course.sourceType === 'external').length}</strong>
        </article>
      </section>

      <section className="card-grid">
        {filteredCourses.map((course) => (
          <article key={course.id} className="course-card">
            <div className="course-card__header">
              <span className={`pill pill--${course.enrollmentStatus}`}>{enrollmentStatusLabel(course.enrollmentStatus, language)}</span>
              <span className="pill pill--role">{audienceLabel(course.audience, language)}</span>
              <span className="pill pill--source">{course.sourceType === 'external' ? text.sourceExternal : text.sourceInternal}</span>
            </div>

            <h3>{course.title}</h3>
            <p>{course.description}</p>

            <div className="course-meta">
              <span>{course.provider}</span>
              <span>{course.category}</span>
              <span>{course.language}</span>
            </div>

            {course.subjects.length > 0 ? (
              <div className="tag-row">
                {course.subjects.slice(0, 4).map((subject) => (
                  <span key={`${course.id}-${subject}`} className="tag-chip">
                    {subject}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="course-footer">
              <div>
                <strong>{course.price === 0 ? text.freeLabel : `${course.price.toLocaleString(locale)} RUB`}</strong>
                <span>{course.durationWeeks} {text.weeks}</span>
              </div>
              <div>
                <strong>{course.credits} {text.creditsLabel}</strong>
                <span>{course.seatsLeft} {text.seatsLeft}</span>
              </div>
            </div>

            <Link className="ghost-button course-card__link" to={`/app/courses/${course.id}`}>
              {text.details}
            </Link>
          </article>
        ))}
      </section>
    </div>
  );
}
