import { apiClient } from '../client';
import { mockCourses } from '../mock';
import type { Course } from '../../types/models';

interface BackendCourse {
  id: number | string;
  title: string;
  description: string;
  provider?: string;
  category?: string;
  delivery_format?: string;
  audience?: Course['audience'];
  source_type?: Course['sourceType'];
  external_url?: string;
  subject_tags?: string;
  material_links?: string;
  language: string;
  price: number;
  credits?: number;
  reviews: number;
  seats_left?: number;
  duration_weeks?: number;
  start_date?: string;
  end_date?: string;
}

interface Enrollment {
  id: number;
  course_id: number | string;
  status: string;
}

function parseSubjects(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function detectKind(title: string): 'video' | 'lecture' | 'material' {
  const normalized = title.toLowerCase();
  if (normalized.includes('video') || normalized.includes('lecture recording')) {
    return 'video';
  }
  if (normalized.includes('lecture') || normalized.includes('seminar') || normalized.includes('slides')) {
    return 'lecture';
  }
  return 'material';
}

function parseMaterialLinks(value: string | undefined): Course['materialLinks'] {
  const rows = (value ?? '')
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);

  return rows
    .map((row) => {
      const [titlePart, urlPart] = row.split('|');
      const title = (titlePart ?? '').trim();
      const url = (urlPart ?? '').trim();
      if (!title || !url) {
        return null;
      }
      return { title, url, kind: detectKind(title) };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function mapCourse(course: BackendCourse, enrollmentStatus: Course['enrollmentStatus']): Course {
  const sourceType = (course.source_type ?? 'internal') === 'external' ? 'external' : 'internal';

  return {
    id: String(course.id),
    title: course.title,
    provider: course.provider ?? 'MSE-MOOC',
    category: course.category ?? 'General',
    deliveryFormat: course.delivery_format ?? 'online',
    language: course.language || 'ru',
    durationWeeks: course.duration_weeks ?? 8,
    price: course.price ?? 0,
    credits: course.credits ?? 0,
    rating: course.reviews ?? 0,
    seatsLeft: course.seats_left ?? 100,
    startDate: course.start_date ?? 'TBD',
    endDate: course.end_date ?? 'TBD',
    description: course.description || 'No description yet',
    subjects: parseSubjects(course.subject_tags),
    sourceType,
    externalUrl: sourceType === 'external' ? (course.external_url ?? '') : '',
    materialLinks: parseMaterialLinks(course.material_links),
    enrollmentStatus,
    audience: course.audience ?? 'mixed',
  };
}

async function fetchEnrollmentCourseIds(userId: string): Promise<Set<string>> {
  try {
    const enrollmentsResponse = await apiClient.get<Enrollment[]>(`/users/${userId}/enrollments`);
    return new Set(
      enrollmentsResponse.data
        .filter((item) => item.status === 'active')
        .map((item) => String(item.course_id)),
    );
  } catch {
    return new Set(
      mockCourses
        .filter((course) => course.enrollmentStatus === 'enrolled')
        .map((course) => course.id),
    );
  }
}

export async function fetchCourses(userId?: string): Promise<Course[]> {
  try {
    const [courseResponse, enrolledIds] = await Promise.all([
      apiClient.get<BackendCourse[]>('/courses'),
      userId ? fetchEnrollmentCourseIds(userId) : Promise.resolve(new Set<string>()),
    ]);

    return courseResponse.data.map((course) =>
      mapCourse(course, enrolledIds.has(String(course.id)) ? 'enrolled' : 'open'),
    );
  } catch {
    return mockCourses;
  }
}

export async function fetchCourseById(id: string, userId?: string): Promise<Course | null> {
  try {
    const [courseResponse, enrolledIds] = await Promise.all([
      apiClient.get<BackendCourse>(`/courses/${id}`),
      userId ? fetchEnrollmentCourseIds(userId) : Promise.resolve(new Set<string>()),
    ]);

    const status: Course['enrollmentStatus'] = enrolledIds.has(String(id)) ? 'enrolled' : 'open';
    return mapCourse(courseResponse.data, status);
  } catch {
    const fallback = mockCourses.find((course) => course.id === id);
    return fallback ?? null;
  }
}

export async function enrollInCourse(courseId: string): Promise<void> {
  const parsedId = Number(courseId);
  if (Number.isNaN(parsedId)) {
    throw new Error('invalid course id');
  }
  await apiClient.post('/enrollments', { course_id: parsedId });
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
  void userId;
  try {
    const response = await apiClient.get<BackendCourse[]>('/courses/mine');
    return response.data.map((course) => mapCourse(course, 'open'));
  } catch {
    return mockCourses.filter((course) => course.audience !== 'student');
  }
}

export interface CreateCoursePayload {
  title: string;
  description: string;
  provider: string;
  category: string;
  deliveryFormat: string;
  audience: Course['audience'];
  sourceType: Course['sourceType'];
  externalUrl: string;
  subjectTags: string;
  materialLinks: string;
  language: string;
  price: number;
  credits: number;
  seatsLeft: number;
  durationWeeks: number;
  startDate: string;
  endDate: string;
}

export async function createCourse(payload: CreateCoursePayload): Promise<Course> {
  const response = await apiClient.post<BackendCourse>('/courses', {
    title: payload.title,
    description: payload.description,
    provider: payload.provider,
    category: payload.category,
    delivery_format: payload.deliveryFormat,
    audience: payload.audience,
    source_type: payload.sourceType,
    external_url: payload.externalUrl,
    subject_tags: payload.subjectTags,
    material_links: payload.materialLinks,
    language: payload.language,
    price: payload.price,
    credits: payload.credits,
    reviews: 0,
    seats_left: payload.seatsLeft,
    duration_weeks: payload.durationWeeks,
    certificated: true,
    is_certificate_paid: false,
    start_date: new Date(payload.startDate).toISOString(),
    end_date: new Date(payload.endDate).toISOString(),
  });
  return mapCourse(response.data, 'open');
}
