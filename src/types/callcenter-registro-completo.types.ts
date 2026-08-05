import type {
  CallCenterOrigenRegistro,
  CallCenterResponse,
  CallCenterTipoSolicitud,
} from './callcenter.types';

import type {
  CallCenterGestionLlamadaResponse,
  CallCenterResultadoLlamadaCodigo,
  CallCenterVisitaResponse,
} from './callcenter-workflow.types';

/**
 * Datos generales del caso maestro.
 *
 * No incluye funcionario Call Center porque el responsable
 * se obtiene desde el usuario autenticado en backend.
 */
export type CallCenterRegistroCompletoCasoRequest = {
  fechaLlamada: string;
  horaLlamada?: string | null;

  origenRegistro: CallCenterOrigenRegistro;
  ventanillaRegistroId?: number | null;

  cedulaSolicitante: string;
  nombreCompleto: string;
  telefono?: string | null;

  direccionTexto: string;
  barrioId?: number | null;

  tipoSolicitudCallcenter:
    | CallCenterTipoSolicitud
    | string;

  observacion?: string | null;
};

/**
 * Información de la gestión telefónica que forma parte
 * del registro completo.
 */
export type CallCenterRegistroCompletoLlamadaRequest = {
  fechaLlamada: string;
  horaLlamada: string;

  llamadaConectada: boolean;

  resultadoLlamada:
    | CallCenterResultadoLlamadaCodigo
    | string;

  motivoNoContactoId?: number | null;
  motivoNoDisposicionId?: number | null;

  fechaReprogramacionLlamada?: string | null;
  horaReprogramacionLlamada?: string | null;

  solicitoNuevaEncuesta?: boolean | null;
  direccionTexto?: string | null;

  fechaAplicacionInformada?: string | null;

  disposicionRecibirEncuesta?: boolean | null;

  explicoInformanteCalificado?: boolean | null;

  observacion?: string | null;
};

/**
 * Encuestador y programación de la visita.
 */
export type CallCenterRegistroCompletoVisitaRequest = {
  encuestadorId: number;
  fechaProgramada: string;
  horaProgramada: string;
  observacion?: string | null;
};

/**
 * Payload completo utilizado tanto para creación
 * como para actualización.
 */
export type CallCenterRegistroCompletoRequest = {
  registro: CallCenterRegistroCompletoCasoRequest;
  llamada: CallCenterRegistroCompletoLlamadaRequest;
  visita: CallCenterRegistroCompletoVisitaRequest;
};

/**
 * Resultado del agregado completo.
 */
export type CallCenterRegistroCompletoResponse = {
  registro: CallCenterResponse;
  llamada: CallCenterGestionLlamadaResponse;
  visita: CallCenterVisitaResponse;
};