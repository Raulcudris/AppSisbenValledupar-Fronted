export type VentanillaFilter = {
  fechaInicio?: string;
  fechaFin?: string;
  numeroVentanilla?: string;
  cedulaUsuario?: string;
  nombreUsuario?: string;
  funcionarioId?: string;
  categoriaId?: string;
  solicitudId?: string;
  estadoSolicitudId?: string;
  barrioId?: string;
  comunaId?: string;
  extranjero?: string;
  incluirInactivos?: boolean;
  activo?: boolean;
  page?: number;
  size?: number;
};

export type VentanillaRequest = {
  fecha: string;
  numeroVentanilla: string;
  cedulaUsuario: string;
  nombreUsuario: string;
  telefono: string;
  categoriaId: number;
  direccion: string;
  barrioId: number;
  extranjero: boolean;
  solicitudId: number;
  estadoSolicitudId: number;
  observacion: string;
  motivoRepeticion?: string;
};

export type VentanillaTraceabilityBadgeResponse = {
  nivel: string;
  etiqueta: string;
  color: string;
  descripcion: string;
  totalVisitas: number;
  visitasUltimos30Dias: number;
  ultimaVisitaAnterior: string | null;
  diasDesdeUltimaVisitaAnterior: number | null;
  ciudadanoFrecuente: boolean;
};

export type VentanillaResponse = {
  id: number;
  fecha: string;
  numeroVentanilla: string;
  funcionarioId: number;
  funcionarioUsername: string;
  cedulaUsuario: string;
  nombreUsuario: string;
  telefono: string;
  categoriaId: number;
  categoriaNombre: string;
  direccion: string;
  barrioId: number;
  barrioNombre: string;
  comunaNombre: string;
  extranjero: boolean;
  solicitudId: number;
  solicitudNombre: string;
  estadoSolicitudId: number;
  estadoSolicitudNombre: string;
  observacion: string;
  motivoRepeticion: string | null;
  activo: boolean;
  trazabilidad?: VentanillaTraceabilityBadgeResponse | null;
};

export type VentanillaDailyValidationStatus =
  | 'PRIMERA_SOLICITUD'
  | 'SOLICITUD_DIFERENTE_MISMA_FECHA'
  | 'SOLICITUD_DUPLICADA_MISMA_FECHA';

export type VentanillaDailyRequestItemResponse = {
  id: number;
  fecha: string;
  numeroVentanilla: string;
  funcionarioId: number | null;
  funcionarioUsername: string | null;
  cedulaUsuario: string;
  nombreUsuario: string;
  telefono: string | null;
  categoriaId: number | null;
  categoriaNombre: string | null;
  direccion: string | null;
  barrioId: number | null;
  barrioNombre: string | null;
  comunaNombre: string | null;
  extranjero: boolean | null;
  solicitudId: number | null;
  solicitudNombre: string | null;
  estadoSolicitudId: number | null;
  estadoSolicitudNombre: string | null;
  observacion: string | null;
  motivoRepeticion: string | null;
  activo: boolean | null;
};

export type VentanillaDailyValidationResponse = {
  estado: VentanillaDailyValidationStatus;
  titulo: string;
  mensaje: string;
  puedeContinuar: boolean;
  requiereConfirmacion: boolean;
  totalSolicitudesMismaFecha: number;
  solicitudesMismaFecha: VentanillaDailyRequestItemResponse[];
};

export type VentanillaCitizenHistoryResponse = {
  cedulaUsuario: string;
  nombreUsuario: string | null;
  telefono: string | null;
  totalVisitas: number;
  totalSolicitudes: number;
  ultimaVisita: string | null;
  solicitudes: VentanillaDailyRequestItemResponse[];
};

export type DmcFilter = {
  fechaInicio?: string;
  fechaFin?: string;
  funcionarioId?: string;
  tipoDmcId?: string;
  encuestadorId?: string;
  barrioId?: string;
  comunaId?: string;
  page?: number;
  size?: number;
};

export type DmcRequest = {
  fecha: string;
  tipoDmcId: number;
  encuestadorId: number;
  cantidad: number;
  observacion?: string;
  barrioId: number;
};

export type DmcResponse = {
  id: number;
  fecha: string;
  funcionarioId: number;
  funcionarioUsername: string;
  tipoDmcId: number;
  tipoDmcCodigo: string;
  tipoDmcNombre: string;
  encuestadorId: number;
  encuestadorNombre: string;
  cantidad: number;
  observacion?: string | null;
  barrioId: number;
  barrioNombre: string;
  comunaNombre?: string | null;
};

export type VentanillaUserHistorySummaryResponse = {
  cedulaUsuario: string;
  nombreUsuario: string | null;
  telefono: string | null;
  totalVisitas: number;
  totalSolicitudes: number;
  primeraVisita: string | null;
  ultimaVisita: string | null;
};

export type VentanillaUserHistoryItemResponse = {
  id: number;
  fecha: string;
  numeroVentanilla: string;
  funcionarioId: number | null;
  funcionarioUsername: string | null;
  cedulaUsuario: string;
  nombreUsuario: string | null;
  telefono: string | null;
  categoriaId: number | null;
  categoriaNombre: string | null;
  direccion: string | null;
  barrioId: number | null;
  barrioNombre: string | null;
  comunaNombre: string | null;
  extranjero: boolean | null;
  solicitudId: number | null;
  solicitudNombre: string | null;
  estadoSolicitudId: number | null;
  estadoSolicitudNombre: string | null;
  observacion: string | null;
  motivoRepeticion: string | null;
activo: boolean | null;
};

export type VentanillaUserHistoryResponse = {
  cedulaUsuario: string;
  nombreUsuario: string | null;
  telefono: string | null;
  totalVisitas: number;
  totalSolicitudes: number;
  primeraVisita: string | null;
  ultimaVisita: string | null;
  solicitudes: VentanillaUserHistoryItemResponse[];
};

export type VentanillaUserHistoryFilter = {
  search?: string;
  page?: number;
  size?: number;
};