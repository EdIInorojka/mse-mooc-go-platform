import { useEffect, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { fetchCourses } from '../../api/services/courses';
import { useI18n } from '../../i18n/I18nContext';
import { audienceLabel, enrollmentStatusLabel, localeFor } from '../../i18n/format';
import type { Course } from '../../types/models';

const copy = {
  ru: {
    eyebrow: 'Пространство администратора',
    title: 'Управление курсами',
    description: 'Модерация каталога и контроль доступности образовательных программ.',
    reviewQueue: 'Очередь на ревью',
    course: 'Курс',
    audience: 'Аудитория',
    status: 'Статус',
    price: 'Цена',
    rating: 'Рейтинг',
    free: 'Бесплатно',
  },
  en: {
    eyebrow: 'Admin space',
    title: 'Course management',
    description: 'Catalog moderation and course availability control.',
    reviewQueue: 'Review queue',
    course: 'Course',
    audience: 'Audience',
    status: 'Status',
    price: 'Price',
    rating: 'Rating',
    free: 'Free',
  },
} as const;

export function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const { language } = useI18n();
  const text = copy[language];
  const locale = localeFor(language);

  useEffect(() => {
    void fetchCourses().then(setCourses);
  }, []);

  return (
    <div className="stack-xl">
      <PageIntro
        eyebrow={text.eyebrow}
        title={text.title}
        description={text.description}
        actions={<button className="primary-button">{text.reviewQueue}</button>}
      />

      <section className="table-card">
        <table>
          <thead>
            <tr>
              <th>{text.course}</th>
              <th>{text.audience}</th>
              <th>{text.status}</th>
              <th>{text.price}</th>
              <th>{text.rating}</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id}>
                <td>
                  <strong>{course.title}</strong>
                  <div className="muted">{course.category}</div>
                </td>
                <td><span className="pill pill--role">{audienceLabel(course.audience, language)}</span></td>
                <td>
                  <span className={`pill pill--${course.enrollmentStatus}`}>{enrollmentStatusLabel(course.enrollmentStatus, language)}</span>
                </td>
                <td>{course.price === 0 ? text.free : `${course.price.toLocaleString(locale)} RUB`}</td>
                <td>{course.rating.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
