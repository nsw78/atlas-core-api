import api from './apiClient';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  roles: string[];
  permissions: string[];
  active: boolean;
  mfa_enabled: boolean;
}

export const authApi = {
  login: (data: LoginRequest) => api.post<AuthTokens>('/auth/login', data),
  register: (data: RegisterRequest) => api.post<AuthTokens>('/auth/register', data),
  refresh: (refreshToken: string) => api.post<AuthTokens>('/auth/refresh', { refresh_token: refreshToken }),
  logout: () => api.post('/auth/logout'),
  validate: () => api.get<{ valid: boolean }>('/auth/validate'),
  changePassword: (oldPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { old_password: oldPassword, new_password: newPassword }),
  me: () => api.get<UserProfile>('/users/me'),
};
