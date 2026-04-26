/**
 * inflation.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Traduce las funciones de inflación de Python:
 *   - calcular_inflacion_acumulada  →  calculateAccumulatedInflation
 *   - fisher_real                   →  fisherReal
 */

/**
 * Calcula la inflación acumulada entre dos fechas (inclusive) usando
 * el mapa { "YYYY-MM": tasa_decimal }.
 *
 * Retorna null si no hay datos disponibles para el rango.
 */
export function calculateAccumulatedInflation(
  inflacionPorMes: Record<string, number>,
  fechaInicio: Date,
  fechaFin: Date
): number | null {
  if (Object.keys(inflacionPorMes).length === 0) return null;

  // Generar todos los períodos YYYY-MM entre inicio y fin
  const inicio = toYearMonth(fechaInicio);
  const fin = toYearMonth(fechaFin);

  if (inicio > fin) return null;

  const factores: number[] = [];
  let current = inicio;

  while (current <= fin) {
    const key = current;
    const tasa = inflacionPorMes[key];
    if (tasa !== undefined) {
      factores.push(1 + tasa);
    }
    current = addMonth(current);
  }

  if (factores.length === 0) return null;

  const acumulado = factores.reduce((acc, f) => acc * f, 1.0);
  return acumulado - 1.0;
}

/**
 * Ecuación de Fisher: tasa real dado nominal e inflación.
 * (1 + nominal) / (1 + inflacion) - 1
 *
 * Si inflacion es null o <= -1, retorna la tasa nominal.
 */
export function fisherReal(
  tasaNominal: number,
  inflacion: number | null
): number {
  if (inflacion === null || inflacion <= -1) return tasaNominal;
  return (1 + tasaNominal) / (1 + inflacion) - 1;
}

// ─── Helpers de fecha ─────────────────────────────────────────────────────────

/** Convierte una Date a string "YYYY-MM" */
export function toYearMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Avanza un período "YYYY-MM" en un mes */
export function addMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const next = new Date(y, m, 1); // m es 1-based, new Date(y, m) → mes siguiente
  return toYearMonth(next);
}

/** Retorna true si dos fechas caen en el mismo mes/año */
export function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
