import { apiRequest } from '@/lib/apiClient';
import { ApiResponse, PageResponse } from '@/types/api.types';
import { CatalogOption, SelectOption } from '@/types/catalog.types';

function toOption(item: CatalogOption): SelectOption {
  const label = item.codigo
    ? `${item.codigo} - ${item.nombre}`
    : item.comunaNombre
      ? `${item.nombre} (${item.comunaNombre})`
      : item.nombre;

  return {
    id: item.id,
    label,
  };
}

async function getOptions(path: string) {
  const response = await apiRequest<ApiResponse<PageResponse<CatalogOption>>>(
    `${path}?page=0&size=500`
  );

  return response.data.content
    .filter((item) => item.activo !== false)
    .map(toOption);
}

export function getCategoriasOptions() {
  return getOptions('/api/catalogs/categorias');
}

export function getSolicitudesOptions() {
  return getOptions('/api/catalogs/solicitudes');
}

export function getEstadosSolicitudOptions() {
  return getOptions('/api/catalogs/estados-solicitud');
}

export function getTiposDmcOptions() {
  return getOptions('/api/catalogs/tipos-dmc');
}

export function getEncuestadoresOptions() {
  return getOptions('/api/catalogs/encuestadores');
}

export function getBarriosOptions() {
  return getOptions('/api/territory/barrios');
}