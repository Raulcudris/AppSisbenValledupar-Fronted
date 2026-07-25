import { apiRequest } from '@/lib/apiClient';
import { ApiResponse, PageResponse } from '@/types/api.types';
import { SelectOption } from '@/types/catalog.types';
import {
  CallCenterCatalogResponse,
  CallCenterFilter,
  CallCenterRequest,
  CallCenterResponse,
  CallCenterSummaryResponse,
  CallCenterVisitaRequest,
} from '@/types/callcenter.types';

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

function toCatalogOption(item: CallCenterCatalogResponse): SelectOption {
  return {
    id: item.id,
    label: item.codigo ? `${item.codigo} - ${item.nombre}` : item.nombre,
  };
}

export async function searchCallCenter(filter: CallCenterFilter = {}) {
  const response = await apiRequest<ApiResponse<PageResponse<CallCenterResponse>>>(
    `/api/callcenter/search${toQueryString({
      page: filter.page ?? 0,
      size: filter.size ?? 20,
      fechaInicio: filter.fechaInicio,
      fechaFin: filter.fechaFin,
      funcionarioId: filter.funcionarioId,
      cedulaSolicitante: filter.cedulaSolicitante,
      nombreCompleto: filter.nombreCompleto,
      telefono: filter.telefono,
      llamadaConectada: filter.llamadaConectada,
      motivoNoContactoId: filter.motivoNoContactoId,
      encuestadorProgramadoId: filter.encuestadorProgramadoId,
      encuestadorAsignadoId: filter.encuestadorAsignadoId,
      fechaEncuestaInicio: filter.fechaEncuestaInicio,
      fechaEncuestaFin: filter.fechaEncuestaFin,
      solicitoNuevaEncuesta: filter.solicitoNuevaEncuesta,
      barrioId: filter.barrioId,
      comunaId: filter.comunaId,
      disposicionRecibirEncuesta: filter.disposicionRecibirEncuesta,
      explicoInformanteCalificado: filter.explicoInformanteCalificado,
      activo: filter.activo,
      q: filter.q,
      tipoRegistro: filter.tipoRegistro,
      origenRegistro: filter.origenRegistro,
      ventanillaRegistroId: filter.ventanillaRegistroId,
      verificado: filter.verificado,
      estadoVisita: filter.estadoVisita,
      encuestaRealizada: filter.encuestaRealizada,
      _t: Date.now(),
    })}`
  );

  return response.data;
}

export async function getMisAsignacionesCallCenter(filter: Pick<CallCenterFilter, 'page' | 'size'> = {}) {
  const response = await apiRequest<ApiResponse<PageResponse<CallCenterResponse>>>(
    `/api/callcenter/mis-asignaciones${toQueryString({
      page: filter.page ?? 0,
      size: filter.size ?? 20,
      _t: Date.now(),
    })}`
  );

  return response.data;
}

export async function getCallCenterRegistro(id: number) {
  const response = await apiRequest<ApiResponse<CallCenterResponse>>(`/api/callcenter/${id}?_t=${Date.now()}`);
  return response.data;
}

export async function createCallCenterRegistro(request: CallCenterRequest) {
  const response = await apiRequest<ApiResponse<CallCenterResponse>>('/api/callcenter', {
    method: 'POST',
    body: request,
  });

  return response.data;
}

export async function updateCallCenterRegistro(id: number, request: CallCenterRequest) {
  const response = await apiRequest<ApiResponse<CallCenterResponse>>(`/api/callcenter/${id}`, {
    method: 'PUT',
    body: request,
  });

  return response.data;
}

export async function updateCallCenterVisita(id: number, request: CallCenterVisitaRequest) {
  const response = await apiRequest<ApiResponse<CallCenterResponse>>(`/api/callcenter/${id}/visita`, {
    method: 'PATCH',
    body: request,
  });

  return response.data;
}

export async function activateCallCenterRegistro(id: number) {
  const response = await apiRequest<ApiResponse<CallCenterResponse>>(`/api/callcenter/${id}/activate`, {
    method: 'PATCH',
  });

  return response.data;
}

export async function deactivateCallCenterRegistro(id: number) {
  const response = await apiRequest<ApiResponse<CallCenterResponse>>(`/api/callcenter/${id}/deactivate`, {
    method: 'PATCH',
  });

  return response.data;
}

export async function getCallCenterSummary() {
  const response = await apiRequest<ApiResponse<CallCenterSummaryResponse>>(`/api/callcenter/summary?_t=${Date.now()}`);
  return response.data;
}

export async function getMotivosNoContactoOptions(): Promise<SelectOption[]> {
  const response = await apiRequest<ApiResponse<CallCenterCatalogResponse[]>>(
    `/api/callcenter/catalogs/motivos-no-contacto?_t=${Date.now()}`
  );

  return (response.data ?? []).filter((item) => item.activo !== false).map(toCatalogOption);
}

export async function getMotivosNoDisposicionOptions(): Promise<SelectOption[]> {
  const response = await apiRequest<ApiResponse<CallCenterCatalogResponse[]>>(
    `/api/callcenter/catalogs/motivos-no-disposicion?_t=${Date.now()}`
  );

  return (response.data ?? []).filter((item) => item.activo !== false).map(toCatalogOption);
}
