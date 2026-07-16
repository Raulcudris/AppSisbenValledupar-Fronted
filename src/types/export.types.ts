export type ExportOptionType =
  | 'VENTANILLA_REGISTROS'
  | 'DMC_REGISTROS'
  | 'VENTANILLA_REPORTE'
  | 'DMC_REPORTE'
  | 'SOLICITUDES_TIPO'
  | 'DESEMPENO_FUNCIONARIOS'
  | 'PRODUCTIVIDAD_FUNCIONARIOS'
  | 'CIUDADANOS_FRECUENTES'
  | 'TOTALES_COMUNA';

export type ExportVentanillaPreviewResponse = {
  id: number;
  fecha: string;
  numeroVentanilla: string | null;
  funcionarioUsername: string | null;
  cedulaUsuario: string | null;
  nombreUsuario: string | null;
  telefono: string | null;
  categoriaNombre: string | null;
  direccion: string | null;
  barrioNombre: string | null;
  comunaNombre: string | null;
  extranjero: boolean | null;
  solicitudNombre: string | null;
  estadoSolicitudNombre: string | null;
  estadoRegistro: string | null;
  observacion: string | null;
};

export type ExportDmcPreviewResponse = {
  id: number;
  fecha: string;
  funcionarioUsername: string | null;
  tipoDmcCodigo: string | null;
  tipoDmcNombre: string | null;
  encuestadorNombre: string | null;
  cantidad: number | null;
  barrioNombre: string | null;
  comunaNombre: string | null;
  observacion: string | null;
};