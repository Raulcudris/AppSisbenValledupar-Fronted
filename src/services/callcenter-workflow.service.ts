
import { apiRequest } from '@/lib/apiClient';
import {
  CallCenterGestionLlamadaRequest,
  CallCenterGestionLlamadaResponse,
  CallCenterPageResponse,
  CallCenterResultadoLlamadaResponse,
  CallCenterVisitaAsignacionRequest,
  CallCenterVisitaResponse,
  CallCenterVisitaResultadoRequest,
} from '@/types/callcenter-workflow.types';

/**
 * Extrae el contenido útil de la respuesta estándar ApiResponse<T>.
 *
 * El backend normalmente responde con `{ data: T }`, pero esta función
 * también tolera respuestas directas para facilitar pruebas.
 */
function unwrapApiResponse<T>(response: unknown): T {
  if (
    response &&
    typeof response === 'object' &&
    'data' in response
  ) {
    return (response as { data: T }).data;
  }

  return response as T;
}

/**
 * Consulta el catálogo de resultados de llamada del módulo Call Center.
 */
export async function getCallCenterResultadosLlamada(): Promise<CallCenterResultadoLlamadaResponse[]> {
  const response = await apiRequest('/api/callcenter/catalogs/resultados-llamada');

  return unwrapApiResponse<CallCenterResultadoLlamadaResponse[]>(response);
}

/**
 * Consulta las gestiones de llamada de un caso maestro de Call Center.
 *
 * @param callCenterRegistroId identificador del caso maestro.
 */
export async function getCallCenterLlamadas(
  callCenterRegistroId: number | string,
): Promise<CallCenterGestionLlamadaResponse[]> {
  const response = await apiRequest(`/api/callcenter/${callCenterRegistroId}/llamadas`);

  return unwrapApiResponse<CallCenterGestionLlamadaResponse[]>(response);
}

/**
 * Registra una gestión de llamada sobre un caso maestro.
 *
 * @param callCenterRegistroId identificador del caso maestro.
 * @param request payload de llamada.
 */
export async function registrarCallCenterLlamada(
  callCenterRegistroId: number | string,
  request: CallCenterGestionLlamadaRequest,
): Promise<CallCenterGestionLlamadaResponse> {
  const response = await apiRequest(`/api/callcenter/${callCenterRegistroId}/llamadas`, {
    method: 'POST',
    body: request,
  });

  return unwrapApiResponse<CallCenterGestionLlamadaResponse>(response);
}

/**
 * Consulta las visitas registradas para un caso maestro.
 *
 * @param callCenterRegistroId identificador del caso maestro.
 */
export async function getCallCenterVisitas(
  callCenterRegistroId: number | string,
): Promise<CallCenterVisitaResponse[]> {
  const response = await apiRequest(`/api/callcenter/${callCenterRegistroId}/visitas`);

  return unwrapApiResponse<CallCenterVisitaResponse[]>(response);
}

/**
 * Asigna una visita de campo a un encuestador.
 *
 * @param callCenterRegistroId identificador del caso maestro.
 * @param request payload de asignación de visita.
 */
export async function asignarCallCenterVisita(
  callCenterRegistroId: number | string,
  request: CallCenterVisitaAsignacionRequest,
): Promise<CallCenterVisitaResponse> {
  const response = await apiRequest(`/api/callcenter/${callCenterRegistroId}/visitas`, {
    method: 'POST',
    body: request,
  });

  return unwrapApiResponse<CallCenterVisitaResponse>(response);
}

/**
 * Consulta las visitas asignadas al encuestador autenticado o visibles para
 * perfiles administrativos.
 *
 * @param page página solicitada.
 * @param size tamaño de página.
 */
export async function getMisCallCenterVisitas(
  page = 0,
  size = 20,
): Promise<CallCenterPageResponse<CallCenterVisitaResponse>> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  });

  const response = await apiRequest(`/api/callcenter/visitas/mis-asignaciones?${params.toString()}`);

  return unwrapApiResponse<CallCenterPageResponse<CallCenterVisitaResponse>>(response);
}

/**
 * Actualiza el resultado de una visita de Call Center.
 *
 * @param visitaId identificador de la visita.
 * @param request payload de resultado.
 */
export async function actualizarCallCenterResultadoVisita(
  visitaId: number | string,
  request: CallCenterVisitaResultadoRequest,
): Promise<CallCenterVisitaResponse> {
  const response = await apiRequest(`/api/callcenter/visitas/${visitaId}/resultado`, {
    method: 'PATCH',
    body: request,
  });

  return unwrapApiResponse<CallCenterVisitaResponse>(response);
}
