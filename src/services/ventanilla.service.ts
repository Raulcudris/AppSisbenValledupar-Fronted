import { apiRequest } from '@/lib/apiClient';
import { toQueryString } from '@/lib/queryString';
import { ApiResponse, PageResponse } from '@/types/api.types';
import {
  VentanillaCitizenHistoryResponse,
  VentanillaDailyValidationResponse,
  VentanillaFilter,
  VentanillaRequest,
  VentanillaResponse,
  VentanillaUserHistoryFilter,
  VentanillaUserHistoryResponse,
  VentanillaUserHistorySummaryResponse,
} from '@/types/operational.types';

type QueryValue = string | number | undefined;

function toQueryValue(value: unknown): QueryValue {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return String(value);
  }

  if (typeof value === 'number') {
    return value;
  }

  return String(value);
}

function buildVentanillaQuery(filter: VentanillaFilter): Record<string, QueryValue> {
  return {
    fechaInicio: toQueryValue(filter.fechaInicio),
    fechaFin: toQueryValue(filter.fechaFin),
    numeroVentanilla: toQueryValue(filter.numeroVentanilla),
    cedulaUsuario: toQueryValue(filter.cedulaUsuario),
    nombreUsuario: toQueryValue(filter.nombreUsuario),
    funcionarioId: toQueryValue(filter.funcionarioId),
    categoriaId: toQueryValue(filter.categoriaId),
    solicitudId: toQueryValue(filter.solicitudId),
    estadoSolicitudId: toQueryValue(filter.estadoSolicitudId),
    barrioId: toQueryValue(filter.barrioId),
    comunaId: toQueryValue(filter.comunaId),
    extranjero: toQueryValue(filter.extranjero),
    incluirInactivos: toQueryValue(filter.incluirInactivos),
    activo: toQueryValue(filter.activo),
    page: filter.page ?? 0,
    size: filter.size ?? 10,
  };
}

export async function searchVentanilla(filter: VentanillaFilter) {
  const response = await apiRequest<ApiResponse<PageResponse<VentanillaResponse>>>(
    `/api/ventanilla/search${toQueryString(buildVentanillaQuery(filter))}`
  );

  return response.data;
}

export async function getVentanillaById(id: number) {
  const response = await apiRequest<ApiResponse<VentanillaResponse>>(`/api/ventanilla/${id}`);

  return response.data;
}

export async function createVentanilla(request: VentanillaRequest) {
  const response = await apiRequest<ApiResponse<VentanillaResponse>>('/api/ventanilla', {
    method: 'POST',
    body: request,
  });

  return response.data;
}

export async function updateVentanilla(id: number, request: VentanillaRequest) {
  const response = await apiRequest<ApiResponse<VentanillaResponse>>(`/api/ventanilla/${id}`, {
    method: 'PUT',
    body: request,
  });

  return response.data;
}

export async function inactivateVentanilla(id: number) {
  await apiRequest<ApiResponse<null>>(`/api/ventanilla/${id}/inactivar`, {
    method: 'PATCH',
  });
}

export async function activateVentanilla(id: number) {
  await apiRequest<ApiResponse<null>>(`/api/ventanilla/${id}/activar`, {
    method: 'PATCH',
  });
}

export async function deleteVentanilla(id: number) {
  await apiRequest<ApiResponse<null>>(`/api/ventanilla/${id}`, {
    method: 'DELETE',
  });
}

export async function validateVentanillaBeforeSave(params: {
  currentId?: number;
  fecha: string;
  cedulaUsuario: string;
  solicitudId: number;
}) {
  const response = await apiRequest<ApiResponse<VentanillaDailyValidationResponse>>(
    `/api/ventanilla/validacion-previa${toQueryString({
      currentId: toQueryValue(params.currentId),
      fecha: toQueryValue(params.fecha),
      cedulaUsuario: toQueryValue(params.cedulaUsuario),
      solicitudId: toQueryValue(params.solicitudId),
    })}`
  );

  return response.data;
}

export async function getVentanillaCitizenHistory(cedulaUsuario: string) {
  const response = await apiRequest<ApiResponse<VentanillaCitizenHistoryResponse>>(
    `/api/ventanilla/historial/ciudadano${toQueryString({
      cedulaUsuario: toQueryValue(cedulaUsuario),
    })}`
  );

  return response.data;
}

export async function searchVentanillaUserHistory(filter: VentanillaUserHistoryFilter) {
  const response = await apiRequest<ApiResponse<PageResponse<VentanillaUserHistorySummaryResponse>>>(
    `/api/ventanilla/historial/usuarios${toQueryString({
      search: filter.search,
      page: filter.page ?? 0,
      size: filter.size ?? 10,
    })}`
  );

  return response.data;
}

export async function getVentanillaUserHistory(cedulaUsuario: string) {
  const response = await apiRequest<ApiResponse<VentanillaUserHistoryResponse>>(
    `/api/ventanilla/historial/usuario${toQueryString({
      cedulaUsuario,
    })}`
  );

  return response.data;
}