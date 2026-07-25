import { apiRequest } from '@/lib/apiClient';
import { ApiResponse, PageResponse } from '@/types/api.types';
import { SelectOption } from '@/types/catalog.types';

type QueryValue = string | number | boolean | undefined | null;

type OptionRecord = {
  id: number;
  codigo?: string | null;
  nombre?: string | null;
  label?: string | null;
  activo?: boolean;
  comunaNombre?: string | null;
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

function uniqueSortedOptions(items: SelectOption[]) {
  const uniqueById = new Map<number, SelectOption>();

  items.forEach((item) => {
    uniqueById.set(item.id, item);
  });

  return Array.from(uniqueById.values()).sort((a, b) =>
    a.label.localeCompare(b.label, 'es')
  );
}

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
