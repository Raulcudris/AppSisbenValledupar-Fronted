import { apiDownload, apiRequest } from '@/lib/apiClient';
import { toQueryString } from '@/lib/queryString';
import { ApiResponse } from '@/types/api.types';
import {
  DmcReportSummaryResponse,
  ProductivityGrouping,
  ReportDateRange,
  ReportGroupResponse,
  VentanillaDailyTrendResponse,
  VentanillaEmployeeDetailedPerformanceResponse,
  VentanillaEmployeeProductivityResponse,
  VentanillaFrequentCitizenResponse,
  VentanillaFuncionarioPerformanceResponse,
  VentanillaFuncionarioTrendResponse,
  VentanillaReportSummaryResponse,
  VentanillaSolicitudPreviewResponse,
  VentanillaSolicitudesReportParams,
} from '@/types/report.types';

export async function getVentanillaSummary(filter: ReportDateRange) {
  const response = await apiRequest<ApiResponse<VentanillaReportSummaryResponse>>(
    `/api/reports/ventanilla/summary${toQueryString(filter)}`
  );

  return response.data;
}

export async function getVentanillaGroup(path: string, filter: ReportDateRange) {
  const response = await apiRequest<ApiResponse<ReportGroupResponse[]>>(
    `/api/reports/ventanilla/${path}${toQueryString(filter)}`
  );

  return response.data;
}

export async function getDmcSummary(filter: ReportDateRange) {
  const response = await apiRequest<ApiResponse<DmcReportSummaryResponse>>(
    `/api/reports/dmc/summary${toQueryString(filter)}`
  );

  return response.data;
}

export async function getDmcGroup(path: string, filter: ReportDateRange) {
  const response = await apiRequest<ApiResponse<ReportGroupResponse[]>>(
    `/api/reports/dmc/${path}${toQueryString(filter)}`
  );

  return response.data;
}

function buildQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, String(value));
    }
  });

  const queryString = query.toString();

  return queryString ? `?${queryString}` : '';
}

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();

  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function previewVentanillaSolicitudes(
  params: VentanillaSolicitudesReportParams
) {
  const response = await apiRequest<ApiResponse<VentanillaSolicitudPreviewResponse>>(
    `/api/reportes/ventanilla/solicitudes/preview${buildQuery(params)}`
  );

  return response.data;
}

export async function downloadVentanillaSolicitudesPdf(
  params: VentanillaSolicitudesReportParams
) {
  const response = await apiDownload(
    `/api/reportes/ventanilla/solicitudes/pdf${buildQuery(params)}`,
    'application/pdf'
  );

  downloadBlob(response.blob, response.filename);

  return response;
}

export async function getVentanillaSolicitudesTrend(
  params: VentanillaSolicitudesReportParams
) {
  const response = await apiRequest<ApiResponse<VentanillaDailyTrendResponse[]>>(
    `/api/reportes/ventanilla/solicitudes/tendencia${buildQuery(params)}`
  );

  return response.data;
}

export async function getVentanillaFuncionariosPerformance(
  params: VentanillaSolicitudesReportParams
) {
  const response = await apiRequest<ApiResponse<VentanillaFuncionarioPerformanceResponse[]>>(
    `/api/reportes/ventanilla/funcionarios/desempeno${buildQuery(params)}`
  );

  return response.data;
}

export async function getVentanillaFuncionariosTrend(
  params: VentanillaSolicitudesReportParams
) {
  const response = await apiRequest<ApiResponse<VentanillaFuncionarioTrendResponse[]>>(
    `/api/reportes/ventanilla/funcionarios/tendencia${buildQuery(params)}`
  );

  return response.data;
}

export async function getVentanillaFrequentCitizens(
  filter: ReportDateRange,
  limit = 50
) {
  const response = await apiRequest<ApiResponse<VentanillaFrequentCitizenResponse[]>>(
    `/api/reports/ventanilla/frequent-citizens${toQueryString({
      ...filter,
      limit,
    })}`
  );

  return response.data;
}

export async function getVentanillaEmployeeProductivity(
  filter: ReportDateRange,
  grouping: ProductivityGrouping = 'SEMANAL'
) {
  const response = await apiRequest<ApiResponse<VentanillaEmployeeProductivityResponse[]>>(
    `/api/reports/ventanilla/employee-productivity${toQueryString({
      ...filter,
      grouping,
    })}`
  );

  return response.data;
}

export async function getVentanillaEmployeeDetailedPerformance(
  params: VentanillaSolicitudesReportParams
) {
  const response = await apiRequest<ApiResponse<VentanillaEmployeeDetailedPerformanceResponse[]>>(
    `/api/reportes/ventanilla/funcionarios/desempeno-detallado${buildQuery(params)}`
  );

  return response.data;
}