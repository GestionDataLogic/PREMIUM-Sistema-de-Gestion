export function calculateAccumulatedInflation(
  inflacionPorMes: Record<string, number>,
  fechaInicio: Date,
  fechaFin: Date
): number | null {
  if (Object.keys(inflacionPorMes).length === 0) return null;

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

export function fisherReal(
  tasaNominal: number,
  inflacion: number | null
): number {
  if (inflacion === null || inflacion <= -1) return tasaNominal;
  return (1 + tasaNominal) / (1 + inflacion) - 1;
}

export function toYearMonth(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function addMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const next = new Date(y, m, 1); 
  return toYearMonth(next);
}

export function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}
