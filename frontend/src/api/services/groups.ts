import { apiClient } from '../client';
import { mockGrades, mockGroups } from '../mock';
import type { GradeRecord, StudentGroup } from '../../types/models';

interface CreateGroupPayload {
  name: string;
  courseId: string;
}

interface AssignGradePayload {
  groupId: string;
  studentId: string;
  score: number;
  maxScore: number;
  feedback: string;
}

export async function fetchTeacherGroups(teacherId: string): Promise<StudentGroup[]> {
  try {
    const response = await apiClient.get<StudentGroup[]>(`/teachers/${teacherId}/groups`);
    return response.data;
  } catch {
    return mockGroups;
  }
}

export async function createGroup(payload: CreateGroupPayload): Promise<StudentGroup> {
  try {
    const response = await apiClient.post<StudentGroup>('/groups', payload);
    return response.data;
  } catch {
    const template = mockGroups[0];
    return {
      ...template,
      id: `group-${Date.now()}`,
      name: payload.name,
      courseId: payload.courseId,
      courseTitle: template.courseTitle,
      memberCount: 0,
      members: [],
      invite: {
        ...template.invite,
        id: `invite-${Date.now()}`,
        token: payload.name.replace(/\s+/g, '').toUpperCase(),
        inviteUrl: `https://mse-mooc.local/invite/${payload.name.replace(/\s+/g, '').toUpperCase()}`,
        usageCount: 0,
      },
    };
  }
}

export async function createInvite(groupId: string): Promise<StudentGroup['invite']> {
  try {
    const response = await apiClient.post<StudentGroup['invite']>(`/groups/${groupId}/invites`);
    return response.data;
  } catch {
    const group = mockGroups.find((item) => item.id === groupId) ?? mockGroups[0];
    return group.invite;
  }
}

export async function joinGroupByInvite(token: string): Promise<{ status: string }> {
  try {
    const response = await apiClient.post<{ status: string }>('/groups/join', { token });
    return response.data;
  } catch {
    return { status: `Joined by invite ${token}` };
  }
}

export async function fetchMyGrades(userId: string): Promise<GradeRecord[]> {
  try {
    const response = await apiClient.get<GradeRecord[]>(`/students/${userId}/grades`);
    return response.data;
  } catch {
    return mockGrades.filter((grade) => grade.studentId === userId || userId === 'student-1');
  }
}

export async function fetchTeacherGrades(teacherId: string): Promise<GradeRecord[]> {
  try {
    const response = await apiClient.get<GradeRecord[]>(`/teachers/${teacherId}/grades`);
    return response.data;
  } catch {
    return mockGrades;
  }
}

export async function assignGrade(payload: AssignGradePayload): Promise<GradeRecord> {
  try {
    const response = await apiClient.post<GradeRecord>('/grades', payload);
    return response.data;
  } catch {
    const group = mockGroups.find((item) => item.id === payload.groupId) ?? mockGroups[0];
    const member = group.members.find((item) => item.id === payload.studentId) ?? group.members[0];
    return {
      id: `grade-${Date.now()}`,
      courseId: group.courseId,
      courseTitle: group.courseTitle,
      groupId: group.id,
      groupName: group.name,
      studentId: member?.id ?? payload.studentId,
      studentName: member?.fullName ?? 'New student',
      score: payload.score,
      maxScore: payload.maxScore,
      assignedAt: new Date().toISOString().slice(0, 10),
      status: 'published',
      feedback: payload.feedback,
    };
  }
}

