import { apiRequest } from '@/lib/apiClient';
import { toQueryString } from '@/lib/queryString';
import { ApiResponse, PageResponse } from '@/types/api.types';
import { AuditFilter, AuditLogResponse } from '@/types/audit.types';

export async function searchAudit(filter: AuditFilter) {
  const response = await apiRequest<ApiResponse<PageResponse<AuditLogResponse>>>(
    `/api/audit/search${toQueryString({
      ...filter,
      page: filter.page ?? 0,
      size: filter.size ?? 10,
    })}`
  );

  return response.data;
}
