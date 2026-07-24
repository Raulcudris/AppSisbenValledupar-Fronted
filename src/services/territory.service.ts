import { apiRequest } from '@/lib/apiClient';
import { ApiResponse, PageResponse } from '@/types/api.types';
import { SelectOption } from '@/types/catalog.types';
import {
  BarrioFilter,
  BarrioRequest,
  BarrioResponse,
  ComunaFilter,
  ComunaRequest,
  ComunaResponse,
} from '@/types/territory.types';

type QueryValue = string | number | boolean | undefined | null;

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

/* ============================================================
   BARRIOS
   ============================================================ */

export async function searchBarrios(filter: BarrioFilter = {}) {
  const response = await apiRequest<ApiResponse<PageResponse<BarrioResponse>>>(
    `/api/territory/barrios${toQueryString({
      page: filter.page ?? 0,
      size: filter.size ?? 10,
      q: filter.q,
      comunaId: filter.comunaId,
      activo: filter.activo,
      _t: Date.now(),
    })}`
  );

  return response.data;
}

export async function getBarrio(id: number) {
  const response = await apiRequest<ApiResponse<BarrioResponse>>(
    `/api/territory/barrios/${id}?_t=${Date.now()}`
  );

  return response.data;
}

export async function createBarrio(request: BarrioRequest) {
  const response = await apiRequest<ApiResponse<BarrioResponse>>(
    '/api/territory/barrios',
    {
      method: 'POST',
      body: request,
    }
  );

  return response.data;
}

export async function updateBarrio(id: number, request: BarrioRequest) {
  const response = await apiRequest<ApiResponse<BarrioResponse>>(
    `/api/territory/barrios/${id}`,
    {
      method: 'PUT',
      body: request,
    }
  );

  return response.data;
}

export async function activateBarrio(id: number) {
  const response = await apiRequest<ApiResponse<BarrioResponse>>(
    `/api/territory/barrios/${id}/activate`,
    {
      method: 'PATCH',
    }
  );

  return response.data;
}

export async function deactivateBarrio(id: number) {
  const response = await apiRequest<ApiResponse<BarrioResponse>>(
    `/api/territory/barrios/${id}/deactivate`,
    {
      method: 'PATCH',
    }
  );

  return response.data;
}

/**
 * Carga todos los barrios activos desde el módulo Territory.
 * No depende de una sola página, para que Ventanilla vea barrios nuevos o actualizados.
 */
export async function getBarriosOptions(): Promise<SelectOption[]> {
  const pageSize = 100;
  let page = 0;
  let totalPages = 1;
  const allBarrios: BarrioResponse[] = [];

  do {
    const response = await searchBarrios({
      page,
      size: pageSize,
      activo: true,
    });

    allBarrios.push(...(response.content ?? []));

    totalPages = response.totalPages ?? 1;
    page += 1;
  } while (page < totalPages);

  const uniqueById = new Map<number, SelectOption>();

  allBarrios.forEach((barrio) => {
    uniqueById.set(barrio.id, {
      id: barrio.id,
      label: barrio.comunaNombre
        ? `${barrio.nombre} - ${barrio.comunaNombre}`
        : barrio.nombre,
    });
  });

  return Array.from(uniqueById.values()).sort((a, b) =>
    a.label.localeCompare(b.label, 'es')
  );
}

/* ============================================================
   COMUNAS
   ============================================================ */

export async function searchComunas(filter: ComunaFilter = {}) {
  const response = await apiRequest<ApiResponse<PageResponse<ComunaResponse>>>(
    `/api/territory/comunas${toQueryString({
      page: filter.page ?? 0,
      size: filter.size ?? 100,
      q: filter.q,
      activo: filter.activo,
      _t: Date.now(),
    })}`
  );

  return response.data;
}

export async function getComuna(id: number) {
  const response = await apiRequest<ApiResponse<ComunaResponse>>(
    `/api/territory/comunas/${id}?_t=${Date.now()}`
  );

  return response.data;
}

export async function createComuna(request: ComunaRequest) {
  const response = await apiRequest<ApiResponse<ComunaResponse>>(
    '/api/territory/comunas',
    {
      method: 'POST',
      body: request,
    }
  );

  return response.data;
}

export async function updateComuna(id: number, request: ComunaRequest) {
  const response = await apiRequest<ApiResponse<ComunaResponse>>(
    `/api/territory/comunas/${id}`,
    {
      method: 'PUT',
      body: request,
    }
  );

  return response.data;
}

export async function activateComuna(id: number) {
  const response = await apiRequest<ApiResponse<ComunaResponse>>(
    `/api/territory/comunas/${id}/activate`,
    {
      method: 'PATCH',
    }
  );

  return response.data;
}

export async function deactivateComuna(id: number) {
  const response = await apiRequest<ApiResponse<ComunaResponse>>(
    `/api/territory/comunas/${id}/deactivate`,
    {
      method: 'PATCH',
    }
  );

  return response.data;
}