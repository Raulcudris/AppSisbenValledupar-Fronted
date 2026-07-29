/**
 * Valores usados para filtros booleanos visuales.
 */
export type BooleanFilterValue = 'ALL' | 'YES' | 'NO';

/**
 * Valores usados para filtros de estado activo/inactivo.
 */
export type StatusFilterValue = 'ALL' | 'ACTIVE' | 'INACTIVE';

/**
 * Origen desde donde nace el caso Call Center.
 */
export type CallCenterOrigenRegistro =
  | 'VENTANILLA'
  | 'MANUAL'
  | 'IMPORTACION';

/**
 * Tipo técnico del registro Call Center.
 */
export type CallCenterTipoRegistro =
  | 'LLAMADA'
  | 'BASE_ENCUESTADOR';

/**
 * Tipo de solicitud que origina la gestión Call Center.
 *
 * Estos valores ayudan a identificar si el caso viene por nueva encuesta,
 * inclusión, verificación u otro proceso relacionado.
 */
export type CallCenterTipoSolicitud =
  | 'NUEVA_ENCUESTA'
  | 'INCLUSION'
  | 'VERIFICACION'
  | 'OTRO'
  | string;

/**
 * Estado formal del caso maestro Call Center.
 */
export type CallCenterEstadoCaso =
  | 'PENDIENTE_ENRUTAMIENTO'
  | 'ASIGNADO_CALLCENTER'
  | 'EN_GESTION_LLAMADA'
  | 'NO_CONTACTADO'
  | 'CONTACTADO_SIN_DISPOSICION'
  | 'PENDIENTE_ASIGNAR_ENCUESTADOR'
  | 'ASIGNADO_ENCUESTADOR'
  | 'VISITA_PROGRAMADA'
  | 'VISITA_REALIZADA'
  | 'VISITA_NO_ATENDIDA'
  | 'REPROGRAMADO'
  | 'CERRADO'
  | 'CANCELADO'
  | string;

/**
 * Estado operativo de la visita asignada al encuestador.
 */
export type EstadoVisita =
  | 'PENDIENTE'
  | 'PROGRAMADA'
  | 'REALIZADA'
  | 'NO_ATENDIDA'
  | 'REPROGRAMADA'
  | 'CANCELADA'
  | string;

/**
 * Respuesta de catálogos del módulo Call Center.
 */
export type CallCenterCatalogResponse = {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
};

/**
 * Resumen general del módulo Call Center.
 */
export type CallCenterSummaryResponse = {
  totalRegistros: number;
  llamadasConectadas: number;
  llamadasNoConectadas: number;
  activos: number;
  inactivos: number;
};

/**
 * Filtros disponibles para consultar registros Call Center.
 */
export type CallCenterFilter = {
  page?: number;
  size?: number;
  fechaInicio?: string;
  fechaFin?: string;
  funcionarioId?: number | string;
  funcionarioCallcenterAsignadoId?: number | string;
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

  /**
   * Estado formal del caso Call Center.
   */
  estadoCaso?: CallCenterEstadoCaso | string;

  /**
   * Tipo de solicitud que originó el caso.
   */
  tipoSolicitudCallcenter?: CallCenterTipoSolicitud | string;
  /**
 * Condición funcional para filtros rápidos de Mis registros.
 */
condicion?: string;
};

/**
 * Solicitud para crear o actualizar un registro Call Center.
 */
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

  /**
   * Estado formal inicial del caso.
   */
  estadoCaso?: CallCenterEstadoCaso | string | null;

  /**
   * Tipo de solicitud del caso.
   */
  tipoSolicitudCallcenter?: CallCenterTipoSolicitud | string | null;
};

/**
 * Solicitud para actualizar la información de visita desde el flujo legacy.
 */
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

/**
 * Respuesta principal del caso Call Center.
 */
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

  /**
   * Usuario funcionario Call Center asignado para gestionar llamadas.
   */
  funcionarioCallcenterAsignadoId?: number | null;
  funcionarioCallcenterAsignadoUsername?: string | null;
  funcionarioCallcenterAsignadoNombre?: string | null;
  fechaAsignacionCallcenter?: string | null;

  /**
   * Usuario que realizó la asignación del caso al funcionario Call Center.
   */
  usuarioAsignaCallcenterId?: number | null;
  usuarioAsignaCallcenterUsername?: string | null;

  /**
   * Datos principales del ciudadano.
   */
  cedulaSolicitante: string;
  nombreCompleto: string;
  telefono?: string | null;
  direccionTexto?: string | null;

  /**
   * Datos de ubicación territorial.
   */
  barrioId?: number | null;
  barrioNombre?: string | null;
  comunaId?: number | null;
  comunaNombre?: string | null;

  /**
   * Datos legacy de llamada principal.
   */
  llamadaConectada: boolean;
  motivoNoContactoId?: number | null;
  motivoNoContactoCodigo?: string | null;
  motivoNoContactoNombre?: string | null;
  motivoNoContactoTexto?: string | null;
  motivoNoDisposicionId?: number | null;
  motivoNoDisposicionCodigo?: string | null;
  motivoNoDisposicionNombre?: string | null;
  motivoNoDisposicionTexto?: string | null;

  /**
   * Datos legacy de programación de encuesta.
   */
  encuestadorProgramadoId?: number | null;
  encuestadorProgramadoNombre?: string | null;
  fechaEncuestaProgramada?: string | null;
  solicitoNuevaEncuesta?: boolean | null;
  fechaAplicacionInformada?: string | null;
  disposicionRecibirEncuesta?: boolean | null;
  encuestadorAsignadoId?: number | null;
  encuestadorAsignadoNombre?: string | null;
  explicoInformanteCalificado?: boolean | null;
  verificado?: boolean | null;

  /**
   * Datos legacy de visita.
   */
  estadoVisita?: EstadoVisita | string | null;
  fechaVisitaReal?: string | null;
  horaVisitaReal?: string | null;
  encuestaRealizada?: boolean | null;
  motivoNoEncuesta?: string | null;
  fechaReprogramacion?: string | null;
  observacionEncuestador?: string | null;

  /**
   * Observación general del registro.
   */
  observacion?: string | null;

  /**
   * Campos del flujo formal del caso Call Center.
   */
  estadoCaso?: CallCenterEstadoCaso | string | null;
  tipoSolicitudCallcenter?: CallCenterTipoSolicitud | string | null;
  fechaCierre?: string | null;
  motivoCierre?: string | null;
  usuarioCierreId?: number | null;
  usuarioCierreUsername?: string | null;

  /**
   * Estado lógico del registro.
   */
  activo: boolean;
};

/**
 * Respuesta de registros de Ventanilla usados para crear casos Call Center.
 */
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

/**
 * Filtros para consultar registros de Ventanilla desde el flujo Call Center.
 */
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