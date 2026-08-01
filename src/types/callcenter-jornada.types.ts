import type { CallCenterResponse } from './callcenter.types';
import type { CallCenterVisitaResponse } from './callcenter-workflow.types';

/**
 * Solicitud para incorporar un ciudadano de última hora
 * a una jornada de encuestas.
 *
 * El backend crea el caso maestro, asigna funcionario
 * Call Center y programa la visita en una sola transacción.
 */
export type CallCenterUltimaHoraRequest = {
  fechaCaso: string;
  ventanillaRegistroId?: number | null;
  cedulaSolicitante: string;
  nombreCompleto: string;
  telefono?: string | null;
  direccionTexto: string;
  barrioId?: number | null;
  funcionarioCallcenterId: number;
  encuestadorId: number;
  fechaProgramada: string;
  horaProgramada?: string | null;
  observacion?: string | null;
};

/**
 * Resultado consolidado del registro de última hora.
 */
export type CallCenterUltimaHoraResponse = {
  registro: CallCenterResponse;
  visita: CallCenterVisitaResponse;
};