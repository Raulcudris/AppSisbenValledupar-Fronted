export type ReportDateRange = {
  fechaInicio?: string;
  fechaFin?: string;
};

export type VentanillaReportSummaryResponse = {
  totalRegistros: number;
  pendientes: number;
  realizadas: number;
  aprobadas: number;
  rechazadas: number;
  canceladas: number;
  revisar: number;
  extranjeros: number;
  nacionales: number;
};

export type DmcReportSummaryResponse = {
  totalRegistros: number;
  totalCantidad: number;
  totalCargadas: number;
  totalDescargadas: number;
  totalRechazadas: number;
};

export type ReportGroupResponse = {
  id: number | null;
  codigo: string | null;
  nombre: string | null;
  total: number;
};
