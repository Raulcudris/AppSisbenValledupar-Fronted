import { apiRequest } from '@/lib/apiClient';
import { setStoredUser, setToken } from '@/lib/authToken';
import { ApiResponse } from '@/types/api.types';
import { AuthUserResponse, LoginResponse } from '@/types/auth.types';

export async function login(username: string, password: string) {
  const response = await apiRequest<ApiResponse<LoginResponse>>('/api/auth/login', {
    method: 'POST',
    body: { username, password },
    skipAuth: true,
  });

  setToken(response.data.token);
  setStoredUser(response.data.user);

  return response.data;
}

export async function me() {
  const response = await apiRequest<ApiResponse<AuthUserResponse>>('/api/auth/me');

  setStoredUser(response.data);

  return response.data;
}