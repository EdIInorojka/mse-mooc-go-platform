import { useEffect, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { fetchDashboardMetrics } from '../../api/services/users';
import type { DashboardMetrics } from '../../types/models';

export function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);

  useEffect(() => {
    void fetchDashboardMetrics().then(setMetrics);
  }, []);

  return (
    <div className="stack-xl">
      <PageIntro
        eyebrow="Admin space"
        title="Operations dashboard"
        description="Ключевые показатели платформы, динамика ролей и состояние образовательного каталога."
      />

      <section className="stats-grid">
        <article className="stat-card stat-card--highlight">
          <span>Active students</span>
          <strong>{metrics?.activeStudents ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span>Active teachers</span>
          <strong>{metrics?.activeTeachers ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span>Active courses</span>
          <strong>{metrics?.activeCourses ?? 0}</strong>
        </article>
        <article className="stat-card">
          <span>Completion rate</span>
          <strong>{metrics?.completionRate ?? 0}%</strong>
        </article>
      </section>

      <section className="two-column-grid">
        <article className="detail-card">
          <h3>Operational focus</h3>
          <ul className="detail-list">
            <li>Track self-registration separately for students and teachers</li>
            <li>Review teacher-created courses before broad publication</li>
            <li>Monitor invite-link usage and grading activity through the gateway</li>
          </ul>
        </article>
        <article className="detail-card detail-card--accent">
          <h3>Platform signals</h3>
          <p>
            Контур готов для подключения Kafka-событий по регистрациям, созданию курсов,
            групп и публикации оценок.
          </p>
        </article>
      </section>
    </div>
  );
}

