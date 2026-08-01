import { apiRequest } from '@/lib/apiClient';
import type { ApiResponse } from '@/types/api.types';
import type {
  CallCenterUltimaHoraRequest,
  CallCenterUltimaHoraResponse,
} from '@/types/callcenter-jornada.types';

/**
 * Incorpora un ciudadano de última hora a una jornada.
 *
 * El backend ejecuta de forma transaccional:
 *
 * 1. Validación de encuesta activa pendiente.
 * 2. Creación del caso Call Center.
 * 3. Asignación de funcionario Call Center.
 * 4. Creación y programación de la visita.
 *
 * @param request datos del ciudadano y de su asignación.
 * @returns caso maestro y visita creados.
 */
export async function crearCiudadanoUltimaHora(
  request: CallCenterUltimaHoraRequest,
): Promise<CallCenterUltimaHoraResponse> {
  const response =
    await apiRequest<ApiResponse<CallCenterUltimaHoraResponse>>(
      '/api/callcenter/jornada/ultima-hora',
      {
        method: 'POST',
        body: request,
      },
    );

  return response.data;
}