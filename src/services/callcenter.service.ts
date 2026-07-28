import { apiRequest } from '@/lib/apiClient';
import { ApiResponse, PageResponse } from '@/types/api.types';
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
import { SelectOption } from '@/types/catalog.types';

/**
 * Valor permitido dentro de los parámetros enviados por query string.
 */
type QueryValue = string | number | boolean | undefined | null;

/**
 * Estructura flexible usada para convertir respuestas de catálogos
 * en opciones visibles para selectores.
 */
type OptionRecord = {
  id: number;
  codigo?: string | null;
  nombre?: string | null;
  label?: string | null;
  activo?: boolean;
  comunaNombre?: string | null;
};

/**
 * Parámetros usados para validar si ya existe una asignación pendiente
 * de nueva encuesta para el ciudadano.
 */
type AsignacionPendienteLookup = {
  cedulaSolicitante?: string | null;
  ventanillaRegistroId?: number | null;
  excludeId?: number | null;
};

/**
 * Construye un query string omitiendo valores vacíos.
 *
 * @param params parámetros a enviar por URL.
 * @returns query string construido.
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
 * Extrae el arreglo de contenido desde una respuesta paginada.
 *
 * Se toleran varias formas de respuesta porque algunos endpoints pueden
 * devolver `content`, `items` o `data`.
 *
 * @param page respuesta paginada.
 * @returns contenido de la página.
 */
function getPageContent<T>(page: unknown): T[] {
  const data = page as {
    content?: T[];
    items?: T[];
    data?: T[];
  };

  return data?.content ?? data?.items ?? data?.data ?? [];
}

/**
 * Obtiene el total de elementos desde una respuesta paginada.
 *
 * @param page respuesta paginada.
 * @param currentLength cantidad actual de registros.
 * @returns total de registros.
 */
function getTotalElements(page: unknown, currentLength: number) {
  const data = page as {
    totalElements?: number;
    totalItems?: number;
    total?: number;
    totalRecords?: number;
  };

  return data?.totalElements
    ?? data?.totalItems
    ?? data?.total
    ?? data?.totalRecords
    ?? currentLength;
}

/**
 * Convierte un catálogo Call Center en una opción de selector.
 *
 * @param item registro de catálogo.
 * @returns opción para selector.
 */
function toCatalogOption(item: CallCenterCatalogResponse): SelectOption {
  return {
    id: item.id,
    label: item.codigo ? `${item.codigo} - ${item.nombre}` : item.nombre,
  };
}

/**
 * Elimina opciones duplicadas por ID y las ordena alfabéticamente.
 *
 * @param items opciones recibidas.
 * @returns opciones únicas y ordenadas.
 */
function uniqueSortedOptions(items: SelectOption[]) {
  const uniqueById = new Map<number, SelectOption>();

  items.forEach((item) => {
    uniqueById.set(item.id, item);
  });

  return Array.from(uniqueById.values()).sort((a, b) =>
    a.label.localeCompare(b.label, 'es'),
  );
}

/**
 * Consulta todas las páginas de un endpoint de opciones.
 *
 * @param path endpoint base.
 * @param extraParams parámetros adicionales.
 * @returns arreglo consolidado de opciones.
 */
async function fetchAllOptions(
  path: string,
  extraParams: Record<string, QueryValue> = {},
) {
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
      })}`,
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

/**
 * Determina si un registro ya tiene una asignación pendiente de nueva encuesta.
 *
 * Esta validación se usa como apoyo en frontend. La regla principal debe seguir
 * validándose en backend para evitar duplicidades reales.
 *
 * @param record registro Call Center.
 * @param excludeId registro que debe omitirse en edición.
 * @returns true si existe asignación pendiente.
 */
function isRegistroAsignacionPendiente(
  record: CallCenterResponse,
  excludeId?: number | null,
) {
  if (excludeId && record.id === excludeId) {
    return false;
  }

  const hasEncuestador = Boolean(
    record.encuestadorAsignadoId || record.encuestadorProgramadoId,
  );

  return record.activo !== false
    && record.solicitoNuevaEncuesta === true
    && record.encuestaRealizada !== true
    && hasEncuestador;
}

/* ============================================================
   REGISTROS CALL CENTER
   ============================================================ */

/**
 * Consulta registros Call Center aplicando filtros.
 *
 * @param filter filtros de búsqueda.
 * @returns página de registros.
 */
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
      estadoCaso: filter.estadoCaso,
      tipoSolicitudCallcenter: filter.tipoSolicitudCallcenter,
      _t: Date.now(),
    })}`,
  );

  return response.data;
}

/**
 * Consulta asignaciones legacy del módulo Call Center.
 *
 * Se conserva por compatibilidad con pantallas antiguas. Para el nuevo flujo
 * de visitas del encuestador debe usarse `getMisCallCenterVisitas`.
 *
 * @param filter paginación.
 * @returns página de registros.
 */
export async function getMisAsignacionesCallCenter(
  filter: Pick<CallCenterFilter, 'page' | 'size'> = {},
) {
  const response = await apiRequest<ApiResponse<PageResponse<CallCenterResponse>>>(
    `/api/callcenter/mis-asignaciones${toQueryString({
      page: filter.page ?? 0,
      size: filter.size ?? 20,
      _t: Date.now(),
    })}`,
  );

  return response.data;
}

/**
 * Consulta un registro Call Center por ID.
 *
 * @param id identificador del registro.
 * @returns detalle del registro.
 */
export async function getCallCenterRegistro(id: number | string) {
  const response = await apiRequest<ApiResponse<CallCenterResponse>>(
    `/api/callcenter/${id}${toQueryString({
      _t: Date.now(),
    })}`,
  );

  return response.data;
}

/**
 * Crea un registro Call Center manual.
 *
 * @param request datos del registro.
 * @returns registro creado.
 */
export async function createCallCenterRegistro(request: CallCenterRequest) {
  const response = await apiRequest<ApiResponse<CallCenterResponse>>('/api/callcenter', {
    method: 'POST',
    body: request,
  });

  return response.data;
}

/**
 * Actualiza un registro Call Center.
 *
 * @param id identificador del registro.
 * @param request datos actualizados.
 * @returns registro actualizado.
 */
export async function updateCallCenterRegistro(
  id: number | string,
  request: CallCenterRequest,
) {
  const response = await apiRequest<ApiResponse<CallCenterResponse>>(
    `/api/callcenter/${id}`,
    {
      method: 'PUT',
      body: request,
    },
  );

  return response.data;
}

/**
 * Actualiza datos legacy de visita sobre el registro maestro.
 *
 * @param id identificador del registro.
 * @param request datos de visita.
 * @returns registro actualizado.
 */
export async function updateCallCenterVisita(
  id: number | string,
  request: CallCenterVisitaRequest,
) {
  const response = await apiRequest<ApiResponse<CallCenterResponse>>(
    `/api/callcenter/${id}/visita`,
    {
      method: 'PATCH',
      body: request,
    },
  );

  return response.data;
}

/**
 * Activa un registro Call Center.
 *
 * @param id identificador del registro.
 * @returns registro actualizado.
 */
export async function activateCallCenterRegistro(id: number | string) {
  const response = await apiRequest<ApiResponse<CallCenterResponse>>(
    `/api/callcenter/${id}/activate`,
    {
      method: 'PATCH',
    },
  );

  return response.data;
}

/**
 * Inactiva un registro Call Center.
 *
 * @param id identificador del registro.
 * @returns registro actualizado.
 */
export async function deactivateCallCenterRegistro(id: number | string) {
  const response = await apiRequest<ApiResponse<CallCenterResponse>>(
    `/api/callcenter/${id}/deactivate`,
    {
      method: 'PATCH',
    },
  );

  return response.data;
}

/**
 * Consulta el resumen general del módulo Call Center.
 *
 * @returns resumen del módulo.
 */
export async function getCallCenterSummary() {
  const response = await apiRequest<ApiResponse<CallCenterSummaryResponse>>(
    `/api/callcenter/summary${toQueryString({
      _t: Date.now(),
    })}`,
  );

  return response.data;
}

/* ============================================================
   VALIDACIÓN FRONTEND DE ASIGNACIÓN PENDIENTE
   ============================================================ */

/**
 * Busca si ya existe una nueva encuesta pendiente para un ciudadano.
 *
 * Esta validación ayuda visualmente antes de guardar, pero no reemplaza
 * la validación obligatoria del backend.
 *
 * @param lookup datos de búsqueda.
 * @returns registro encontrado o null.
 */
export async function findAsignacionPendienteNuevaEncuesta(
  lookup: AsignacionPendienteLookup,
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
      isRegistroAsignacionPendiente(record, lookup.excludeId),
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
      isRegistroAsignacionPendiente(record, lookup.excludeId),
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

/**
 * Consulta motivos de no contacto.
 *
 * @returns opciones activas.
 */
export async function getMotivosNoContactoOptions(): Promise<SelectOption[]> {
  const response = await apiRequest<ApiResponse<CallCenterCatalogResponse[]>>(
    `/api/callcenter/catalogs/motivos-no-contacto${toQueryString({
      _t: Date.now(),
    })}`,
  );

  return (response.data ?? [])
    .filter((item) => item.activo !== false)
    .map(toCatalogOption);
}

/**
 * Consulta motivos de no disposición.
 *
 * @returns opciones activas.
 */
export async function getMotivosNoDisposicionOptions(): Promise<SelectOption[]> {
  const response = await apiRequest<ApiResponse<CallCenterCatalogResponse[]>>(
    `/api/callcenter/catalogs/motivos-no-disposicion${toQueryString({
      _t: Date.now(),
    })}`,
  );

  return (response.data ?? [])
    .filter((item) => item.activo !== false)
    .map(toCatalogOption);
}

/* ============================================================
   COMBOS PARA FORMULARIOS
   ============================================================ */

/**
 * Consulta encuestadores activos para formularios Call Center.
 *
 * @returns opciones de encuestadores.
 */
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
      .filter((item) => item.label),
  );
}

/**
 * Consulta barrios activos para formularios Call Center.
 *
 * @returns opciones de barrios.
 */
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
      .filter((item) => item.label),
  );
}

/**
 * Consulta comunas activas para formularios Call Center.
 *
 * @returns opciones de comunas.
 */
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
      .filter((item) => item.label),
  );
}

/* ============================================================
   VENTANILLA PARA CALL CENTER
   ============================================================ */

/**
 * Busca registros de Ventanilla disponibles para crear casos Call Center.
 *
 * @param filter filtros de Ventanilla.
 * @returns página de registros de Ventanilla.
 */
export async function searchVentanillaForCallCenter(
  filter: VentanillaCallCenterFilter = {},
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
    })}`,
  );

  return response.data;
}

/**
 * Busca un registro de Ventanilla por cédula para usarlo en Call Center.
 *
 * @param cedulaUsuario cédula del ciudadano.
 * @returns primer registro encontrado o null.
 */
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

/**
 * Consulta casos pendientes de asignar a funcionario Call Center.
 *
 * Esta función alimenta la vista del Coordinador / Enrutador:
 * `/dashboard/callcenter/asignar-funcionarios`.
 *
 * @param filter paginación.
 * @returns página de casos pendientes.
 */
export async function getPendientesAsignarFuncionarioCallCenter(
  filter: Pick<CallCenterFilter, 'page' | 'size'> = {},
) {
  const response = await apiRequest<ApiResponse<PageResponse<CallCenterResponse>>>(
    `/api/callcenter/pendientes-asignar-funcionario${toQueryString({
      page: filter.page ?? 0,
      size: filter.size ?? 20,
      _t: Date.now(),
    })}`,
  );

  return response.data;
}

/**
 * Consulta los casos asignados al funcionario Call Center autenticado.
 *
 * Esta función alimenta la vista:
 * `/dashboard/callcenter/mis-registros`.
 *
 * @param filter paginación.
 * @returns página de casos asignados al funcionario.
 */
export async function getMisRegistrosCallCenter(
  filter: Pick<CallCenterFilter, 'page' | 'size'> = {},
) {
  const response = await apiRequest<ApiResponse<PageResponse<CallCenterResponse>>>(
    `/api/callcenter/mis-registros-callcenter${toQueryString({
      page: filter.page ?? 0,
      size: filter.size ?? 20,
      _t: Date.now(),
    })}`,
  );

  return response.data;
}

/**
 * Consulta funcionarios Call Center activos para asignación de casos.
 *
 * @returns lista de usuarios funcionarios Call Center.
 */
export async function getFuncionariosCallCenterOptions(): Promise<CallCenterUserOptionResponse[]> {
  const response = await apiRequest<ApiResponse<CallCenterUserOptionResponse[]>>(
    `/api/callcenter/catalogs/funcionarios-callcenter${toQueryString({
      _t: Date.now(),
    })}`,
  );

  return response.data ?? [];
}

/**
 * Asigna casos seleccionados a un funcionario Call Center.
 *
 * @param request funcionario destino y registros seleccionados.
 * @returns registros actualizados.
 */
export async function asignarFuncionarioCallCenter(
  request: CallCenterAsignarFuncionarioRequest,
) {
  const response = await apiRequest<ApiResponse<CallCenterResponse[]>>(
    '/api/callcenter/asignar-funcionario-callcenter',
    {
      method: 'PATCH',
      body: request,
    },
  );

  return response.data;
}

/**
 * Asigna casos seleccionados a un encuestador desde el flujo legacy.
 *
 * En el flujo formal, la asignación de visita debe hacerse desde:
 * `/dashboard/callcenter/mis-registros/[id]`.
 *
 * @param request encuestador destino y registros seleccionados.
 * @returns registros actualizados.
 */
export async function asignarEncuestadorCallCenter(
  request: CallCenterAsignarEncuestadorRequest,
) {
  const response = await apiRequest<ApiResponse<CallCenterResponse[]>>(
    '/api/callcenter/asignar-encuestador',
    {
      method: 'PATCH',
      body: request,
    },
  );

  return response.data;
}