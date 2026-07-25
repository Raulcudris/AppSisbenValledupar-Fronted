export type BooleanFilterValue = 'ALL' | 'YES' | 'NO';
export type StatusFilterValue = 'ALL' | 'ACTIVE' | 'INACTIVE';
export type CallCenterOrigenRegistro = 'VENTANILLA' | 'MANUAL' | 'IMPORTACION';
export type CallCenterTipoRegistro = 'LLAMADA' | 'BASE_ENCUESTADOR';

export type EstadoVisita =
  | 'PENDIENTE'
  | 'PROGRAMADA'
  | 'REALIZADA'
  | 'NO_ATENDIDA'
  | 'REPROGRAMADA'
  | 'CANCELADA';

export type CallCenterCatalogResponse = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
};

export type CallCenterSummaryResponse = {
  totalRegistros: number;
  llamadasConectadas: number;
  llamadasNoConectadas: number;
  activos: number;
  inactivos: number;
};

export type CallCenterFilter = {
  page?: number;
  size?: number;
  fechaInicio?: string;
  fechaFin?: string;
  funcionarioId?: number | string;
  cedulaSolicitante?: string;
  nombreCompleto?: string;
  telefono?: string;
  llamadaConectada?: boolean;
  motivoNoContactoId?: number | string;
  encuestadorProgramadoId?: number | string;
  encuestadorAsignadoId?: number | string;
  fechaEncuestaInicio?: string;
  fechaEncuestaFin?: string;
  solicitoNuevaEncuesta?: boolean;
  barrioId?: number | string;
  comunaId?: number | string;
  disposicionRecibirEncuesta?: boolean;
  explicoInformanteCalificado?: boolean;
  activo?: boolean;
  q?: string;
  tipoRegistro?: CallCenterTipoRegistro | string;
  origenRegistro?: CallCenterOrigenRegistro | string;
  ventanillaRegistroId?: number | string;
  verificado?: boolean;
  estadoVisita?: EstadoVisita | string;
  encuestaRealizada?: boolean;
};

export type CallCenterRequest = {
  marcaTemporal?: string | null;
  fechaLlamada: string;
  horaLlamada?: string | null;
  tipoRegistro?: CallCenterTipoRegistro | string | null;
  origenRegistro?: CallCenterOrigenRegistro | string | null;
  ventanillaRegistroId?: number | null;
  cedulaSolicitante: string;
  nombreCompleto: string;
  telefono?: string | null;
  llamadaConectada: boolean;
  motivoNoContactoId?: number | null;
  motivoNoContactoTexto?: string | null;
  encuestadorProgramadoId?: number | null;
  fechaEncuestaProgramada?: string | null;
  solicitoNuevaEncuesta?: boolean | null;
  direccionTexto?: string | null;
  barrioId?: number | null;
  fechaAplicacionInformada?: string | null;
  disposicionRecibirEncuesta?: boolean | null;
  motivoNoDisposicionId?: number | null;
  motivoNoDisposicionTexto?: string | null;
  encuestadorAsignadoId?: number | null;
  explicoInformanteCalificado?: boolean | null;
  verificado?: boolean | null;
  observacion?: string | null;
  activo?: boolean;
};

export type CallCenterVisitaRequest = {
  estadoVisita: EstadoVisita;
  fechaVisitaReal?: string | null;
  horaVisitaReal?: string | null;
  encuestaRealizada?: boolean | null;
  motivoNoEncuesta?: string | null;
  fechaReprogramacion?: string | null;
  observacionEncuestador?: string | null;
  verificado?: boolean | null;
};

export type CallCenterResponse = {
  id: number;
  marcaTemporal?: string | null;
  fechaLlamada: string;
  horaLlamada?: string | null;
  tipoRegistro?: CallCenterTipoRegistro | string | null;
  origenRegistro?: CallCenterOrigenRegistro | string | null;
  ventanillaRegistroId?: number | null;
  ventanillaNumeroVentanilla?: string | null;
  ventanillaFecha?: string | null;
  funcionarioId?: number | null;
  funcionarioUsername?: string | null;
  cedulaSolicitante: string;
  nombreCompleto: string;
  telefono?: string | null;
  llamadaConectada: boolean;
  motivoNoContactoId?: number | null;
  motivoNoContactoCodigo?: string | null;
  motivoNoContactoNombre?: string | null;
  motivoNoContactoTexto?: string | null;
  encuestadorProgramadoId?: number | null;
  encuestadorProgramadoNombre?: string | null;
  fechaEncuestaProgramada?: string | null;
  solicitoNuevaEncuesta?: boolean | null;
  direccionTexto?: string | null;
  barrioId?: number | null;
  barrioNombre?: string | null;
  comunaId?: number | null;
  comunaNombre?: string | null;
  fechaAplicacionInformada?: string | null;
  disposicionRecibirEncuesta?: boolean | null;
  motivoNoDisposicionId?: number | null;
  motivoNoDisposicionCodigo?: string | null;
  motivoNoDisposicionNombre?: string | null;
  motivoNoDisposicionTexto?: string | null;
  encuestadorAsignadoId?: number | null;
  encuestadorAsignadoNombre?: string | null;
  explicoInformanteCalificado?: boolean | null;
  verificado?: boolean | null;
  estadoVisita?: EstadoVisita | string | null;
  fechaVisitaReal?: string | null;
  horaVisitaReal?: string | null;
  encuestaRealizada?: boolean | null;
  motivoNoEncuesta?: string | null;
  fechaReprogramacion?: string | null;
  observacionEncuestador?: string | null;
  observacion?: string | null;
  activo: boolean;
};

export type VentanillaCallCenterResponse = {
  id: number;
  fecha?: string | null;
  numeroVentanilla?: string | null;
  cedulaUsuario?: string | null;
  nombreUsuario?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  barrioId?: number | null;
  barrioNombre?: string | null;
  comunaId?: number | null;
  comunaNombre?: string | null;
  solicitudId?: number | null;
  solicitudNombre?: string | null;
  estadoSolicitudId?: number | null;
  estadoSolicitudNombre?: string | null;
  observacion?: string | null;
  activo?: boolean;
};

export type VentanillaCallCenterFilter = {
  page?: number;
  size?: number;
  fechaInicio?: string;
  fechaFin?: string;
  numeroVentanilla?: string;
  cedulaUsuario?: string;
  nombreUsuario?: string;
  telefono?: string;
  barrioId?: number | string;
  comunaId?: number | string;
  solicitudId?: number | string;
  estadoSolicitudId?: number | string;
  activo?: boolean;
  incluirInactivos?: boolean;
  q?: string;
};