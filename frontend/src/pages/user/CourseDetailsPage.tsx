import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AxiosError } from 'axios';
import { PageIntro } from '../../components/PageIntro';
import { enrollInCourse, fetchCourseById } from '../../api/services/courses';
import { useAuth } from '../../auth/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { enrollmentStatusLabel, localeFor } from '../../i18n/format';
import type { Course } from '../../types/models';

const copy = {
  ru: {
    back: 'Назад к каталогу',
    loading: 'Загрузка курса...',
    notFound: 'Курс не найден',
    duration: 'Длительность',
    credits: 'Кредиты',
    provider: 'Провайдер',
    category: 'Категория',
    format: 'Формат',
    period: 'Период',
    subjects: 'Подходящие предметы',
    materials: 'Материалы курса',
    source: 'Источник',
    externalLink: 'Перейти на внешний курс',
    enroll: 'Записаться на курс',
    enrolled: 'Вы уже записаны',
    enrolling: 'Записываем...',
    noMaterials: 'Материалы пока не добавлены преподавателем.',
    sourceExternal: 'Внешний курс',
    sourceInternal: 'Курс внутри платформы',
    free: 'Бесплатно',
    weeks: 'недель',
    creditsLabel: 'кред.',
    enrollError: 'Не удалось записаться. Попробуйте еще раз.',
  },
  en: {
    back: 'Back to catalog',
    loading: 'Loading course...',
    notFound: 'Course not found',
    duration: 'Duration',
    credits: 'Credits',
    provider: 'Provider',
    category: 'Category',
    format: 'Format',
    period: 'Schedule',
    subjects: 'Relevant subjects',
    materials: 'Course materials',
    source: 'Source',
    externalLink: 'Open external course',
    enroll: 'Enroll in course',
    enrolled: 'Already enrolled',
    enrolling: 'Enrolling...',
    noMaterials: 'No materials published by the teacher yet.',
    sourceExternal: 'External course',
    sourceInternal: 'Internal platform course',
    free: 'Free',
    weeks: 'weeks',
    creditsLabel: 'credits',
    enrollError: 'Enrollment failed. Please try again.',
  },
} as const;

export function CourseDetailsPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const { language } = useI18n();
  const text = copy[language];
  const locale = localeFor(language);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCourse = useCallback(async () => {
    if (!courseId) {
      setCourse(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await fetchCourseById(courseId, user?.id);
    setCourse(result);
    setLoading(false);
  }, [courseId, user?.id]);

  useEffect(() => {
    void loadCourse();
  }, [loadCourse]);

  const handleEnroll = async () => {
    if (!course || course.enrollmentStatus === 'enrolled') {
      return;
    }
    setError(null);
    setEnrolling(true);
    try {
      await enrollInCourse(course.id);
      await loadCourse();
    } catch (nextError: unknown) {
      if (nextError instanceof AxiosError) {
        const apiError = (nextError.response?.data as { error?: string } | undefined)?.error;
        setError(apiError ?? text.enrollError);
      } else {
        setError(text.enrollError);
      }
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return <div className="notice-card">{text.loading}</div>;
  }

  if (!course) {
    return <div className="notice-card">{text.notFound}</div>;
  }

  return (
    <div className="stack-xl">
      <Link to="/app/courses" className="ghost-button detail-back-link">
        {text.back}
      </Link>

      <PageIntro
        title={course.title}
        description={course.description}
        actions={
          <span className={`pill pill--${course.enrollmentStatus}`}>
            {enrollmentStatusLabel(course.enrollmentStatus, language)}
          </span>
        }
      />

      <section className="profile-grid">
        <article className="detail-card detail-card--accent">
          <h3>{text.period}</h3>
          <ul className="detail-list">
            <li>{`${course.startDate} - ${course.endDate}`}</li>
            <li>{`${text.duration}: ${course.durationWeeks} ${text.weeks}`}</li>
            <li>{`${text.credits}: ${course.credits} ${text.creditsLabel}`}</li>
            <li>{`${course.price === 0 ? text.free : `${course.price.toLocaleString(locale)} RUB`}`}</li>
          </ul>
        </article>

        <article className="detail-card">
          <h3>{text.source}</h3>
          <ul className="detail-list">
            <li>{`${text.provider}: ${course.provider}`}</li>
            <li>{`${text.category}: ${course.category}`}</li>
            <li>{`${text.format}: ${course.deliveryFormat}`}</li>
            <li>{course.sourceType === 'external' ? text.sourceExternal : text.sourceInternal}</li>
          </ul>
          {course.sourceType === 'external' && course.externalUrl ? (
            <a
              href={course.externalUrl}
              target="_blank"
              rel="noreferrer"
              className="primary-button course-link-button"
            >
              {text.externalLink}
            </a>
          ) : null}
        </article>
      </section>

      <section className="detail-card">
        <h3>{text.subjects}</h3>
        <div className="tag-row">
          {course.subjects.map((subject) => (
            <span key={subject} className="tag-chip">
              {subject}
            </span>
          ))}
        </div>
      </section>

      <section className="detail-card">
        <h3>{text.materials}</h3>
        {course.materialLinks.length === 0 ? (
          <p>{text.noMaterials}</p>
        ) : (
          <ul className="detail-list">
            {course.materialLinks.map((item) => (
              <li key={`${item.title}-${item.url}`}>
                <a href={item.url} target="_blank" rel="noreferrer">
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="detail-card">
        <div className="action-row">
          <button
            type="button"
            className="primary-button"
            onClick={handleEnroll}
            disabled={course.enrollmentStatus === 'enrolled' || enrolling}
          >
            {course.enrollmentStatus === 'enrolled'
              ? text.enrolled
              : enrolling
                ? text.enrolling
                : text.enroll}
          </button>
        </div>
        {error ? <div className="form-error">{error}</div> : null}
      </section>
    </div>
  );
}
