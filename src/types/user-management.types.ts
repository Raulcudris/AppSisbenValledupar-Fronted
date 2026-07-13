export type UserResponse = {
  id: number;
  username: string;
  documento: string | null;
  nombres: string;
  apellidos: string | null;
  email: string | null;
  telefono: string | null;
  activo: boolean;
  rolCodigo: string;
  rolNombre: string;
};

export type RoleOptionResponse = {
  id: number;
  codigo: string;
  nombre: string;
};

export type UserCreateRequest = {
  username: string;
  password: string;
  confirmPassword: string;
  documento?: string;
  nombres: string;
  apellidos?: string;
  email?: string;
  telefono?: string;
  activo: boolean;
  rolCodigo: string;
};

export type UserUpdateRequest = {
  username: string;
  documento?: string;
  nombres: string;
  apellidos?: string;
  email?: string;
  telefono?: string;
  activo: boolean;
  rolCodigo: string;
};

export type ResetPasswordRequest = {
  newPassword: string;
  confirmPassword: string;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type PublicChangePasswordRequest = {
  username: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};