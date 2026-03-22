import { useEffect, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { fetchDashboardMetrics } from '../../api/services/users';
import { useI18n } from '../../i18n/I18nContext';
import type { DashboardMetrics } from '../../types/models';

const copy = {
  ru: {
    eyebrow: 'Пространство администратора',
    title: 'Операционный дашборд',
    description: 'Ключевые показатели платформы, динамика ролей и состояние образовательного каталога.',
    activeStudents: 'Активные студенты',
    activeTeachers: 'Активные преподаватели',
    activeCourses: 'Активные курсы',
    completionRate: 'Процент завершения',
    operationalFocus: 'Фокус операций',
    focus1: 'Отслеживать само-регистрацию студентов и преподавателей отдельно',
    focus2: 'Проверять курсы преподавателей перед широкой публикацией',
    focus3: 'Мониторить использование invite-ссылок и динамику выставления оценок',
    platformSignals: 'Сигналы платформы',
    platformSignalsDesc:
      'Контур готов к подключению Kafka-событий по регистрациям, созданию курсов, групп и публикации оценок.',
  },
  en: {
    eyebrow: 'Admin space',
    title: 'Operations dashboard',
    description: 'Core platform metrics, role dynamics, and learning catalog status.',
    activeStudents: 'Active students',
    activeTeachers: 'Active teachers',
    activeCourses: 'Active courses',
    completionRate: 'Completion rate',
    operationalFocus: 'Operational focus',
    focus1: 'Track self-registration separately for students and teachers',
    focus2: 'Review teacher-created courses before broad publication',
    focus3: 'Monitor invite-link usage and grading activity',
    platformSignals: 'Platform signals',
    platformSignalsDesc:
      'The stack is ready to connect Kafka events for registrations, course creation, group management, and grade publishing.',
  },
} as const;

export function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const { language } = useI18n();
  const text = copy[language];

  useEffect(() => {
    void fetchDashboardMetrics().then(setMetrics);
  }, []);

  return (
    <div className="stack-xl">
      <PageIntro
        eyebrow={text.eyebrow}
        title={text.title}
        description={text.description}
      />

      <section className="stats-grid">
        <article className="stat-card stat-card--highlight">
          <span>{text.activeStudents}</span>
          <strong>{metrics?.activeStudents ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span>{text.activeTeachers}</span>
          <strong>{metrics?.activeTeachers ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span>{text.activeCourses}</span>
          <strong>{metrics?.activeCourses ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span>{text.completionRate}</span>
          <strong>{metrics?.completionRate ?? 0}%</strong>
        </article>
      </section>

      <section className="two-column-grid">
        <article className="detail-card">
          <h3>{text.operationalFocus}</h3>
          <ul className="detail-list">
            <li>{text.focus1}</li>
            <li>{text.focus2}</li>
            <li>{text.focus3}</li>
          </ul>
        </article>
        <article className="detail-card detail-card--accent">
          <h3>{text.platformSignals}</h3>
          <p>{text.platformSignalsDesc}</p>
        </article>
      </section>
    </div>
  );
}
