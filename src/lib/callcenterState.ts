/**
 * Estados formales confirmados para el flujo Call Center.
 */
export type CallCenterCaseState =
  | 'PENDIENTE_ENRUTAMIENTO'
  | 'ASIGNADO_CALLCENTER'
  | 'EN_GESTION_LLAMADA'
  | 'NO_CONTACTADO'
  | 'CONTACTADO_SIN_DISPOSICION'
  | 'PENDIENTE_ASIGNAR_ENCUESTADOR'
  | 'ASIGNADO_ENCUESTADOR'
  | 'VISITA_PROGRAMADA'
  | 'VISITA_NO_ATENDIDA'
  | 'REPROGRAMADO'
  | 'VISITA_REALIZADA'
  | 'CERRADO'
  | 'CANCELADO';

/**
 * Estados donde todavía se permite realizar gestión telefónica.
 */
const CALL_ALLOWED_STATES = new Set<CallCenterCaseState>([
  'ASIGNADO_CALLCENTER',
  'EN_GESTION_LLAMADA',
  'NO_CONTACTADO',
  'CONTACTADO_SIN_DISPOSICION',
]);

/**
 * Estado desde el cual se puede crear formalmente una visita.
 */
const VISIT_ASSIGNMENT_ALLOWED_STATES = new Set<CallCenterCaseState>([
  'PENDIENTE_ASIGNAR_ENCUESTADOR',
]);

/**
 * Estados finales del caso.
 */
const FINAL_STATES = new Set<CallCenterCaseState>([
  'CERRADO',
  'CANCELADO',
]);

/**
 * Estados reconocidos por el frontend.
 */
const VALID_STATES: CallCenterCaseState[] = [
  'PENDIENTE_ENRUTAMIENTO',
  'ASIGNADO_CALLCENTER',
  'EN_GESTION_LLAMADA',
  'NO_CONTACTADO',
  'CONTACTADO_SIN_DISPOSICION',
  'PENDIENTE_ASIGNAR_ENCUESTADOR',
  'ASIGNADO_ENCUESTADOR',
  'VISITA_PROGRAMADA',
  'VISITA_NO_ATENDIDA',
  'REPROGRAMADO',
  'VISITA_REALIZADA',
  'CERRADO',
  'CANCELADO',
];

/**
 * Normaliza y valida un estado Call Center.
 *
 * @param value estado recibido.
 * @returns estado formal o cadena vacía.
 */
export function normalizeCallCenterState(
  value?: string | null,
): CallCenterCaseState | '' {
  const normalized = String(value ?? '')
    .trim()
    .toUpperCase();

  return VALID_STATES.includes(normalized as CallCenterCaseState)
    ? normalized as CallCenterCaseState
    : '';
}

/**
 * Valida si el estado permite registrar una llamada.
 *
 * @param value estado del caso.
 * @returns true cuando el caso está en etapa telefónica.
 */
export function canRegisterCall(value?: string | null) {
  const state = normalizeCallCenterState(value);

  return Boolean(state && CALL_ALLOWED_STATES.has(state));
}

/**
 * Valida si el estado permite asignar una visita.
 *
 * @param value estado del caso.
 * @returns true cuando el caso está pendiente de asignar encuestador.
 */
export function canAssignVisit(value?: string | null) {
  const state = normalizeCallCenterState(value);

  return Boolean(
    state
    && VISIT_ASSIGNMENT_ALLOWED_STATES.has(state)
  );
}

/**
 * Valida si el caso está cerrado o cancelado.
 *
 * @param value estado del caso.
 * @returns true cuando el estado es final.
 */
export function isFinalCallCenterState(value?: string | null) {
  const state = normalizeCallCenterState(value);

  return Boolean(state && FINAL_STATES.has(state));
}

/**
 * Explica por qué una llamada no está disponible.
 *
 * @param value estado del caso.
 * @returns mensaje visible.
 */
export function getCallDisabledReason(value?: string | null) {
  const state = normalizeCallCenterState(value);

  if (!state) {
    return 'No se pudo determinar el estado formal del caso.';
  }

  if (FINAL_STATES.has(state)) {
    return `El caso está ${formatState(state)} y solo permite consulta.`;
  }

  if (state === 'PENDIENTE_ENRUTAMIENTO') {
    return 'El caso debe ser asignado primero a un funcionario Call Center.';
  }

  if (state === 'PENDIENTE_ASIGNAR_ENCUESTADOR') {
    return 'La gestión telefónica terminó. El siguiente paso es asignar la visita.';
  }

  return 'Las llamadas solo se pueden registrar durante la etapa de gestión telefónica.';
}

/**
 * Explica por qué la asignación de visita no está disponible.
 *
 * @param value estado del caso.
 * @returns mensaje visible.
 */
export function getVisitAssignmentDisabledReason(
  value?: string | null,
) {
  const state = normalizeCallCenterState(value);

  if (!state) {
    return 'No se pudo determinar el estado formal del caso.';
  }

  if (FINAL_STATES.has(state)) {
    return `El caso está ${formatState(state)} y solo permite consulta.`;
  }

  if (CALL_ALLOWED_STATES.has(state)) {
    return 'Debe finalizar la gestión telefónica antes de asignar la visita.';
  }

  if (
    state === 'ASIGNADO_ENCUESTADOR'
    || state === 'VISITA_PROGRAMADA'
    || state === 'VISITA_NO_ATENDIDA'
    || state === 'REPROGRAMADO'
    || state === 'VISITA_REALIZADA'
  ) {
    return 'El caso ya tiene una visita o asignación de campo en curso.';
  }

  return 'La visita solo puede asignarse cuando el caso está pendiente de asignar encuestador.';
}

/**
 * Convierte un estado técnico en texto legible.
 */
function formatState(state: CallCenterCaseState) {
  return state
    .split('_')
    .join(' ')
    .toLowerCase();
}