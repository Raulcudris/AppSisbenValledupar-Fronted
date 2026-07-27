/**
 * Tipos frontend para el flujo formal del módulo Call Center.
 *
 * Este archivo modela las respuestas y solicitudes usadas por los endpoints:
 * - resultados de llamada
 * - gestiones de llamada
 * - visitas de encuestadores
 */

export type CallCenterEstadoCaso =
  | 'PENDIENTE_ENRUTAMIENTO'
  | 'ASIGNADO_CALLCENTER'
  | 'EN_GESTION_LLAMADA'
  | 'NO_CONTACTADO'
  | 'CONTACTADO_SIN_DISPOSICION'
  | 'PENDIENTE_ASIGNAR_ENCUESTADOR'
  | 'ASIGNADO_ENCUESTADOR'
  | 'VISITA_PROGRAMADA'
  | 'VISITA_REALIZADA'
  | 'VISITA_NO_ATENDIDA'
  | 'REPROGRAMADO'
  | 'CERRADO'
  | 'CANCELADO';

export type CallCenterEstadoVisita =
  | 'PENDIENTE'
  | 'PROGRAMADA'
  | 'REALIZADA'
  | 'NO_ATENDIDA'
  | 'REPROGRAMADA'
  | 'CANCELADA';

export type CallCenterResultadoLlamadaCodigo =
  | 'NO_CONTESTA'
  | 'BUZON'
  | 'CORREO_VOZ'
  | 'TELEFONO_APAGADO'
  | 'FUERA_SERVICIO'
  | 'NUMERO_EQUIVOCADO'
  | 'CONTACTADO_ACEPTA_VISITA'
  | 'CONTACTADO_NO_ACEPTA_VISITA'
  | 'REPROGRAMAR_LLAMADA'
  | 'CERRADO_TELEFONICAMENTE'
  | string;

/**
 * Respuesta del catálogo de resultados de llamada.
 */
export type CallCenterResultadoLlamadaResponse = {
  id: number;
  codigo: CallCenterResultadoLlamadaCodigo;
  nombre: string;
  descripcion?: string | null;
  estadoCasoSugerido?: CallCenterEstadoCaso | string | null;
  activo: boolean;
};

/**
 * Solicitud para registrar una gestión de llamada.
 */
export type CallCenterGestionLlamadaRequest = {
  fechaLlamada?: string | null;
  horaLlamada?: string | null;
  llamadaConectada: boolean;
  resultadoLlamada: string;
  motivoNoContactoId?: number | null;
  motivoNoDisposicionId?: number | null;
  fechaReprogramacionLlamada?: string | null;
  horaReprogramacionLlamada?: string | null;
  observacion?: string | null;
};

/**
 * Respuesta de una gestión de llamada registrada.
 */
export type CallCenterGestionLlamadaResponse = {
  id: number;
  callCenterRegistroId: number;
  funcionarioCallcenterId?: number | null;
  funcionarioCallcenterUsername?: string | null;
  funcionarioCallcenterNombre?: string | null;
  fechaLlamada: string;
  horaLlamada?: string | null;
  intentoNumero: number;
  llamadaConectada: boolean;
  resultadoLlamada: string;
  motivoNoContactoId?: number | null;
  motivoNoContactoNombre?: string | null;
  motivoNoDisposicionId?: number | null;
  motivoNoDisposicionNombre?: string | null;
  fechaReprogramacionLlamada?: string | null;
  horaReprogramacionLlamada?: string | null;
  observacion?: string | null;
  activo: boolean;
  creadoEn?: string | null;
};

/**
 * Solicitud para asignar visita a encuestador.
 */
export type CallCenterVisitaAsignacionRequest = {
  encuestadorId: number;
  fechaProgramada?: string | null;
  horaProgramada?: string | null;
  observacion?: string | null;
};

/**
 * Solicitud para actualizar resultado de visita.
 */
export type CallCenterVisitaResultadoRequest = {
  estadoVisita: CallCenterEstadoVisita;
  fechaVisitaReal?: string | null;
  horaVisitaReal?: string | null;
  encuestaRealizada?: boolean | null;
  motivoNoEncuesta?: string | null;
  fechaReprogramacion?: string | null;
  observacionEncuestador?: string | null;
};

/**
 * Respuesta de visita de Call Center.
 */
export type CallCenterVisitaResponse = {
  id: number;
  callCenterRegistroId: number;
  encuestadorId: number;
  encuestadorNombre?: string | null;
  usuarioAsignaId?: number | null;
  usuarioAsignaUsername?: string | null;
  fechaAsignacion?: string | null;
  fechaProgramada?: string | null;
  horaProgramada?: string | null;
  estadoVisita: CallCenterEstadoVisita | string;
  fechaVisitaReal?: string | null;
  horaVisitaReal?: string | null;
  encuestaRealizada?: boolean | null;
  motivoNoEncuesta?: string | null;
  fechaReprogramacion?: string | null;
  observacionEncuestador?: string | null;
  activo: boolean;
  creadoEn?: string | null;
};

/**
 * Opción simple para selects de catálogos.
 */
export type CallCenterSelectOption = {
  id: number;
  label: string;
};

/**
 * Respuesta paginada genérica compatible con PageResponse del backend.
 */
export type CallCenterPageResponse<T> = {
  content?: T[];
  items?: T[];
  data?: T[];
  totalElements?: number;
  totalItems?: number;
  total?: number;
  totalPages?: number;
  page?: number;
  size?: number;
};
