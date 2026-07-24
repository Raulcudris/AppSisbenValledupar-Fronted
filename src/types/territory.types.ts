export type TerritoryStatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

export type ComunaResponse = {
  id: number;
  codigo: string;
  nombre: string;
  estrato: number | null;
  descripcion: string | null;
  activo: boolean;
};

export type BarrioResponse = {
  id: number;
  comunaId: number;
  comunaNombre: string;
  nombre: string;
  activo: boolean;
};

export type BarrioRequest = {
  comunaId: number;
  nombre: string;
  activo?: boolean;
};

export type ComunaRequest = {
  codigo?: string;
  nombre: string;
  estrato: number;
  descripcion?: string | null;
  activo?: boolean;
};

export type BarrioFilter = {
  page?: number;
  size?: number;
  q?: string;
  comunaId?: number | string;
  activo?: boolean;
};

export type ComunaFilter = {
  page?: number;
  size?: number;
  q?: string;
  activo?: boolean;
};