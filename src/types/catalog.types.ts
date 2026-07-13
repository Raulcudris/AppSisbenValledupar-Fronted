export type CatalogOption = {
  id: number;
  codigo?: string | null;
  nombre: string;
  activo?: boolean;
  comunaId?: number | null;
  comunaNombre?: string | null;
};

export type SelectOption = {
  id: number;
  label: string;
};