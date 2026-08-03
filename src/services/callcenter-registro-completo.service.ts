import { apiRequest } from '@/lib/apiClient';
import type { ApiResponse } from '@/types/api.types';
import type {
  CallCenterRegistroCompletoRequest,
  CallCenterRegistroCompletoResponse,
} from '@/types/callcenter-registro-completo.types';

/**
 * Registra transaccionalmente:
 *
 * 1. El caso maestro.
 * 2. La primera llamada o intento.
 * 3. La visita programada.
 *
 * El funcionario Call Center responsable no se envía desde
 * frontend. Debe obtenerse desde la autenticación en backend.
 *
 * @param request datos completos del caso.
 * @returns caso, llamada y visita creados.
 */
export async function createCallCenterRegistroCompleto(
  request: CallCenterRegistroCompletoRequest,
): Promise<CallCenterRegistroCompletoResponse> {
  const response =
    await apiRequest<
      ApiResponse<CallCenterRegistroCompletoResponse>
    >(
      '/api/callcenter/registro-completo',
      {
        method: 'POST',
        body: request,
      },
    );

  return response.data;
}