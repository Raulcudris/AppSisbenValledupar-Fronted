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
 * Valor permitido para construir parámetros de consulta.
 */
type QueryValue = string | number | boolean | undefined | null;

/**
 * Construye una cadena query string omitiendo valores vacíos.
 *
 * @param params parámetros enviados al endpoint.
 * @returns cadena query string.
 */
function toQueryString(params: Record<string, QueryValue>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  });

  const queryString = query.toString();

  return queryString ? `?${queryString}` : '';
}

/**
 * Extrae el contenido útil de una respuesta estándar del backend.
 *
 * El backend suele responder con estructura:
 * `{ data: T }`.
 *
 * Esta función también tolera respuestas directas para evitar errores
 * durante pruebas o ajustes de endpoints.
 *
 * @param response respuesta recibida desde apiRequest.
 * @returns contenido útil de la respuesta.
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
 *
 * Este catálogo alimenta el selector usado al registrar una gestión
 * telefónica dentro del detalle del caso.
 *
 * @returns lista de resultados de llamada activos.
 */
export async function getCallCenterResultadosLlamada(): Promise<CallCenterResultadoLlamadaResponse[]> {
  const response = await apiRequest(
    `/api/callcenter/catalogs/resultados-llamada${toQueryString({
      _t: Date.now(),
    })}`,
  );

  return unwrapApiResponse<CallCenterResultadoLlamadaResponse[]>(response) ?? [];
}

/**
 * Consulta las gestiones de llamada registradas para un caso Call Center.
 *
 * @param callCenterRegistroId identificador del caso maestro.
 * @returns historial de llamadas del caso.
 */
export async function getCallCenterLlamadas(
  callCenterRegistroId: number | string,
): Promise<CallCenterGestionLlamadaResponse[]> {
  const response = await apiRequest(
    `/api/callcenter/${callCenterRegistroId}/llamadas${toQueryString({
      _t: Date.now(),
    })}`,
  );

  return unwrapApiResponse<CallCenterGestionLlamadaResponse[]>(response) ?? [];
}

/**
 * Registra una nueva gestión de llamada sobre un caso Call Center.
 *
 * @param callCenterRegistroId identificador del caso maestro.
 * @param request información de la gestión telefónica.
 * @returns llamada registrada.
 */
export async function registrarCallCenterLlamada(
  callCenterRegistroId: number | string,
  request: CallCenterGestionLlamadaRequest,
): Promise<CallCenterGestionLlamadaResponse> {
  const response = await apiRequest(
    `/api/callcenter/${callCenterRegistroId}/llamadas`,
    {
      method: 'POST',
      body: request,
    },
  );

  return unwrapApiResponse<CallCenterGestionLlamadaResponse>(response);
}

/**
 * Consulta las visitas asignadas o registradas para un caso Call Center.
 *
 * @param callCenterRegistroId identificador del caso maestro.
 * @returns historial de visitas del caso.
 */
export async function getCallCenterVisitas(
  callCenterRegistroId: number | string,
): Promise<CallCenterVisitaResponse[]> {
  const response = await apiRequest(
    `/api/callcenter/${callCenterRegistroId}/visitas${toQueryString({
      _t: Date.now(),
    })}`,
  );

  return unwrapApiResponse<CallCenterVisitaResponse[]>(response) ?? [];
}

/**
 * Asigna una visita de campo a un encuestador.
 *
 * Esta acción se ejecuta desde la pantalla de gestión del caso,
 * después de la gestión telefónica.
 *
 * @param callCenterRegistroId identificador del caso maestro.
 * @param request datos de asignación de visita.
 * @returns visita creada.
 */
export async function asignarCallCenterVisita(
  callCenterRegistroId: number | string,
  request: CallCenterVisitaAsignacionRequest,
): Promise<CallCenterVisitaResponse> {
  const response = await apiRequest(
    `/api/callcenter/${callCenterRegistroId}/visitas`,
    {
      method: 'POST',
      body: request,
    },
  );

  return unwrapApiResponse<CallCenterVisitaResponse>(response);
}

/**
 * Consulta las visitas asignadas al encuestador autenticado.
 *
 * Esta función alimenta la vista:
 * `/dashboard/callcenter/mis-asignaciones`.
 *
 * @param page página solicitada.
 * @param size cantidad de registros por página.
 * @returns respuesta paginada de visitas.
 */
export async function getMisCallCenterVisitas(
  page = 0,
  size = 20,
): Promise<CallCenterPageResponse<CallCenterVisitaResponse>> {
  const response = await apiRequest(
    `/api/callcenter/visitas/mis-asignaciones${toQueryString({
      page,
      size,
      _t: Date.now(),
    })}`,
  );

  return unwrapApiResponse<CallCenterPageResponse<CallCenterVisitaResponse>>(response);
}

/**
 * Actualiza el resultado operativo de una visita Call Center.
 *
 * Esta acción la realiza el FUNCIONARIO_ENCUESTADOR desde
 * la vista de mis asignaciones.
 *
 * @param visitaId identificador de la visita.
 * @param request resultado operativo de campo.
 * @returns visita actualizada.
 */
export async function actualizarCallCenterResultadoVisita(
  visitaId: number | string,
  request: CallCenterVisitaResultadoRequest,
): Promise<CallCenterVisitaResponse> {
  const response = await apiRequest(
    `/api/callcenter/visitas/${visitaId}/resultado`,
    {
      method: 'PATCH',
      body: request,
    },
  );

  return unwrapApiResponse<CallCenterVisitaResponse>(response);
}