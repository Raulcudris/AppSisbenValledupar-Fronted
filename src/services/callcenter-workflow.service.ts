import { apiRequest } from '@/lib/apiClient';

import {
  CallCenterGestionLlamadaRequest,
  CallCenterGestionLlamadaResponse,
  CallCenterPageResponse,
  CallCenterResultadoLlamadaResponse,
  CallCenterVisitaAsignacionRequest,
  CallCenterVisitaFilterRequest,
  CallCenterVisitaProgramacionRequest,
  CallCenterVisitaResponse,
  CallCenterVisitaResultadoRequest,
} from '@/types/callcenter-workflow.types';

type QueryValue =
  | string
  | number
  | boolean
  | undefined
  | null;

function toQueryString(
  params: Record<string, QueryValue>,
) {
  const query =
    new URLSearchParams();

  Object.entries(params).forEach(
    ([key, value]) => {
      if (
        value !== undefined
        && value !== null
        && value !== ''
      ) {
        query.append(
          key,
          String(value),
        );
      }
    },
  );

  const queryString =
    query.toString();

  return queryString
    ? `?${queryString}`
    : '';
}

function unwrapApiResponse<T>(
  response: unknown,
): T {
  if (
    response
    && typeof response === 'object'
    && 'data' in response
  ) {
    return (
      response as {
        data: T;
      }
    ).data;
  }

  return response as T;
}

export async function getCallCenterResultadosLlamada():
Promise<CallCenterResultadoLlamadaResponse[]> {
  const response =
    await apiRequest(
      `/api/callcenter/catalogs/resultados-llamada${toQueryString({
        _t: Date.now(),
      })}`,
    );

  return (
    unwrapApiResponse<
      CallCenterResultadoLlamadaResponse[]
    >(response)
    ?? []
  );
}

export async function getCallCenterLlamadas(
  callCenterRegistroId:
    | number
    | string,
): Promise<CallCenterGestionLlamadaResponse[]> {
  const response =
    await apiRequest(
      `/api/callcenter/${callCenterRegistroId}/llamadas${toQueryString({
        _t: Date.now(),
      })}`,
    );

  return (
    unwrapApiResponse<
      CallCenterGestionLlamadaResponse[]
    >(response)
    ?? []
  );
}

export async function registrarCallCenterLlamada(
  callCenterRegistroId:
    | number
    | string,

  request:
    CallCenterGestionLlamadaRequest,
): Promise<CallCenterGestionLlamadaResponse> {
  const response =
    await apiRequest(
      `/api/callcenter/${callCenterRegistroId}/llamadas`,
      {
        method: 'POST',
        body: request,
      },
    );

  return unwrapApiResponse<
    CallCenterGestionLlamadaResponse
  >(response);
}

export async function getCallCenterVisitas(
  callCenterRegistroId:
    | number
    | string,
): Promise<CallCenterVisitaResponse[]> {
  const response =
    await apiRequest(
      `/api/callcenter/${callCenterRegistroId}/visitas${toQueryString({
        _t: Date.now(),
      })}`,
    );

  return (
    unwrapApiResponse<
      CallCenterVisitaResponse[]
    >(response)
    ?? []
  );
}

export async function asignarCallCenterVisita(
  callCenterRegistroId:
    | number
    | string,

  request:
    CallCenterVisitaAsignacionRequest,
): Promise<CallCenterVisitaResponse> {
  const response =
    await apiRequest(
      `/api/callcenter/${callCenterRegistroId}/visitas`,
      {
        method: 'POST',
        body: request,
      },
    );

  return unwrapApiResponse<
    CallCenterVisitaResponse
  >(response);
}

/**
 * Modifica el encuestador, la fecha y la hora
 * programada de una visita existente.
 */
export async function actualizarCallCenterProgramacionVisita(
  visitaId:
    | number
    | string,

  request:
    CallCenterVisitaProgramacionRequest,
): Promise<CallCenterVisitaResponse> {
  const response =
    await apiRequest(
      `/api/callcenter/visitas/${visitaId}/programacion`,
      {
        method: 'PATCH',
        body: request,
      },
    );

  return unwrapApiResponse<
    CallCenterVisitaResponse
  >(response);
}

export async function getMisCallCenterVisitas(
  page = 0,
  size = 20,

  filter:
    CallCenterVisitaFilterRequest = {},
): Promise<
  CallCenterPageResponse<
    CallCenterVisitaResponse
  >
> {
  const response =
    await apiRequest(
      `/api/callcenter/visitas/mis-asignaciones${toQueryString({
        page,
        size,
        q: filter.q,

        estadoVisita:
          normalizeFilterValue(
            filter.estadoVisita,
            'TODOS',
          ),

        estadoCaso:
          normalizeFilterValue(
            filter.estadoCaso,
            'TODOS',
          ),

        condicion:
          normalizeFilterValue(
            filter.condicion,
            'TODAS',
          ),

        fechaDesde:
          filter.fechaDesde,

        fechaHasta:
          filter.fechaHasta,

        _t:
          Date.now(),
      })}`,
    );

  return unwrapApiResponse<
    CallCenterPageResponse<
      CallCenterVisitaResponse
    >
  >(response);
}

function normalizeFilterValue(
  value:
    | string
    | null
    | undefined,

  emptyValue:
    string,
) {
  if (
    !value
    || value === emptyValue
  ) {
    return undefined;
  }

  return value;
}

export async function actualizarCallCenterResultadoVisita(
  visitaId:
    | number
    | string,

  request:
    CallCenterVisitaResultadoRequest,
): Promise<CallCenterVisitaResponse> {
  const response =
    await apiRequest(
      `/api/callcenter/visitas/${visitaId}/resultado`,
      {
        method: 'PATCH',
        body: request,
      },
    );

  return unwrapApiResponse<
    CallCenterVisitaResponse
  >(response);
}