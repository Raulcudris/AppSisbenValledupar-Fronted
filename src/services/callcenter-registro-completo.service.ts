import { apiRequest } from '@/lib/apiClient';

import type {
  ApiResponse,
} from '@/types/api.types';

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
 * El funcionario Call Center responsable se obtiene
 * desde la autenticación en backend.
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

/**
 * Consulta el agregado completo para cargar el formulario
 * de edición.
 *
 * Recupera:
 *
 * - caso maestro;
 * - última llamada activa;
 * - visita activa.
 */
export async function getCallCenterRegistroCompleto(
  registroId: number,
): Promise<CallCenterRegistroCompletoResponse> {
  if (
    !Number.isSafeInteger(registroId)
    || registroId <= 0
  ) {
    throw new Error(
      'El identificador del registro Call Center no es válido.',
    );
  }

  const response =
    await apiRequest<
      ApiResponse<CallCenterRegistroCompletoResponse>
    >(
      `/api/callcenter/registro-completo/${registroId}?_t=${Date.now()}`,
    );

  return response.data;
}

/**
 * Actualiza transaccionalmente:
 *
 * 1. Los datos generales del caso.
 * 2. La última llamada activa.
 * 3. La visita activa.
 */
export async function updateCallCenterRegistroCompleto(
  registroId: number,
  request: CallCenterRegistroCompletoRequest,
): Promise<CallCenterRegistroCompletoResponse> {
  if (
    !Number.isSafeInteger(registroId)
    || registroId <= 0
  ) {
    throw new Error(
      'El identificador del registro Call Center no es válido.',
    );
  }

  const response =
    await apiRequest<
      ApiResponse<CallCenterRegistroCompletoResponse>
    >(
      `/api/callcenter/registro-completo/${registroId}`,
      {
        method: 'PUT',
        body: request,
      },
    );

  return response.data;
}