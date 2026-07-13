export type AuditLogResponse = {
  id: number;
  usuarioId: number | null;
  username: string | null;
  tablaAfectada: string | null;
  registroId: number | null;
  accion: string;
  fechaAccion: string;
  ipOrigen: string | null;
};

export type AuditFilter = {
  username?: string;
  accion?: string;
  tablaAfectada?: string;
  fechaInicio?: string;
  fechaFin?: string;
  page?: number;
  size?: number;
};
