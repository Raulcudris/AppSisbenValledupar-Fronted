import { apiRequest } from '@/lib/apiClient';

import {
  ApiResponse,
  PageResponse,
} from '@/types/api.types';

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

import {
  SelectOption,
} from '@/types/catalog.types';

type QueryValue =
  | string
  | number
  | boolean
  | undefined
  | null;

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

function getPageContent<T>(
  page: unknown,
): T[] {
  const data =
    page as {
      content?: T[];
      items?: T[];
      data?: T[];
    };

  return (
    data?.content
    ?? data?.items
    ?? data?.data
    ?? []
  );
}

function getTotalElements(
  page: unknown,
  currentLength: number,
) {
  const data =
    page as {
      totalElements?: number;
      totalItems?: number;
      total?: number;
      totalRecords?: number;
    };

  return (
    data?.totalElements
    ?? data?.totalItems
    ?? data?.total
    ?? data?.totalRecords
    ?? currentLength
  );
}

function getReportedTotalElements(
  page: unknown,
): number | null {
  const data =
    page as {
      totalElements?: number;
      totalItems?: number;
      total?: number;
      totalRecords?: number;
    };

  const value =
    data?.totalElements
    ?? data?.totalItems
    ?? data?.total
    ?? data?.totalRecords;

  return typeof value === 'number'
    && Number.isFinite(value)
    ? value
    : null;
}

function normalizeExactText(
  value?: string | null,
) {
  return String(
    value ?? '',
  ).trim();
}

function normalizeCode(
  value?: string | null,
) {
  return String(
    value ?? '',
  )
    .trim()
    .toUpperCase();
}

function toCatalogOption(
  item: CallCenterCatalogResponse,
): SelectOption {
  return {
    id:
      item.id,

    label:
      item.codigo
        ? `${item.codigo} - ${item.nombre}`
        : item.nombre,
  };
}

function uniqueSortedOptions(
  items: SelectOption[],
) {
  const uniqueById =
    new Map<number, SelectOption>();

  items.forEach(
    (item) => {
      uniqueById.set(
        item.id,
        item,
      );
    },
  );

  return Array.from(
    uniqueById.values(),
  ).sort(
    (a, b) =>
      a.label.localeCompare(
        b.label,
        'es',
      ),
  );
}

async function fetchAllOptions(
  path: string,
  extraParams:
    Record<string, QueryValue> = {},
) {
  const allItems:
    OptionRecord[] = [];

  let page =
    0;

  const size =
    200;

  let total =
    0;

  do {
    const response =
      await apiRequest<
        ApiResponse<
          PageResponse<OptionRecord>
        >
      >(
        `${path}${toQueryString({
          page,
          size,
          activo:
            true,
          ...extraParams,
          _t:
            Date.now(),
        })}`,
      );

    const content =
      getPageContent<OptionRecord>(
        response.data,
      );

    total =
      getTotalElements(
        response.data,
        allItems.length
        + content.length,
      );

    allItems.push(
      ...content,
    );

    if (
      content.length === 0
    ) {
      break;
    }

    page +=
      1;
  } while (
    allItems.length < total
  );

  return allItems;
}

function isRegistroAsignacionPendiente(
  record: CallCenterResponse,
  excludeId?: number | null,
) {
  if (
    excludeId != null
    && record.id === excludeId
  ) {
    return false;
  }

  const tipoSolicitud =
    normalizeCode(
      record.tipoSolicitudCallcenter,
    );

  const esNuevaEncuesta =
    record.solicitoNuevaEncuesta
      === true
    || tipoSolicitud
      === 'NUEVA_ENCUESTA';

  return (
    record.activo !== false
    && esNuevaEncuesta
    && record.encuestaRealizada
      !== true
  );
}

/**
 * Recorre la consulta paginada respetando el orden enviado
 * por el backend y retorna la primera coincidencia válida.
 */
async function findFirstCallCenterRecord(
  filter: CallCenterFilter,
  matcher:
    (
      record: CallCenterResponse,
    ) => boolean,
) {
  let page =
    0;

  const size =
    50;

  let processed =
    0;

  while (true) {
    const response =
      await searchCallCenter({
        ...filter,
        page,
        size,
      });

    const content =
      getPageContent<CallCenterResponse>(
        response,
      );

    const found =
      content.find(
        matcher,
      );

    if (
      found
    ) {
      return found;
    }

    processed +=
      content.length;

    const total =
      getReportedTotalElements(
        response,
      );

    if (
      content.length === 0
      || content.length < size
      || (
        total != null
        && processed >= total
      )
    ) {
      break;
    }

    page +=
      1;
  }

  return null;
}

/* ============================================================
   REGISTROS CALL CENTER
   ============================================================ */

export async function searchCallCenter(
  filter: CallCenterFilter = {},
) {
  const response =
    await apiRequest<
      ApiResponse<
        PageResponse<CallCenterResponse>
      >
    >(
      `/api/callcenter/search${toQueryString({
        page:
          filter.page
          ?? 0,

        size:
          filter.size
          ?? 20,

        fechaInicio:
          filter.fechaInicio,

        fechaFin:
          filter.fechaFin,

        funcionarioId:
          filter.funcionarioId,

        funcionarioCallcenterAsignadoId:
          filter.funcionarioCallcenterAsignadoId,

        cedulaSolicitante:
          filter.cedulaSolicitante,

        nombreCompleto:
          filter.nombreCompleto,

        telefono:
          filter.telefono,

        llamadaConectada:
          filter.llamadaConectada,

        motivoNoContactoId:
          filter.motivoNoContactoId,

        encuestadorProgramadoId:
          filter.encuestadorProgramadoId,

        encuestadorAsignadoId:
          filter.encuestadorAsignadoId,

        fechaEncuestaInicio:
          filter.fechaEncuestaInicio,

        fechaEncuestaFin:
          filter.fechaEncuestaFin,

        solicitoNuevaEncuesta:
          filter.solicitoNuevaEncuesta,

        barrioId:
          filter.barrioId,

        comunaId:
          filter.comunaId,

        disposicionRecibirEncuesta:
          filter.disposicionRecibirEncuesta,

        explicoInformanteCalificado:
          filter.explicoInformanteCalificado,

        activo:
          filter.activo,

        q:
          filter.q,

        tipoRegistro:
          filter.tipoRegistro,

        origenRegistro:
          filter.origenRegistro,

        ventanillaRegistroId:
          filter.ventanillaRegistroId,

        verificado:
          filter.verificado,

        estadoVisita:
          filter.estadoVisita,

        encuestaRealizada:
          filter.encuestaRealizada,

        estadoCaso:
          filter.estadoCaso,

        tipoSolicitudCallcenter:
          filter.tipoSolicitudCallcenter,

        _t:
          Date.now(),
      })}`,
    );

  return response.data;
}

export async function getMisAsignacionesCallCenter(
  filter:
    Pick<
      CallCenterFilter,
      'page' | 'size'
    > = {},
) {
  const response =
    await apiRequest<
      ApiResponse<
        PageResponse<CallCenterResponse>
      >
    >(
      `/api/callcenter/mis-asignaciones${toQueryString({
        page:
          filter.page
          ?? 0,

        size:
          filter.size
          ?? 20,

        _t:
          Date.now(),
      })}`,
    );

  return response.data;
}

export async function getCallCenterRegistro(
  id: number | string,
) {
  const response =
    await apiRequest<
      ApiResponse<CallCenterResponse>
    >(
      `/api/callcenter/${id}${toQueryString({
        _t:
          Date.now(),
      })}`,
    );

  return response.data;
}

export async function createCallCenterRegistro(
  request: CallCenterRequest,
) {
  const response =
    await apiRequest<
      ApiResponse<CallCenterResponse>
    >(
      '/api/callcenter',
      {
        method:
          'POST',

        body:
          request,
      },
    );

  return response.data;
}

export async function updateCallCenterRegistro(
  id: number | string,
  request: CallCenterRequest,
) {
  const response =
    await apiRequest<
      ApiResponse<CallCenterResponse>
    >(
      `/api/callcenter/${id}`,
      {
        method:
          'PUT',

        body:
          request,
      },
    );

  return response.data;
}

export async function updateCallCenterVisita(
  id: number | string,
  request: CallCenterVisitaRequest,
) {
  const response =
    await apiRequest<
      ApiResponse<CallCenterResponse>
    >(
      `/api/callcenter/${id}/visita`,
      {
        method:
          'PATCH',

        body:
          request,
      },
    );

  return response.data;
}

export async function activateCallCenterRegistro(
  id: number | string,
) {
  const response =
    await apiRequest<
      ApiResponse<CallCenterResponse>
    >(
      `/api/callcenter/${id}/activate`,
      {
        method:
          'PATCH',
      },
    );

  return response.data;
}

export async function deactivateCallCenterRegistro(
  id: number | string,
) {
  const response =
    await apiRequest<
      ApiResponse<CallCenterResponse>
    >(
      `/api/callcenter/${id}/deactivate`,
      {
        method:
          'PATCH',
      },
    );

  return response.data;
}

export async function getCallCenterSummary() {
  const response =
    await apiRequest<
      ApiResponse<CallCenterSummaryResponse>
    >(
      `/api/callcenter/summary${toQueryString({
        _t:
          Date.now(),
      })}`,
    );

  return response.data;
}

/* ============================================================
   VALIDACIÓN Y RECUPERACIÓN DEL CIUDADANO
   ============================================================ */

export async function findAsignacionPendienteNuevaEncuesta(
  lookup: AsignacionPendienteLookup,
) {
  const ventanillaRegistroId =
    lookup.ventanillaRegistroId
    ?? undefined;

  const cedulaSolicitante =
    normalizeExactText(
      lookup.cedulaSolicitante,
    )
    || undefined;

  if (
    ventanillaRegistroId
  ) {
    const found =
      await findFirstCallCenterRecord(
        {
          ventanillaRegistroId,
          activo:
            true,
        },
        (record) =>
          isRegistroAsignacionPendiente(
            record,
            lookup.excludeId,
          ),
      );

    if (
      found
    ) {
      return found;
    }
  }

  if (
    cedulaSolicitante
  ) {
    const found =
      await findFirstCallCenterRecord(
        {
          cedulaSolicitante,
          activo:
            true,
        },
        (record) => {
          const exactCedula =
            normalizeExactText(
              record.cedulaSolicitante,
            ) === cedulaSolicitante;

          return (
            exactCedula
            && isRegistroAsignacionPendiente(
              record,
              lookup.excludeId,
            )
          );
        },
      );

    if (
      found
    ) {
      return found;
    }
  }

  return null;
}

/**
 * Retorna el último registro manual activo según el orden
 * descendente por fechaLlamada aplicado por el backend.
 *
 * Solo se acepta una coincidencia exacta de cédula.
 */
export async function findUltimoRegistroManualActivoPorCedula(
  cedulaSolicitante: string,
  excludeId?: number | null,
) {
  const cedula =
    normalizeExactText(
      cedulaSolicitante,
    );

  if (
    !cedula
  ) {
    return null;
  }

  return findFirstCallCenterRecord(
    {
      cedulaSolicitante:
        cedula,

      origenRegistro:
        'MANUAL',

      activo:
        true,
    },
    (record) => {
      if (
        excludeId != null
        && record.id === excludeId
      ) {
        return false;
      }

      const exactCedula =
        normalizeExactText(
          record.cedulaSolicitante,
        ) === cedula;

      const manual =
        normalizeCode(
          record.origenRegistro,
        ) === 'MANUAL';

      return (
        exactCedula
        && manual
        && record.activo !== false
      );
    },
  );
}

/* ============================================================
   CATÁLOGOS CALL CENTER
   ============================================================ */

export async function getMotivosNoContactoOptions():
  Promise<SelectOption[]> {
  const response =
    await apiRequest<
      ApiResponse<
        CallCenterCatalogResponse[]
      >
    >(
      `/api/callcenter/catalogs/motivos-no-contacto${toQueryString({
        _t:
          Date.now(),
      })}`,
    );

  return (
    response.data
    ?? []
  )
    .filter(
      (item) =>
        item.activo !== false,
    )
    .map(
      toCatalogOption,
    );
}

export async function getMotivosNoDisposicionOptions():
  Promise<SelectOption[]> {
  const response =
    await apiRequest<
      ApiResponse<
        CallCenterCatalogResponse[]
      >
    >(
      `/api/callcenter/catalogs/motivos-no-disposicion${toQueryString({
        _t:
          Date.now(),
      })}`,
    );

  return (
    response.data
    ?? []
  )
    .filter(
      (item) =>
        item.activo !== false,
    )
    .map(
      toCatalogOption,
    );
}

/* ============================================================
   COMBOS PARA FORMULARIOS
   ============================================================ */

export async function getCallCenterEncuestadoresOptions():
  Promise<SelectOption[]> {
  const items =
    await fetchAllOptions(
      '/api/catalogs/encuestadores',
    );

  return uniqueSortedOptions(
    items
      .filter(
        (item) =>
          item.activo !== false,
      )
      .map(
        (item) => ({
          id:
            item.id,

          label:
            item.codigo
              ? `${item.codigo} - ${item.nombre ?? item.label ?? ''}`.trim()
              : `${item.nombre ?? item.label ?? ''}`.trim(),
        }),
      )
      .filter(
        (item) =>
          Boolean(item.label),
      ),
  );
}

export async function getCallCenterBarriosOptions():
  Promise<SelectOption[]> {
  const items =
    await fetchAllOptions(
      '/api/territory/barrios',
    );

  return uniqueSortedOptions(
    items
      .filter(
        (item) =>
          item.activo !== false,
      )
      .map(
        (item) => ({
          id:
            item.id,

          label:
            item.comunaNombre
              ? `${item.nombre ?? item.label ?? ''} - ${item.comunaNombre}`.trim()
              : `${item.nombre ?? item.label ?? ''}`.trim(),
        }),
      )
      .filter(
        (item) =>
          Boolean(item.label),
      ),
  );
}

export async function getCallCenterComunasOptions():
  Promise<SelectOption[]> {
  const items =
    await fetchAllOptions(
      '/api/territory/comunas',
    );

  return uniqueSortedOptions(
    items
      .filter(
        (item) =>
          item.activo !== false,
      )
      .map(
        (item) => ({
          id:
            item.id,

          label:
            item.codigo
              ? `${item.codigo} - ${item.nombre ?? item.label ?? ''}`.trim()
              : `${item.nombre ?? item.label ?? ''}`.trim(),
        }),
      )
      .filter(
        (item) =>
          Boolean(item.label),
      ),
  );
}

/* ============================================================
   VENTANILLA PARA CALL CENTER
   ============================================================ */

export async function searchVentanillaForCallCenter(
  filter:
    VentanillaCallCenterFilter = {},
) {
  const response =
    await apiRequest<
      ApiResponse<
        PageResponse<
          VentanillaCallCenterResponse
        >
      >
    >(
      `/api/ventanilla/search${toQueryString({
        page:
          filter.page
          ?? 0,

        size:
          filter.size
          ?? 10,

        fechaInicio:
          filter.fechaInicio,

        fechaFin:
          filter.fechaFin,

        numeroVentanilla:
          filter.numeroVentanilla,

        cedulaUsuario:
          filter.cedulaUsuario,

        nombreUsuario:
          filter.nombreUsuario,

        telefono:
          filter.telefono,

        barrioId:
          filter.barrioId,

        comunaId:
          filter.comunaId,

        solicitudId:
          filter.solicitudId,

        estadoSolicitudId:
          filter.estadoSolicitudId,

        activo:
          filter.activo
          ?? true,

        incluirInactivos:
          filter.incluirInactivos,

        q:
          filter.q,

        _t:
          Date.now(),
      })}`,
    );

  return response.data;
}

export async function findVentanillaByCedulaForCallCenter(
  cedulaUsuario: string,
) {
  const cedula =
    normalizeExactText(
      cedulaUsuario,
    );

  if (
    !cedula
  ) {
    return null;
  }

  const response =
    await searchVentanillaForCallCenter({
      cedulaUsuario:
        cedula,

      page:
        0,

      size:
        20,

      activo:
        true,
    });

  const content =
    getPageContent<
      VentanillaCallCenterResponse
    >(
      response,
    );

  return (
    content.find(
      (record) =>
        normalizeExactText(
          record.cedulaUsuario,
        ) === cedula,
    )
    ?? null
  );
}

/* ============================================================
   ASIGNACIÓN POR ROLES CALL CENTER
   ============================================================ */

export async function getPendientesAsignarFuncionarioCallCenter(
  filter:
    Pick<
      CallCenterFilter,
      'page' | 'size'
    > = {},
) {
  const response =
    await apiRequest<
      ApiResponse<
        PageResponse<CallCenterResponse>
      >
    >(
      `/api/callcenter/pendientes-asignar-funcionario${toQueryString({
        page:
          filter.page
          ?? 0,

        size:
          filter.size
          ?? 20,

        _t:
          Date.now(),
      })}`,
    );

  return response.data;
}

function normalizeFilterValue(
  value:
    | string
    | null
    | undefined,
  emptyValue: string,
) {
  if (
    !value
    || value === emptyValue
  ) {
    return undefined;
  }

  return value;
}

export async function getMisRegistrosCallCenter(
  filter:
    Pick<
      CallCenterFilter,
      | 'page'
      | 'size'
      | 'q'
      | 'estadoCaso'
      | 'tipoSolicitudCallcenter'
      | 'condicion'
    > = {},
) {
  const response =
    await apiRequest<
      ApiResponse<
        PageResponse<CallCenterResponse>
      >
    >(
      `/api/callcenter/mis-registros-callcenter${toQueryString({
        page:
          filter.page
          ?? 0,

        size:
          filter.size
          ?? 20,

        q:
          filter.q,

        estadoCaso:
          normalizeFilterValue(
            filter.estadoCaso,
            'TODOS',
          ),

        tipoSolicitudCallcenter:
          normalizeFilterValue(
            filter.tipoSolicitudCallcenter,
            'TODOS',
          ),

        condicion:
          normalizeFilterValue(
            filter.condicion,
            'TODOS',
          ),

        _t:
          Date.now(),
      })}`,
    );

  return response.data;
}

export async function getFuncionariosCallCenterOptions():
  Promise<
    CallCenterUserOptionResponse[]
  > {
  const response =
    await apiRequest<
      ApiResponse<
        CallCenterUserOptionResponse[]
      >
    >(
      `/api/callcenter/catalogs/funcionarios-callcenter${toQueryString({
        _t:
          Date.now(),
      })}`,
    );

  return response.data
    ?? [];
}

export async function asignarFuncionarioCallCenter(
  request:
    CallCenterAsignarFuncionarioRequest,
) {
  const response =
    await apiRequest<
      ApiResponse<
        CallCenterResponse[]
      >
    >(
      '/api/callcenter/asignar-funcionario-callcenter',
      {
        method:
          'PATCH',

        body:
          request,
      },
    );

  return response.data;
}

export async function asignarEncuestadorCallCenter(
  request:
    CallCenterAsignarEncuestadorRequest,
) {
  const response =
    await apiRequest<
      ApiResponse<
        CallCenterResponse[]
      >
    >(
      '/api/callcenter/asignar-encuestador',
      {
        method:
          'PATCH',

        body:
          request,
      },
    );

  return response.data;
}