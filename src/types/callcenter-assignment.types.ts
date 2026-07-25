export type CallCenterUserOptionResponse = {
  id: number;
  username: string;
  nombreCompleto?: string | null;
  rolCodigo?: string | null;
  activo?: boolean;
};

export type CallCenterAsignarFuncionarioRequest = {
  funcionarioCallcenterId: number;
  registroIds: number[];
};

export type CallCenterAsignarEncuestadorRequest = {
  encuestadorId: number;
  fechaEncuestaProgramada?: string | null;
  registroIds: number[];
};
