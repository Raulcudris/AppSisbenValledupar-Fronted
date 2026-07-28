import type {
  CallCenterEstadoCaso as BaseCallCenterEstadoCaso,
  CallCenterTipoSolicitud,
  EstadoVisita,
} from './callcenter.types';

/**
 * Estado formal del caso Call Center.
 *
 * Se reutiliza desde callcenter.types.ts para evitar duplicidad
 * y mantener una sola definición técnica del flujo.
 */
export type CallCenterEstadoCaso = BaseCallCenterEstadoCaso;

/**
 * Estado operativo de una visita Call Center.
 *
 * Se reutiliza desde callcenter.types.ts para mantener consistencia
 * entre el caso maestro y las visitas asignadas.
 */
export type CallCenterEstadoVisita = EstadoVisita;

/**
 * Códigos permitidos para resultados de llamada.
 *
 * Estos códigos representan los posibles resultados operativos que puede
 * registrar el funcionario Call Center durante la gestión telefónica.
 */
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
 *
 * Este catálogo alimenta el selector de resultados cuando el funcionario
 * Call Center registra una nueva gestión telefónica.
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
 *
 * Este payload se envía desde la pantalla de gestión del caso:
 * `/dashboard/callcenter/mis-registros/[id]`.
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
 *
 * Representa cada intento de contacto realizado sobre un caso Call Center.
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
 *
 * Esta acción se ejecuta desde la gestión del caso después de la llamada,
 * cuando el ciudadano requiere o acepta visita.
 */
export type CallCenterVisitaAsignacionRequest = {
  encuestadorId: number;
  fechaProgramada?: string | null;
  horaProgramada?: string | null;
  observacion?: string | null;
};

/**
 * Solicitud para actualizar el resultado de una visita.
 *
 * Este payload es utilizado por el FUNCIONARIO_ENCUESTADOR desde la vista:
 * `/dashboard/callcenter/mis-asignaciones`.
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
 *
 * Representa una visita asignada a un encuestador, con su programación
 * y resultado operativo de campo.
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

  /**
   * Datos opcionales del ciudadano asociados al caso.
   *
   * Estos campos son opcionales porque dependen de si el backend los incluye
   * en el DTO de visita.
   */
  cedulaSolicitante?: string | null;
  nombreCompleto?: string | null;
  telefono?: string | null;
  direccionTexto?: string | null;
  barrioNombre?: string | null;
  comunaNombre?: string | null;
  tipoSolicitudCallcenter?: CallCenterTipoSolicitud | string | null;
  estadoCaso?: CallCenterEstadoCaso | string | null;
};

/**
 * Opción simple para selects de catálogos.
 *
 * Se conserva para compatibilidad con componentes que aún usen este tipo.
 */
export type CallCenterSelectOption = {
  id: number;
  label: string;
};

/**
 * Respuesta paginada genérica compatible con PageResponse del backend.
 *
 * Se aceptan varias formas porque algunos servicios pueden responder como
 * `content`, `items` o `data`, según el endpoint.
 */
export type CallCenterPageResponse<T> = {
  content?: T[];
  items?: T[];
  data?: T[];
  totalElements?: number;
  totalItems?: number;
  total?: number;
  totalRecords?: number;
  totalPages?: number;
  page?: number;
  size?: number;
};