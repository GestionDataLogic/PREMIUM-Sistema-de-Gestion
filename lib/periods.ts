/**
 * periods.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Traduce generar_periodos y calcular_periodo de Python.
 *
 * También exporta calcularROEROICacumulado (usado en gráficos de evolución).
 */

import type {
  JournalEntry,
  StockEntry,
  DebtInstallment,
  Period,
  PeriodResult,
  IncomeStatement,
  BalanceSheet,
  CashFlow,
  EquityChangeRow,
  DebtControl,
  StockItem,
} from "./types";
import { calcularTodo } from "./calculation";
import {
  calculateAccumulatedInflation,
  fisherReal,
} from "./inflation";

// ─── Helpers de fecha ─────────────────────────────────────────────────────────

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function minDate(dates: Date[]): Date | null {
  const valid = dates.filter((d) => d instanceof Date && !isNaN(d.getTime()));
  if (valid.length === 0) return null;
  return new Date(Math.min(...valid.map((d) => d.getTime())));
}

function maxDate(dates: Date[]): Date | null {
  const valid = dates.filter((d) => d instanceof Date && !isNaN(d.getTime()));
  if (valid.length === 0) return null;
  return new Date(Math.max(...valid.map((d) => d.getTime())));
}

// ─── generarPeriodos ──────────────────────────────────────────────────────────

/**
 * Traduce generar_periodos de Python.
 * Genera períodos anuales, trimestrales y mensuales basados en las fechas del LD.
 */
export function generarPeriodos(ld: JournalEntry[]): Period[] {
  const fechasValidas = ld
    .map((e) => e.fecha)
    .filter((f): f is Date => f !== null && !isNaN(f.getTime()));

  if (fechasValidas.length === 0) return [];

  const anios = [...new Set(fechasValidas.map((f) => f.getFullYear()))].sort();
  const periodos: Period[] = [];

  for (const anio of anios) {
    // Anual
    periodos.push({
      label: String(anio),
      inicio: new Date(anio, 0, 1),
      fin: new Date(anio, 11, 31),
      tipo: "anual",
    });

    // Trimestral
    for (let q = 1; q <= 4; q++) {
      const mesIni = (q - 1) * 3;
      const mesFin = q * 3 - 1;
      const ultimoDia = daysInMonth(anio, mesFin + 1);
      const ini = new Date(anio, mesIni, 1);
      const fin = new Date(anio, mesFin, ultimoDia);

      const tieneDatos = fechasValidas.some(
        (f) => f >= ini && f <= fin
      );
      if (tieneDatos) {
        periodos.push({
          label: `${anio}-Q${q}`,
          inicio: ini,
          fin,
          tipo: "trimestre",
        });
      }
    }

    // Mensual
    const mesMax = Math.max(
      ...fechasValidas
        .filter((f) => f.getFullYear() === anio)
        .map((f) => f.getMonth())
    );

    for (let mes = 0; mes <= mesMax; mes++) {
      const ultimoDia = daysInMonth(anio, mes + 1);
      periodos.push({
        label: `${anio}-${String(mes + 1).padStart(2, "0")}`,
        inicio: new Date(anio, mes, 1),
        fin: new Date(anio, mes, ultimoDia),
        tipo: "mensual",
      });
    }
  }

  return periodos;
}

// ─── Resultado vacío de ER ────────────────────────────────────────────────────

function emptyER(): IncomeStatement {
  return {
    ingresoVentasMer: 0,
    ingresoVentasExtra: 0,
    ingresoVentas: 0,
    costoActivosVendidos: 0,
    cmv: 0,
    gastosOp: 0,
    gastosDetalle: {},
    gastoFinanciero: 0,
    ingresoFinanciero: 0,
    revalorizacion: 0,
    revalorizacionTotal: 0,
    perdidaRotura: 0,
    devolucion: 0,
    impuestos: 0,
    resultadoNeto: 0,
  };
}

function emptyFC(): CashFlow {
  return {
    ventasC: 0, senasC: 0, cobrosC: 0, pagosP: 0, gastosC: 0,
    comprasMerC: 0, devolucC: 0, impuestC: 0, comprasActInvC: 0,
    comprasActInvCr: 0, ventasActC: 0, aportes: 0, retirosC: 0,
    flujoOp: 0, flujoInv: 0, flujoFin: 0, flujoNetoCaja: 0, comprasC: 0,
  };
}

// ─── calcularPeriodo ──────────────────────────────────────────────────────────

/**
 * Traduce calcular_periodo de Python.
 *
 * - El Balance Sheet (SP) se acumula hasta fecha_fin (todo el historial).
 * - El Estado de Resultados (ER) y Flujo de Caja (FC) son solo del período
 *   [fecha_inicio_er, fecha_fin].
 * - Los resultados de períodos anteriores se calculan por diferencia.
 */
export function calcularPeriodo(
  ldTodo: JournalEntry[],
  stkTodo: StockEntry[],
  nombresCapa1: Record<string, string>,
  deudasCuotas: DebtInstallment[],
  inflacionPorMes: Record<string, number>,
  fechaInicioEr: Date,
  fechaFin: Date
): PeriodResult | null {
  // Filtrar datos acumulados hasta fecha_fin
  const ldEsp = ldTodo.filter(
    (e) => e.fecha !== null && e.fecha <= fechaFin
  );
  const stkEsp = stkTodo.filter(
    (e) => e.fecha !== null && e.fecha <= fechaFin
  );

  if (ldEsp.length === 0) return null;

  // Calcular el Balance completo (acumulado)
  const resEsp = calcularTodo(
    ldEsp,
    stkEsp,
    nombresCapa1,
    deudasCuotas,
    inflacionPorMes
  );
  const spEsp: BalanceSheet = { ...resEsp.sp };

  // Datos solo del período (ER, FC, CP)
  const ldEr = ldEsp.filter((e) => e.fecha !== null && e.fecha >= fechaInicioEr);
  const tieneEr = ldEr.length > 0;

  let er = emptyER();
  let roe = 0;
  let roic = 0;
  let fc = emptyFC();
  let cp: EquityChangeRow[] = [];

  if (tieneEr) {
    const resEr = calcularTodo(
      ldEr,
      stkEsp,
      nombresCapa1,
      deudasCuotas,
      inflacionPorMes
    );
    er = resEr.er;
    roe = resEr.roe;
    roic = resEr.roic;
    fc = resEr.fc;
    cp = resEr.cp;
  }

  // Resultado de períodos anteriores
  let resultadoPeriodosAnteriores = 0;
  const fechaMinTodo = minDate(
    ldTodo.filter((e) => e.fecha !== null).map((e) => e.fecha!)
  );

  if (fechaMinTodo && fechaInicioEr > fechaMinTodo) {
    const ldAnt = ldTodo.filter(
      (e) => e.fecha !== null && e.fecha < fechaInicioEr
    );
    const stkAnt = stkTodo.filter(
      (e) => e.fecha !== null && e.fecha < fechaInicioEr
    );
    if (ldAnt.length > 0) {
      const resAnt = calcularTodo(ldAnt, stkAnt, nombresCapa1, deudasCuotas, inflacionPorMes);
      resultadoPeriodosAnteriores = resAnt.er.resultadoNeto;
    }
  }

  spEsp.resultadoPeriodosAnteriores = resultadoPeriodosAnteriores;
  spEsp.resultadoNetoPeriodo = er.resultadoNeto;

  // Recalcular ROE / ROIC para el período con inflación del período
  const pn = spEsp.patrimonioNeto;
  if (tieneEr && pn > 0) {
    const gastosExtra = er.gastosDetalle["Gastos Extraordinarios"] ?? 0;
    const resultadoOp =
      er.ingresoVentasMer -
      er.cmv -
      er.gastosOp +
      gastosExtra -
      er.perdidaRotura -
      er.devolucion;

    const roeNomPeriodo = (er.resultadoNeto / pn) * 100;
    const roicNomPeriodo = (resultadoOp / pn) * 100;

    let inflacionPeriodo: number | null = null;
    if (Object.keys(inflacionPorMes).length > 0) {
      inflacionPeriodo = calculateAccumulatedInflation(
        inflacionPorMes,
        fechaInicioEr,
        fechaFin
      );
    }

    const roeReal =
      inflacionPeriodo !== null
        ? fisherReal(roeNomPeriodo / 100, inflacionPeriodo) * 100
        : null;
    const roicReal =
      inflacionPeriodo !== null
        ? fisherReal(roicNomPeriodo / 100, inflacionPeriodo) * 100
        : null;

    spEsp.roeNominal = roeNomPeriodo;
    spEsp.roicNominal = roicNomPeriodo;
    spEsp.roeReal = roeReal;
    spEsp.roicReal = roicReal;
    spEsp.inflacionAcum = inflacionPeriodo;

    roe = roeNomPeriodo;
    roic = roicNomPeriodo;
  }

  return {
    er,
    sp: spEsp,
    fc,
    cp,
    deudas: resEsp.deudas,
    stock: resEsp.stockActual,
    roe,
    roic,
    tieneEr,
    fechaInicio: fechaInicioEr,
    fechaFin,
  };
}

// ─── calcularROEROICacumulado ──────────────────────────────────────────────────

/**
 * Traduce _calcular_roe_roic_acumulado de Python.
 * Usado en el tab de evolución para calcular ROE/ROIC acumulados entre períodos.
 */
export function calcularROEROICacumulado(
  resultados: Array<{
    er: IncomeStatement;
    sp: BalanceSheet;
    fechaInicio: Date;
    fechaFin: Date;
  }>,
  inflacionPorMes: Record<string, number> = {}
): Array<{ roe: number; roic: number }> {
  let rnAcum = 0;
  let ropAcum = 0;
  const out: Array<{ roe: number; roic: number }> = [];

  const fechaInicioAcum = resultados[0]?.fechaInicio;

  for (const r of resultados) {
    rnAcum += r.er.resultadoNeto;
    const gastosExtra = r.er.gastosDetalle["Gastos Extraordinarios"] ?? 0;
    ropAcum +=
      r.er.ingresoVentasMer -
      r.er.cmv -
      r.er.gastosOp +
      gastosExtra -
      r.er.perdidaRotura -
      r.er.devolucion;

    const pn = r.sp.patrimonioNeto;
    const roeNom = pn > 0 ? (rnAcum / pn) * 100 : 0;
    const roicNom = pn > 0 ? (ropAcum / pn) * 100 : 0;

    let inflacionPeriodo: number | null = null;
    if (Object.keys(inflacionPorMes).length > 0 && fechaInicioAcum) {
      inflacionPeriodo = calculateAccumulatedInflation(
        inflacionPorMes,
        fechaInicioAcum,
        r.fechaFin
      );
    }

    const roeFinal =
      inflacionPeriodo !== null
        ? fisherReal(roeNom / 100, inflacionPeriodo) * 100
        : roeNom;
    const roicFinal =
      inflacionPeriodo !== null
        ? fisherReal(roicNom / 100, inflacionPeriodo) * 100
        : roicNom;

    out.push({ roe: roeFinal, roic: roicFinal });
  }

  return out;
}

// ─── semáforo de diagnóstico ──────────────────────────────────────────────────

export function semaforoDiagnostico(
  roe: number,
  roic: number
): { caso: string; descripcion: string; color: string } {
  const rv = roe >= 20;
  const ra = roe >= 12 && roe < 20;
  const rr = roe < 12;
  const cv = roic >= 15;
  const ca = roic >= 8 && roic < 15;
  const cr = roic < 8;

  if (rv && cv) return { caso: "EL IDEAL 🟢🟢",             descripcion: "El negocio es excelente y vos estás ganando mucha plata.",                           color: "#22c55e" };
  if (rv && ca) return { caso: "APALANCADO POSITIVO 🟢🟡",  descripcion: "El negocio es normal, pero ganás muy bien por otros ingresos o intereses baratos.",   color: "#0ea5e9" };
  if (rv && cr) return { caso: "ESTRUCTURA INFLADA 🟢🔴",   descripcion: "Peligro. Ganás plata por extras pero el negocio base pierde dinero.",                  color: "#f97316" };
  if (ra && cv) return { caso: "NEGOCIO DESPERDICIADO 🟡🟢", descripcion: "El negocio rinde bárbaro, pero a vos te llega poco.",                                  color: "#eab308" };
  if (ra && ca) return { caso: "ZONA DE CONFORT 🟡🟡",      descripcion: "Es un sueldo. El negocio y tu ganancia están estables.",                               color: "#eab308" };
  if (ra && cr) return { caso: "EQUILIBRIO FRÁGIL 🟡🔴",    descripcion: "El patrimonio sube por ingresos extra, pero la operación base dio pérdida.",           color: "#f97316" };
  if (rr && cv) return { caso: "EL DESPERDICIO 🔴🟢",       descripcion: "El negocio es bueno, pero el resultado final es malo.",                                 color: "#ef4444" };
  if (rr && ca) return { caso: "ZONA DE ALERTA 🔴🟡",       descripcion: "El negocio apenas camina y tu patrimonio no está creciendo.",                          color: "#ef4444" };
  if (rr && cr) return { caso: "EL ZOMBI 🔴🔴",             descripcion: "Cerrá todo o cambia el modelo urgente. Estás quemando tiempo y capital.",              color: "#ef4444" };

  return { caso: "EN ANÁLISIS", descripcion: `ROE ${roe.toFixed(1)}% / ROIC ${roic.toFixed(1)}%`, color: "#94a3b8" };
}
