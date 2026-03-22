import { apiClient } from '../client';
import { mockMetrics, mockUsers } from '../mock';
import type { DashboardMetrics, PlatformUser } from '../../types/models';

export async function fetchUsers(): Promise<PlatformUser[]> {
  try {
    const response = await apiClient.get<PlatformUser[]>('/admin/users');
    return response.data;
  } catch {
    return mockUsers;
  }
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    const response = await apiClient.get<DashboardMetrics>('/admin/metrics');
    return response.data;
  } catch {
    return mockMetrics;
  }
}

