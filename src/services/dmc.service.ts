import { apiRequest } from '@/lib/apiClient';
import { toQueryString } from '@/lib/queryString';
import { ApiResponse, PageResponse } from '@/types/api.types';
import {
  DmcFilter,
  DmcRequest,
  DmcResponse,
} from '@/types/operational.types';

export async function searchDmc(filter: DmcFilter) {
  const response = await apiRequest<ApiResponse<PageResponse<DmcResponse>>>(
    `/api/dmc/search${toQueryString({
      ...filter,
      page: filter.page ?? 0,
      size: filter.size ?? 10,
    })}`
  );

  return response.data;
}

export async function getDmcById(id: number) {
  const response = await apiRequest<ApiResponse<DmcResponse>>(`/api/dmc/${id}`);
  return response.data;
}

export async function createDmc(request: DmcRequest) {
  const response = await apiRequest<ApiResponse<DmcResponse>>('/api/dmc', {
    method: 'POST',
    body: request,
  });

  return response.data;
}

export async function updateDmc(id: number, request: DmcRequest) {
  const response = await apiRequest<ApiResponse<DmcResponse>>(`/api/dmc/${id}`, {
    method: 'PUT',
    body: request,
  });

  return response.data;
}
