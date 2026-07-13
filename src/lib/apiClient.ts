import { getToken } from './authToken';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:6095';

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: HeadersInit;
  skipAuth?: boolean;
};

export class ApiClientError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
  }
}

async function readResponsePayload(response: Response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function resolveErrorMessage(payload: unknown, status: number) {
  if (
    payload &&
    typeof payload === 'object' &&
    'message' in payload &&
    typeof payload.message === 'string'
  ) {
    return payload.message;
  }

  if (status === 401 || status === 403) {
    return 'No tienes autorización para realizar esta acción o tu sesión ha expirado.';
  }

  if (status >= 500) {
    return 'No fue posible procesar la solicitud en este momento. Intenta nuevamente o comunícate con el administrador del sistema.';
  }

  return `Error HTTP ${status}`;
}

function getFilenameFromDisposition(
  disposition: string | null,
  fallbackName: string
) {
  if (!disposition) {
    return fallbackName;
  }

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].replace(/"/g, '').trim());
  }

  const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);

  if (filenameMatch?.[1]) {
    return filenameMatch[1].replace(/"/g, '').trim();
  }

  return fallbackName;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const token = options.skipAuth ? null : getToken();

  const headers: HeadersInit = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    throw new ApiClientError(
      `No fue posible conectar con el backend en ${API_BASE_URL}. Verifica que Spring Boot esté corriendo.`,
      0,
      error
    );
  }

  const payload = await readResponsePayload(response);

  if (!response.ok) {
    throw new ApiClientError(
      resolveErrorMessage(payload, response.status),
      response.status,
      payload
    );
  }

  return payload as T;
}

export async function apiDownload(
  path: string,
  accept = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
) {
  const token = getToken();

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers: {
        Accept: `${accept}, application/json, */*`,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch (error) {
    throw new ApiClientError(
      `No fue posible conectar con el backend en ${API_BASE_URL}. Verifica que Spring Boot esté corriendo.`,
      0,
      error
    );
  }

  if (!response.ok) {
    const payload = await readResponsePayload(response);

    throw new ApiClientError(
      resolveErrorMessage(payload, response.status),
      response.status,
      payload
    );
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition');
  const fallbackName = accept === 'application/pdf' ? 'reporte.pdf' : 'reporte.xlsx';

  return {
    blob,
    filename: getFilenameFromDisposition(disposition, fallbackName),
  };
}