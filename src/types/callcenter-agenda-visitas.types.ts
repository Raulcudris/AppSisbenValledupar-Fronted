export type CallCenterAgendaVisitaResponse = {
  id: number;

  encuestadorId:
    number | null;

  encuestadorNombre:
    string | null;

  fechaAgenda:
    string | null;

  horaProgramada:
    string | null;

  cedulaSolicitante:
    string | null;

  nombreCompleto:
    string | null;

  direccionTexto:
    string | null;

  barrioNombre:
    string | null;

  telefono:
    string | null;
};

export type EncuestadorAgendaOption = {
  id: number;

  nombre: string;

  documento?:
    string | null;

  telefono?:
    string | null;

  activo: boolean;
};

export type CallCenterAgendaVisitasFilter = {
  encuestadorId:
    number;

  fecha:
    string;

  page?:
    number;

  size?:
    number;
};