import { apiClient } from '../client';
import { mockCourses } from '../mock';
import type { Course } from '../../types/models';

interface BackendCourse {
  id: number | string;
  title: string;
  description: string;
  language: string;
  price: number;
  reviews: number;
  start_date?: string;
  provider?: string;
  category?: string;
  duration_weeks?: number;
  seats_left?: number;
  audience?: Course['audience'];
}

interface Enrollment {
  id: number;
  course_id: number | string;
  status: string;
}

function mapCourse(course: BackendCourse, enrollmentStatus: Course['enrollmentStatus']): Course {
  return {
    id: String(course.id),
    title: course.title,
    provider: course.provider ?? 'MSE-MOOC',
    category: course.category ?? 'General',
    language: course.language || 'ru',
    durationWeeks: course.duration_weeks ?? 8,
    price: course.price ?? 0,
    rating: course.reviews ?? 0,
    seatsLeft: course.seats_left ?? 100,
    startDate: course.start_date ?? 'TBD',
    description: course.description || 'No description yet',
    enrollmentStatus,
    audience: course.audience ?? 'mixed',
  };
}

export async function fetchCourses(): Promise<Course[]> {
  try {
    const response = await apiClient.get<BackendCourse[]>('/courses');
    return response.data.map((course) => mapCourse(course, 'open'));
  } catch {
    return mockCourses;
  }
}

export async function fetchMyCourses(userId: string): Promise<Course[]> {
  try {
    const enrollmentsResponse = await apiClient.get<Enrollment[]>(`/users/${userId}/enrollments`);
    const active = enrollmentsResponse.data.filter((item) => item.status === 'active');

    const courses = await Promise.all(
      active.map(async (enrollment) => {
        const response = await apiClient.get<BackendCourse>(`/courses/${enrollment.course_id}`);
        return mapCourse(response.data, 'enrolled');
      }),
    );

    return courses;
  } catch {
    return mockCourses.filter((course) => course.enrollmentStatus === 'enrolled');
  }
}

export async function fetchTeacherCourses(userId: string): Promise<Course[]> {
  try {
    const response = await apiClient.get<BackendCourse[]>(`/teacher/${userId}/courses`);
    return response.data.map((course) => mapCourse(course, 'open'));
  } catch {
    return mockCourses.filter((course) => course.audience !== 'student');
  }
}

