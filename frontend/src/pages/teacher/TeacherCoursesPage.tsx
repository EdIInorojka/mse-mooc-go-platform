import { useEffect, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import { PageIntro } from '../../components/PageIntro';
import { createCourse, fetchTeacherCourses } from '../../api/services/courses';
import { useAuth } from '../../auth/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import { enrollmentStatusLabel, localeFor } from '../../i18n/format';
import type { Course } from '../../types/models';

const copy = {
  ru: {
    title: 'Курсы преподавателя',
    description: 'Создавайте внутренние курсы с материалами или внешние курсы со ссылкой на оригинал.',
    createCourse: 'Создать курс',
    authoredCourses: 'Авторские курсы',
    internalCourses: 'Внутренние',
    externalCourses: 'Внешние',
    avgRating: 'Средний рейтинг',
    teacher: 'Преподаватель',
    free: 'Бесплатно',
    weeks: 'недель',
    seatsLeft: 'мест осталось',
    formTitle: 'Новый курс',
    fieldName: 'Название',
    fieldDescription: 'Описание',
    fieldProvider: 'Провайдер',
    fieldCategory: 'Категория',
    fieldSource: 'Источник',
    sourceInternal: 'Внутренний',
    sourceExternal: 'Внешний',
    fieldExternalUrl: 'Ссылка на внешний курс',
    fieldSubjects: 'Предметы (через запятую)',
    fieldMaterials: 'Материалы (каждая строка: Название|URL)',
    fieldCredits: 'Кредиты',
    fieldDuration: 'Длительность (нед.)',
    fieldSeats: 'Мест',
    fieldStart: 'Дата начала',
    fieldEnd: 'Дата окончания',
    publish: 'Опубликовать курс',
    publishing: 'Публикуем...',
    createError: 'Не удалось создать курс',
  },
  en: {
    title: 'Teacher Courses',
    description: 'Create internal courses with materials or external courses with source links.',
    createCourse: 'Create course',
    authoredCourses: 'Authored courses',
    internalCourses: 'Internal',
    externalCourses: 'External',
    avgRating: 'Avg. rating',
    teacher: 'Teacher',
    free: 'Free',
    weeks: 'weeks',
    seatsLeft: 'seats left',
    formTitle: 'New course',
    fieldName: 'Title',
    fieldDescription: 'Description',
    fieldProvider: 'Provider',
    fieldCategory: 'Category',
    fieldSource: 'Source',
    sourceInternal: 'Internal',
    sourceExternal: 'External',
    fieldExternalUrl: 'External course URL',
    fieldSubjects: 'Subjects (comma separated)',
    fieldMaterials: 'Materials (each row: Title|URL)',
    fieldCredits: 'Credits',
    fieldDuration: 'Duration (weeks)',
    fieldSeats: 'Seats',
    fieldStart: 'Start date',
    fieldEnd: 'End date',
    publish: 'Publish course',
    publishing: 'Publishing...',
    createError: 'Failed to create course',
  },
} as const;

export function TeacherCoursesPage() {
  const { user } = useAuth();
  const { language } = useI18n();
  const text = copy[language];
  const locale = localeFor(language);
  const [courses, setCourses] = useState<Course[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState('HSE');
  const [category, setCategory] = useState('General');
  const [sourceType, setSourceType] = useState<Course['sourceType']>('internal');
  const [externalUrl, setExternalUrl] = useState('');
  const [subjects, setSubjects] = useState('');
  const [materials, setMaterials] = useState('');
  const [credits, setCredits] = useState(2);
  const [durationWeeks, setDurationWeeks] = useState(6);
  const [seatsLeft, setSeatsLeft] = useState(60);
  const [startDate, setStartDate] = useState('2026-04-15');
  const [endDate, setEndDate] = useState('2026-06-01');

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void fetchTeacherCourses(user.id).then(setCourses);
  }, [user?.id]);

  const authored = useMemo(() => courses.filter((course) => course.audience !== 'student'), [courses]);

  const handleCreateCourse = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setCreating(true);

    try {
      const created = await createCourse({
        title,
        description,
        provider,
        category,
        deliveryFormat: 'online',
        audience: 'mixed',
        sourceType,
        externalUrl,
        subjectTags: subjects,
        materialLinks: materials,
        language: language === 'ru' ? 'Russian' : 'English',
        price: 0,
        credits,
        seatsLeft,
        durationWeeks,
        startDate,
        endDate,
      });
      setCourses((prev) => [created, ...prev]);
      setTitle('');
      setDescription('');
      setExternalUrl('');
      setSubjects('');
      setMaterials('');
    } catch (nextError: unknown) {
      if (nextError instanceof AxiosError) {
        const apiError = (nextError.response?.data as { error?: string } | undefined)?.error;
        setError(apiError ?? text.createError);
      } else {
        setError(text.createError);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="stack-xl">
      <PageIntro
        title={text.title}
        description={text.description}
      />

      <form className="detail-card teacher-course-form" onSubmit={handleCreateCourse}>
        <h3>{text.formTitle}</h3>
        <div className="teacher-course-form__grid">
          <label>
            {text.fieldName}
            <input value={title} onChange={(event) => setTitle(event.target.value)} required />
          </label>
          <label>
            {text.fieldProvider}
            <input value={provider} onChange={(event) => setProvider(event.target.value)} required />
          </label>
          <label>
            {text.fieldCategory}
            <input value={category} onChange={(event) => setCategory(event.target.value)} required />
          </label>
          <label>
            {text.fieldSource}
            <select value={sourceType} onChange={(event) => setSourceType(event.target.value as Course['sourceType'])}>
              <option value="internal">{text.sourceInternal}</option>
              <option value="external">{text.sourceExternal}</option>
            </select>
          </label>
          <label>
            {text.fieldCredits}
            <input type="number" min={0} value={credits} onChange={(event) => setCredits(Number(event.target.value))} />
          </label>
          <label>
            {text.fieldDuration}
            <input type="number" min={1} value={durationWeeks} onChange={(event) => setDurationWeeks(Number(event.target.value))} />
          </label>
          <label>
            {text.fieldSeats}
            <input type="number" min={1} value={seatsLeft} onChange={(event) => setSeatsLeft(Number(event.target.value))} />
          </label>
          <label>
            {text.fieldStart}
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} required />
          </label>
          <label>
            {text.fieldEnd}
            <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} required />
          </label>
          {sourceType === 'external' ? (
            <label className="teacher-course-form__wide">
              {text.fieldExternalUrl}
              <input type="url" value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} required />
            </label>
          ) : null}
          <label className="teacher-course-form__wide">
            {text.fieldDescription}
            <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} required />
          </label>
          <label className="teacher-course-form__wide">
            {text.fieldSubjects}
            <input value={subjects} onChange={(event) => setSubjects(event.target.value)} placeholder="analytics, math, python" />
          </label>
          <label className="teacher-course-form__wide">
            {text.fieldMaterials}
            <textarea
              rows={3}
              value={materials}
              onChange={(event) => setMaterials(event.target.value)}
              placeholder="Lecture 1|https://...\nSeminar deck|https://..."
            />
          </label>
        </div>
        {error ? <div className="form-error">{error}</div> : null}
        <div className="action-row">
          <button type="submit" className="primary-button" disabled={creating}>
            {creating ? text.publishing : text.publish}
          </button>
        </div>
      </form>

      <section className="stats-grid">
        <article className="stat-card stat-card--highlight">
          <span>{text.authoredCourses}</span>
          <strong>{authored.length}</strong>
        </article>
        <article className="stat-card">
          <span>{text.internalCourses}</span>
          <strong>{authored.filter((course) => course.sourceType === 'internal').length}</strong>
        </article>
        <article className="stat-card">
          <span>{text.externalCourses}</span>
          <strong>{authored.filter((course) => course.sourceType === 'external').length}</strong>
        </article>
        <article className="stat-card">
          <span>{text.avgRating}</span>
          <strong>{authored.length ? (authored.reduce((sum, course) => sum + course.rating, 0) / authored.length).toFixed(1) : '0.0'}</strong>
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
