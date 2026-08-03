/**
 * Valores permitidos dentro de una celda exportable.
 */
export type SpreadsheetCell =
  | string
  | number
  | boolean
  | null
  | undefined;

/**
 * Neutraliza textos que Excel podría interpretar como fórmulas.
 *
 * Los valores que comienzan con =, +, - o @ reciben un
 * apóstrofo inicial para que Excel los trate como texto.
 *
 * @param value valor original de la celda.
 * @returns valor seguro para exportar.
 */
export function sanitizeSpreadsheetCell(
  value: SpreadsheetCell,
): string | number | boolean | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== 'string') {
    return value;
  }

  const cleanValue = value.replace(/\u0000/g, '');

  if (/^[=+\-@]/.test(cleanValue)) {
    return `'${cleanValue}`;
  }

  return cleanValue;
}