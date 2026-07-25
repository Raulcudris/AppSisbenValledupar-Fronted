import { apiRequest } from '@/lib/apiClient';
import { ApiResponse, PageResponse } from '@/types/api.types';
import { SelectOption } from '@/types/catalog.types';
import {
  CallCenterAsignarEncuestadorRequest,
  CallCenterAsignarFuncionarioRequest,
  CallCenterUserOptionResponse,
} from '@/types/callcenter-assignment.types';

import {
  CallCenterCatalogResponse,
  CallCenterFilter,
  CallCenterRequest,
  CallCenterResponse,
  CallCenterSummaryResponse,
  CallCenterVisitaRequest,
  VentanillaCallCenterFilter,
  VentanillaCallCenterResponse,
} from '@/types/callcenter.types';


type QueryValue = string | number | boolean | undefined | null;

type OptionRecord = {
  id: number;
  codigo?: string | null;
  nombre?: string | null;
  label?: string | null;
  activo?: boolean;
  comunaNombre?: string | null;
};

type AsignacionPendienteLookup = {
  cedulaSolicitante?: string | null;
  ventanillaRegistroId?: number | null;
  excludeId?: number | null;
};

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

function getPageContent<T>(page: unknown): T[] {
  const data = page as {
    content?: T[];
    items?: T[];
    data?: T[];
  };

  return data?.content ?? data?.items ?? data?.data ?? [];
}

function getTotalElements(page: unknown, currentLength: number) {
  const data = page as {
    totalElements?: number;
    total?: number;
    totalRecords?: number;
  };

  return data?.totalElements ?? data?.total ?? data?.totalRecords ?? currentLength;
}

function toCatalogOption(item: CallCenterCatalogResponse): SelectOption {
  return {
    id: item.id,
    label: item.codigo ? `${item.codigo} - ${item.nombre}` : item.nombre,
  };
}

function uniqueSortedOptions(items: SelectOption[]) {
  const uniqueById = new Map<number, SelectOption>();

  items.forEach((item) => {
    uniqueById.set(item.id, item);
  });

  return Array.from(uniqueById.values()).sort((a, b) =>
    a.label.localeCompare(b.label, 'es')
  );
}

async function fetchAllOptions(path: string, extraParams: Record<string, QueryValue> = {}) {
  const allItems: OptionRecord[] = [];
  let page = 0;
  const size = 200;
  let total = 0;

  do {
    const response = await apiRequest<ApiResponse<PageResponse<OptionRecord>>>(
      `${path}${toQueryString({
        page,
        size,
        activo: true,
        ...extraParams,
        _t: Date.now(),
      })}`
    );

    const content = getPageContent<OptionRecord>(response.data);
    total = getTotalElements(response.data, allItems.length + content.length);

    allItems.push(...content);

    if (content.length === 0) {
      break;
    }

    page += 1;
  } while (allItems.length < total);

  return allItems;
}

function isRegistroAsignacionPendiente(record: CallCenterResponse, excludeId?: number | null) {
  if (excludeId && record.id === excludeId) {
    return false;
  }

  const hasEncuestador = Boolean(record.encuestadorAsignadoId || record.encuestadorProgramadoId);

  return record.activo !== false
    && record.solicitoNuevaEncuesta === true
    && record.encuestaRealizada !== true
    && hasEncuestador;
}

/* ============================================================
   REGISTROS CALL CENTER
   ============================================================ */

export async function searchCallCenter(filter: CallCenterFilter = {}) {
  const response = await apiRequest<ApiResponse<PageResponse<CallCenterResponse>>>(
    `/api/callcenter/search${toQueryString({
      page: filter.page ?? 0,
      size: filter.size ?? 20,
      fechaInicio: filter.fechaInicio,
      fechaFin: filter.fechaFin,
      funcionarioId: filter.funcionarioId,
      funcionarioCallcenterAsignadoId: filter.funcionarioCallcenterAsignadoId,
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

export async function getMisAsignacionesCallCenter(
  filter: Pick<CallCenterFilter, 'page' | 'size'> = {}
) {
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
  const response = await apiRequest<ApiResponse<CallCenterResponse>>(
    `/api/callcenter/${id}?_t=${Date.now()}`
  );

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
  const response = await apiRequest<ApiResponse<CallCenterResponse>>(
    `/api/callcenter/${id}/visita`,
    {
      method: 'PATCH',
      body: request,
    }
  );

  return response.data;
}

export async function activateCallCenterRegistro(id: number) {
  const response = await apiRequest<ApiResponse<CallCenterResponse>>(
    `/api/callcenter/${id}/activate`,
    {
      method: 'PATCH',
    }
  );

  return response.data;
}

export async function deactivateCallCenterRegistro(id: number) {
  const response = await apiRequest<ApiResponse<CallCenterResponse>>(
    `/api/callcenter/${id}/deactivate`,
    {
      method: 'PATCH',
    }
  );

  return response.data;
}

export async function getCallCenterSummary() {
  const response = await apiRequest<ApiResponse<CallCenterSummaryResponse>>(
    `/api/callcenter/summary?_t=${Date.now()}`
  );

  return response.data;
}

/* ============================================================
   VALIDACIÓN FRONTEND DE ASIGNACIÓN PENDIENTE
   ============================================================ */

export async function findAsignacionPendienteNuevaEncuesta(
  lookup: AsignacionPendienteLookup
) {
  const ventanillaRegistroId = lookup.ventanillaRegistroId ?? undefined;
  const cedulaSolicitante = lookup.cedulaSolicitante?.trim() || undefined;

  if (ventanillaRegistroId) {
    const page = await searchCallCenter({
      page: 0,
      size: 5,
      ventanillaRegistroId,
      solicitoNuevaEncuesta: true,
      encuestaRealizada: false,
      activo: true,
    });

    const found = getPageContent<CallCenterResponse>(page).find((record) =>
      isRegistroAsignacionPendiente(record, lookup.excludeId)
    );

    if (found) {
      return found;
    }
  }

  if (cedulaSolicitante) {
    const page = await searchCallCenter({
      page: 0,
      size: 5,
      cedulaSolicitante,
      solicitoNuevaEncuesta: true,
      encuestaRealizada: false,
      activo: true,
    });

    const found = getPageContent<CallCenterResponse>(page).find((record) =>
      isRegistroAsignacionPendiente(record, lookup.excludeId)
    );

    if (found) {
      return found;
    }
  }

  return null;
}

/* ============================================================
   CATÁLOGOS CALL CENTER
   ============================================================ */

export async function getMotivosNoContactoOptions(): Promise<SelectOption[]> {
  const response = await apiRequest<ApiResponse<CallCenterCatalogResponse[]>>(
    `/api/callcenter/catalogs/motivos-no-contacto?_t=${Date.now()}`
  );

  return (response.data ?? [])
    .filter((item) => item.activo !== false)
    .map(toCatalogOption);
}

export async function getMotivosNoDisposicionOptions(): Promise<SelectOption[]> {
  const response = await apiRequest<ApiResponse<CallCenterCatalogResponse[]>>(
    `/api/callcenter/catalogs/motivos-no-disposicion?_t=${Date.now()}`
  );

  return (response.data ?? [])
    .filter((item) => item.activo !== false)
    .map(toCatalogOption);
}

/* ============================================================
   COMBOS PARA FORMULARIOS
   ============================================================ */

export async function getCallCenterEncuestadoresOptions(): Promise<SelectOption[]> {
  const items = await fetchAllOptions('/api/catalogs/encuestadores');

  return uniqueSortedOptions(
    items
      .filter((item) => item.activo !== false)
      .map((item) => ({
        id: item.id,
        label: item.codigo
          ? `${item.codigo} - ${item.nombre ?? item.label ?? ''}`.trim()
          : `${item.nombre ?? item.label ?? ''}`.trim(),
      }))
      .filter((item) => item.label)
  );
}

export async function getCallCenterBarriosOptions(): Promise<SelectOption[]> {
  const items = await fetchAllOptions('/api/territory/barrios');

  return uniqueSortedOptions(
    items
      .filter((item) => item.activo !== false)
      .map((item) => ({
        id: item.id,
        label: item.comunaNombre
          ? `${item.nombre ?? item.label ?? ''} - ${item.comunaNombre}`.trim()
          : `${item.nombre ?? item.label ?? ''}`.trim(),
      }))
      .filter((item) => item.label)
  );
}

export async function getCallCenterComunasOptions(): Promise<SelectOption[]> {
  const items = await fetchAllOptions('/api/territory/comunas');

  return uniqueSortedOptions(
    items
      .filter((item) => item.activo !== false)
      .map((item) => ({
        id: item.id,
        label: item.codigo
          ? `${item.codigo} - ${item.nombre ?? item.label ?? ''}`.trim()
          : `${item.nombre ?? item.label ?? ''}`.trim(),
      }))
      .filter((item) => item.label)
  );
}

/* ============================================================
   VENTANILLA PARA CALL CENTER
   ============================================================ */

export async function searchVentanillaForCallCenter(
  filter: VentanillaCallCenterFilter = {}
) {
  const response = await apiRequest<ApiResponse<PageResponse<VentanillaCallCenterResponse>>>(
    `/api/ventanilla/search${toQueryString({
      page: filter.page ?? 0,
      size: filter.size ?? 10,
      fechaInicio: filter.fechaInicio,
      fechaFin: filter.fechaFin,
      numeroVentanilla: filter.numeroVentanilla,
      cedulaUsuario: filter.cedulaUsuario,
      nombreUsuario: filter.nombreUsuario,
      telefono: filter.telefono,
      barrioId: filter.barrioId,
      comunaId: filter.comunaId,
      solicitudId: filter.solicitudId,
      estadoSolicitudId: filter.estadoSolicitudId,
      activo: filter.activo ?? true,
      incluirInactivos: filter.incluirInactivos,
      q: filter.q,
      _t: Date.now(),
    })}`
  );

  return response.data;
}

export async function findVentanillaByCedulaForCallCenter(cedulaUsuario: string) {
  const response = await searchVentanillaForCallCenter({
    cedulaUsuario,
    page: 0,
    size: 1,
    activo: true,
  });

  const content = getPageContent<VentanillaCallCenterResponse>(response);

  return content.length > 0 ? content[0] : null;
}

/* ============================================================
   ASIGNACIÓN POR ROLES CALL CENTER
   ============================================================ */

export async function getPendientesAsignarFuncionarioCallCenter(
  filter: Pick<CallCenterFilter, 'page' | 'size'> = {}
) {
  const response = await apiRequest<ApiResponse<PageResponse<CallCenterResponse>>>(
    `/api/callcenter/pendientes-asignar-funcionario${toQueryString({
      page: filter.page ?? 0,
      size: filter.size ?? 20,
      _t: Date.now(),
    })}`
  );

  return response.data;
}

export async function getMisRegistrosCallCenter(
  filter: Pick<CallCenterFilter, 'page' | 'size'> = {}
) {
  const response = await apiRequest<ApiResponse<PageResponse<CallCenterResponse>>>(
    `/api/callcenter/mis-registros-callcenter${toQueryString({
      page: filter.page ?? 0,
      size: filter.size ?? 20,
      _t: Date.now(),
    })}`
  );

  return response.data;
}

export async function getFuncionariosCallCenterOptions(): Promise<CallCenterUserOptionResponse[]> {
  const response = await apiRequest<ApiResponse<CallCenterUserOptionResponse[]>>(
    `/api/callcenter/catalogs/funcionarios-callcenter?_t=${Date.now()}`
  );

  return response.data ?? [];
}

export async function asignarFuncionarioCallCenter(request: CallCenterAsignarFuncionarioRequest) {
  const response = await apiRequest<ApiResponse<CallCenterResponse[]>>(
    '/api/callcenter/asignar-funcionario-callcenter',
    {
      method: 'PATCH',
      body: request,
    }
  );

  return response.data;
}

export async function asignarEncuestadorCallCenter(request: CallCenterAsignarEncuestadorRequest) {
  const response = await apiRequest<ApiResponse<CallCenterResponse[]>>(
    '/api/callcenter/asignar-encuestador',
    {
      method: 'PATCH',
      body: request,
    }
  );

  return response.data;
}
