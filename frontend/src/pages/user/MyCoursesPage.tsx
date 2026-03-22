import { useEffect, useMemo, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { fetchMyCourses } from '../../api/services/courses';
import { useAuth } from '../../auth/AuthContext';
import { useI18n } from '../../i18n/I18nContext';
import type { Course } from '../../types/models';

const copy = {
  ru: {
    eyebrow: 'Пространство студента',
    title: 'Мои курсы',
    description: 'Текущая учебная нагрузка, ближайшие старты и личная траектория обучения.',
    enrolled: 'Записан',
    plannedWeeks: 'Запланировано недель',
    certificatesTrack: 'Сертификатный трек',
    active: 'Активен',
    idle: 'Ожидает',
    freeLoad: 'Бесплатная нагрузка',
    noCourses: 'Пока нет записей на курсы.',
  },
  en: {
    eyebrow: 'Student space',
    title: 'My courses',
    description: 'Current workload, upcoming starts, and your personal learning path.',
    enrolled: 'Enrolled',
    plannedWeeks: 'Planned weeks',
    certificatesTrack: 'Certificates track',
    active: 'Active',
    idle: 'Idle',
    freeLoad: 'Free load',
    noCourses: 'No active enrollments yet.',
  },
} as const;

export function MyCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const { user } = useAuth();
  const { language } = useI18n();
  const text = copy[language];

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
        eyebrow={text.eyebrow}
        title={text.title}
        description={text.description}
      />

      <section className="stats-grid">
        <article className="stat-card">
          <span>{text.enrolled}</span>
          <strong>{courses.length}</strong>
        </article>
        <article className="stat-card">
          <span>{text.plannedWeeks}</span>
          <strong>{workload}</strong>
        </article>
        <article className="stat-card">
          <span>{text.certificatesTrack}</span>
          <strong>{courses.length > 0 ? text.active : text.idle}</strong>
        </article>
        <article className="stat-card">
          <span>{text.freeLoad}</span>
          <strong>{courses.filter((course) => course.price === 0).length}</strong>
        </article>
      </section>

      <section className="timeline-card">
        {courses.length === 0 ? (
          <p className="muted">{text.noCourses}</p>
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
