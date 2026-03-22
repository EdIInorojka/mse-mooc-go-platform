import { useEffect, useState } from 'react';
import { PageIntro } from '../../components/PageIntro';
import { fetchCourses } from '../../api/services/courses';
import type { Course } from '../../types/models';

export function AdminCoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    void fetchCourses().then(setCourses);
  }, []);

  return (
    <div className="stack-xl">
      <PageIntro
        eyebrow="Admin space"
        title="Course management"
        description="Модерация каталога, аудит teacher-created курсов и контроль доступности программ."
        actions={<button className="primary-button">Review queue</button>}
      />

      <section className="table-card">
        <table>
          <thead>
            <tr>
              <th>Course</th>
              <th>Audience</th>
              <th>Status</th>
              <th>Price</th>
              <th>Rating</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((course) => (
              <tr key={course.id}>
                <td>
                  <strong>{course.title}</strong>
                  <div className="muted">{course.category}</div>
                </td>
                <td><span className="pill pill--role">{course.audience}</span></td>
                <td>
                  <span className={`pill pill--${course.enrollmentStatus}`}>{course.enrollmentStatus}</span>
                </td>
                <td>{course.price === 0 ? 'Free' : `${course.price.toLocaleString('ru-RU')} RUB`}</td>
                <td>{course.rating.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

