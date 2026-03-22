export type Role = 'student' | 'teacher' | 'teacher_assistant' | 'admin';

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

export interface LoginCredentials {
  email: string;
  password: string;
  role: Role;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  role: Extract<Role, 'student' | 'teacher'>;
}

export interface Course {
  id: string;
  title: string;
  provider: string;
  category: string;
  deliveryFormat: string;
  language: string;
  durationWeeks: number;
  price: number;
  credits: number;
  rating: number;
  seatsLeft: number;
  startDate: string;
  endDate: string;
  description: string;
  subjects: string[];
  sourceType: 'internal' | 'external';
  externalUrl: string;
  materialLinks: Array<{
    title: string;
    url: string;
    kind: 'video' | 'lecture' | 'material';
  }>;
  enrollmentStatus: 'open' | 'enrolled' | 'waitlist';
  audience: 'student' | 'teacher' | 'mixed';
}

export interface UpdateProfilePayload {
  fullName?: string;
  email?: string;
  password?: string;
}

export interface GradeRecord {
  id: string;
  courseId: string;
  courseTitle: string;
  groupId: string;
  groupName: string;
  studentId: string;
  studentName: string;
  score: number;
  maxScore: number;
  assignedAt: string;
  status: 'draft' | 'published';
  feedback: string;
}

export interface GroupInvite {
  id: string;
  token: string;
  inviteUrl: string;
  expiresAt: string;
  usageCount: number;
}

export interface StudentGroupMember {
  id: string;
  fullName: string;
  email: string;
  progress: number;
  averageGrade: number;
}

export interface StudentGroup {
  id: string;
  name: string;
  courseId: string;
  courseTitle: string;
  teacherId: string;
  teacherName: string;
  memberCount: number;
  createdAt: string;
  invite: GroupInvite;
  members: StudentGroupMember[];
}

export interface PlatformUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  status: 'active' | 'invited' | 'blocked';
  enrolledCourses: number;
  lastSeen: string;
}

export interface DashboardMetrics {
  activeStudents: number;
  activeTeachers: number;
  activeCourses: number;
  completionRate: number;
  weeklyEnrollments: number;
}


