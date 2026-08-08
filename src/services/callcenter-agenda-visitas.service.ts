import {
  apiRequest,
} from '@/lib/apiClient';

import type {
  ApiResponse,
  PageResponse,
} from '@/types/api.types';

import type {
  CallCenterAgendaVisitaResponse,
  CallCenterAgendaVisitasFilter,
  EncuestadorAgendaOption,
} from '@/types/callcenter-agenda-visitas.types';

function getPageContent<T>(
  response:
    unknown,
): T[] {
  const data =
    response as {
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
  response:
    unknown,

  fallback:
    number,
) {
  const data =
    response as {
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
    ?? fallback
  );
}

/**
 * Consulta la agenda diaria de un encuestador.
 */
export async function getCallCenterAgendaVisitas(
  filter:
    CallCenterAgendaVisitasFilter,
) {
  const query =
    new URLSearchParams();

  query.set(
    'encuestadorId',
    String(
      filter.encuestadorId,
    ),
  );

  query.set(
    'fecha',
    filter.fecha,
  );

  query.set(
    'page',
    String(
      filter.page
      ?? 0,
    ),
  );

  query.set(
    'size',
    String(
      filter.size
      ?? 20,
    ),
  );

  const response =
    await apiRequest<
      ApiResponse<
        PageResponse<
          CallCenterAgendaVisitaResponse
        >
      >
    >(
      `/api/callcenter/visitas/agenda?${query.toString()}`,
    );

  return response.data;
}

/**
 * Obtiene todos los encuestadores activos disponibles
 * para el selector de agenda.
 */
export async function getEncuestadoresAgenda() {
  const pageSize =
    100;

  let page =
    0;

  const allItems:
    EncuestadorAgendaOption[] =
    [];

  while (true) {
    const query =
      new URLSearchParams();

    query.set(
      'page',
      String(
        page,
      ),
    );

    query.set(
      'size',
      String(
        pageSize,
      ),
    );

    const response =
      await apiRequest<
        ApiResponse<
          PageResponse<
            EncuestadorAgendaOption
          >
        >
      >(
        `/api/catalogs/encuestadores?${query.toString()}`,
      );

    const pageResponse =
      response.data;

    const content =
      getPageContent<
        EncuestadorAgendaOption
      >(
        pageResponse,
      );

    allItems.push(
      ...content,
    );

    const total =
      getTotalElements(
        pageResponse,
        allItems.length,
      );

    if (
      content.length === 0
      || content.length < pageSize
      || allItems.length >= total
    ) {
      break;
    }

    page += 1;
  }

  return allItems
    .filter(
      (item) =>
        item.activo === true,
    )
    .sort(
      (
        first,
        second,
      ) =>
        first.nombre.localeCompare(
          second.nombre,
          'es',
        ),
    );
}