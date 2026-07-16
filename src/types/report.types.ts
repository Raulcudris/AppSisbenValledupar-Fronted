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

export type VentanillaSolicitudPreviewRow = {
  solicitud: string;
  cantidadesPorFecha: Record<string, number>;
  totalGeneral: number;
  porcentaje: number;
};

export type VentanillaSolicitudPreviewResponse = {
  fechaInicio: string;
  fechaFin: string;
  tipoAgrupacion: 'DIARIA' | 'MENSUAL';
  fechas: string[];
  totalGeneral: number;
  filas: VentanillaSolicitudPreviewRow[];
};

export type VentanillaDailyTrendResponse = {
  fecha: string;
  total: number;
};

export type VentanillaFuncionarioPerformanceResponse = {
  funcionarioId: number | null;
  funcionarioUsername: string | null;
  total: number;
  porcentaje: number;
  promedioDiario: number;
};

export type VentanillaFuncionarioTrendResponse = {
  fecha: string;
  funcionarioUsername: string | null;
  total: number;
};

export type VentanillaSolicitudesReportParams = {
  fechaInicio: string;
  fechaFin: string;
};

export type VentanillaFrequentCitizenResponse = {
  cedulaUsuario: string;
  nombreUsuario: string | null;
  telefono: string | null;
  totalVisitas: number;
  totalSolicitudes: number;
  primeraVisita: string | null;
  ultimaVisita: string | null;
};

export type ProductivityGrouping = 'SEMANAL' | 'MENSUAL';

export type VentanillaEmployeeProductivityResponse = {
  periodo: string;
  fechaInicioPeriodo: string;
  fechaFinPeriodo: string;
  funcionarioId: number | null;
  funcionarioUsername: string | null;
  totalAtenciones: number;
  porcentaje: number;
  promedioDiario: number;
};