import { apiRequest } from '@/lib/apiClient';
import { ApiResponse, PageResponse } from '@/types/api.types';
import {
  ChangePasswordRequest,
  PublicChangePasswordRequest,
  ResetPasswordRequest,
  RoleOptionResponse,
  UserCreateRequest,
  UserResponse,
  UserUpdateRequest,
} from '@/types/user-management.types';

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  });

  const queryString = query.toString();

  return queryString ? `?${queryString}` : '';
}

export async function getUsers(page = 0, size = 20) {
  const response = await apiRequest<ApiResponse<PageResponse<UserResponse>>>(
    `/api/users${buildQuery({ page, size })}`
  );

  return response.data;
}

export async function getUserRoles() {
  const response = await apiRequest<ApiResponse<RoleOptionResponse[]>>('/api/users/roles');

  return response.data;
}

export async function createUser(request: UserCreateRequest) {
  const response = await apiRequest<ApiResponse<UserResponse>>('/api/users', {
    method: 'POST',
    body: request,
  });

  return response.data;
}

export async function updateUser(id: number, request: UserUpdateRequest) {
  const response = await apiRequest<ApiResponse<UserResponse>>(`/api/users/${id}`, {
    method: 'PUT',
    body: request,
  });

  return response.data;
}

export async function activateUser(id: number) {
  const response = await apiRequest<ApiResponse<UserResponse>>(`/api/users/${id}/activar`, {
    method: 'PATCH',
  });

  return response.data;
}

export async function inactivateUser(id: number) {
  const response = await apiRequest<ApiResponse<UserResponse>>(`/api/users/${id}/inactivar`, {
    method: 'PATCH',
  });

  return response.data;
}

export async function resetUserPassword(id: number, request: ResetPasswordRequest) {
  await apiRequest<ApiResponse<string>>(`/api/users/${id}/reset-password`, {
    method: 'PATCH',
    body: request,
  });
}

export async function changeOwnPassword(request: ChangePasswordRequest) {
  await apiRequest<ApiResponse<string>>('/api/users/change-password', {
    method: 'PATCH',
    body: request,
  });
}

export async function changePasswordFromLogin(request: PublicChangePasswordRequest) {
  await apiRequest<ApiResponse<string>>('/api/users/public/change-password', {
    method: 'POST',
    body: request,
    skipAuth: true,
  });
}