import { apiDownload, apiRequest } from '@/lib/apiClient';
import { downloadBlob } from '@/lib/downloadFile';
import { toQueryString } from '@/lib/queryString';
import { ApiResponse } from '@/types/api.types';
import { ExportDmcPreviewResponse, ExportVentanillaPreviewResponse } from '@/types/export.types';
import { VentanillaFilter } from '@/types/operational.types';
import {
  DmcComunaTotalResponse,
  DmcEncuestadorPerformanceResponse,
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

type QueryValue = string | number | undefined;

type DmcGroupType =
  | 'by-type'
  | 'by-tipo'
  | 'by-encuestador'
  | 'by-funcionario'
  | 'by-neighborhood'
  | 'by-barrio'
  | 'by-comuna';

type VentanillaGroupType =
  | 'by-status'
  | 'by-request-type'
  | 'by-category'
  | 'by-user'
  | 'by-neighborhood'
  | 'by-comuna';

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

function buildVentanillaExportQuery(filter: Partial<VentanillaFilter>): Record<string, QueryValue> {
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
  };
}

function buildDateRangeQuery(filter: ReportDateRange): Record<string, QueryValue> {
  return {
    fechaInicio: toQueryValue(filter.fechaInicio),
    fechaFin: toQueryValue(filter.fechaFin),
  };
}

async function download(path: string) {
  const { blob, filename } = await apiDownload(path);
  downloadBlob(blob, filename);
}

function unwrapData<T>(response: ApiResponse<T>): T {
  return response.data;
}

function normalizeDmcGroupPath(group: DmcGroupType) {
  const map: Record<DmcGroupType, string> = {
    'by-type': 'by-type',
    'by-tipo': 'by-type',
    'by-encuestador': 'by-encuestador',
    'by-funcionario': 'by-funcionario',
    'by-neighborhood': 'by-neighborhood',
    'by-barrio': 'by-neighborhood',
    'by-comuna': 'by-comuna',
  };

  return map[group];
}

export async function previewExportVentanilla(
  filter: Partial<VentanillaFilter>,
  limit = 200
) {
  const response = await apiRequest<ApiResponse<ExportVentanillaPreviewResponse[]>>(
    `/api/export/preview/ventanilla${toQueryString({
      ...buildVentanillaExportQuery(filter),
      limit,
    })}`
  );

  return unwrapData(response);
}

export async function previewExportDmc(
  filter: ReportDateRange,
  limit = 200
) {
  const response = await apiRequest<ApiResponse<ExportDmcPreviewResponse[]>>(
    `/api/export/preview/dmc${toQueryString({
      ...buildDateRangeQuery(filter),
      limit,
    })}`
  );

  return unwrapData(response);
}

export function exportVentanilla(filter: Partial<VentanillaFilter>) {
  return download(`/api/export/ventanilla${toQueryString(buildVentanillaExportQuery(filter))}`);
}

export function exportDmc(filter: ReportDateRange) {
  return download(`/api/export/dmc${toQueryString(buildDateRangeQuery(filter))}`);
}

export function exportVentanillaReport(filter: ReportDateRange) {
  return download(`/api/export/reports/ventanilla${toQueryString(buildDateRangeQuery(filter))}`);
}

export function exportDmcReport(filter: ReportDateRange) {
  return download(`/api/export/reports/dmc${toQueryString(buildDateRangeQuery(filter))}`);
}

export async function exportVentanillaUserHistory(cedulaUsuario: string) {
  const { blob, filename } = await apiDownload(
    `/api/ventanilla/historial/usuario/export${toQueryString({
      cedulaUsuario,
    })}`
  );

  const safeCedula = String(cedulaUsuario || 'usuario').trim() || 'usuario';
  const safeFilename = filename === 'reporte.xlsx'
    ? `historial-usuario-${safeCedula}.csv`
    : filename;

  downloadBlob(blob, safeFilename);
}

export async function exportVentanillaUserHistoryPdf(cedulaUsuario: string) {
  const { blob, filename } = await apiDownload(
    `/api/ventanilla/historial/usuario/export/pdf${toQueryString({
      cedulaUsuario,
    })}`
  );

  const safeCedula = String(cedulaUsuario || 'usuario').trim() || 'usuario';
  const safeFilename = filename === 'reporte.xlsx'
    ? `historial-usuario-${safeCedula}.pdf`
    : filename;

  downloadBlob(blob, safeFilename);
}

export async function getVentanillaSummary(filter: ReportDateRange) {
  const response = await apiRequest<ApiResponse<VentanillaReportSummaryResponse>>(
    `/api/reports/ventanilla/summary${toQueryString(buildDateRangeQuery(filter))}`
  );

  return unwrapData(response);
}

export async function getDmcSummary(filter: ReportDateRange) {
  const response = await apiRequest<ApiResponse<DmcReportSummaryResponse>>(
    `/api/reports/dmc/summary${toQueryString(buildDateRangeQuery(filter))}`
  );

  return unwrapData(response);
}

export async function getVentanillaGroup(
  group: VentanillaGroupType,
  filter: ReportDateRange
) {
  const response = await apiRequest<ApiResponse<ReportGroupResponse[]>>(
    `/api/reports/ventanilla/${group}${toQueryString(buildDateRangeQuery(filter))}`
  );

  return unwrapData(response);
}

export async function getDmcGroup(
  group: DmcGroupType,
  filter: ReportDateRange
) {
  const response = await apiRequest<ApiResponse<ReportGroupResponse[]>>(
    `/api/reports/dmc/${normalizeDmcGroupPath(group)}${toQueryString(buildDateRangeQuery(filter))}`
  );

  return unwrapData(response);
}

export async function previewVentanillaSolicitudes(
  filter: VentanillaSolicitudesReportParams
) {
  const response = await apiRequest<ApiResponse<VentanillaSolicitudPreviewResponse>>(
    `/api/reports/ventanilla/solicitudes/preview${toQueryString(buildDateRangeQuery(filter))}`
  );

  return unwrapData(response);
}

export function downloadVentanillaSolicitudesPdf(
  filter: VentanillaSolicitudesReportParams
) {
  return download(`/api/reports/ventanilla/solicitudes/pdf${toQueryString(buildDateRangeQuery(filter))}`);
}

export async function getVentanillaSolicitudesTrend(filter: ReportDateRange) {
  const response = await apiRequest<ApiResponse<VentanillaDailyTrendResponse[]>>(
    `/api/reports/ventanilla/solicitudes/tendencia${toQueryString(buildDateRangeQuery(filter))}`
  );

  return unwrapData(response);
}

export async function getVentanillaFuncionariosDesempeno(filter: ReportDateRange) {
  const response = await apiRequest<ApiResponse<VentanillaFuncionarioPerformanceResponse[]>>(
    `/api/reports/ventanilla/funcionarios/desempeno${toQueryString(buildDateRangeQuery(filter))}`
  );

  return unwrapData(response);
}

export const getVentanillaFuncionariosPerformance = getVentanillaFuncionariosDesempeno;

export async function getVentanillaFuncionariosTrend(filter: ReportDateRange) {
  const response = await apiRequest<ApiResponse<VentanillaFuncionarioTrendResponse[]>>(
    `/api/reports/ventanilla/funcionarios/tendencia${toQueryString(buildDateRangeQuery(filter))}`
  );

  return unwrapData(response);
}

export async function getVentanillaEmployeeProductivity(
  filter: ReportDateRange,
  grouping: ProductivityGrouping = 'SEMANAL'
) {
  const response = await apiRequest<ApiResponse<VentanillaEmployeeProductivityResponse[]>>(
    `/api/reports/ventanilla/employee-productivity${toQueryString({
      ...buildDateRangeQuery(filter),
      grouping,
    })}`
  );

  return unwrapData(response);
}

export async function getVentanillaFrequentCitizens(
  filter: ReportDateRange,
  limit = 50
) {
  const response = await apiRequest<ApiResponse<VentanillaFrequentCitizenResponse[]>>(
    `/api/reports/ventanilla/frequent-citizens${toQueryString({
      ...buildDateRangeQuery(filter),
      limit,
    })}`
  );

  return unwrapData(response);
}

export async function getVentanillaEmployeeDetailedPerformance(filter: ReportDateRange) {
  const response = await apiRequest<ApiResponse<VentanillaEmployeeDetailedPerformanceResponse[]>>(
    `/api/reports/ventanilla/funcionarios/desempeno-detallado${toQueryString(buildDateRangeQuery(filter))}`
  );

  return unwrapData(response);
}

export async function getDmcEncuestadoresDesempeno(filter: ReportDateRange) {
  const response = await apiRequest<ApiResponse<DmcEncuestadorPerformanceResponse[]>>(
    `/api/reports/dmc/encuestadores/desempeno${toQueryString(buildDateRangeQuery(filter))}`
  );

  return unwrapData(response);
}

export async function getDmcComunasTotales(filter: ReportDateRange) {
  const response = await apiRequest<ApiResponse<DmcComunaTotalResponse[]>>(
    `/api/reports/dmc/comunas/totales${toQueryString(buildDateRangeQuery(filter))}`
  );

  return unwrapData(response);
}