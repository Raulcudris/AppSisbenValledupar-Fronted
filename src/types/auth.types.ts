export type AuthUserResponse = {
  id: number;
  username: string;
  nombres: string;
  apellidos: string;
  rolCodigo: string;
  rolNombre: string;
};

export type LoginResponse = {
  token: string;
  tokenType: string;
  user: AuthUserResponse;
};
