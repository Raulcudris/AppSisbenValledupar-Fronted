import { apiDownload, apiRequest } from '@/lib/apiClient';
import { downloadBlob } from '@/lib/downloadFile';
import { toQueryString } from '@/lib/queryString';
import { ApiResponse } from '@/types/api.types';
import { ExportDmcPreviewResponse, ExportVentanillaPreviewResponse } from '@/types/export.types';
import { VentanillaFilter } from '@/types/operational.types';
import { ReportDateRange, VentanillaEmployeeDetailedPerformanceResponse, VentanillaSolicitudesReportParams } from '@/types/report.types';

type QueryValue = string | number | undefined;

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

  return response.data;
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

  return response.data;
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

