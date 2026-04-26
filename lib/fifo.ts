/**
 * fifo.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Traducción de calcular_fifo_valor_corriente de Python.
 *
 * Implementa valorización FIFO con revalorizaciones intercaladas.
 * Las revalorizaciones incrementan el costo promedio de las unidades
 * que permanecen en stock al momento del ajuste.
 */

import type { StockEntry, JournalEntry, FIFOResult } from "./types";

interface RevalEvent {
  fecha: Date;
  numOp: string;
  monto: number;
}

type FIFOLayer = { units: number; cost: number };

/**
 * Compara dos fechas para ordenamiento.
 * Null se considera menor que cualquier fecha real.
 */
function compareDates(a: Date | null, b: Date | null): number {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return a.getTime() - b.getTime();
}

/**
 * Compara dos identificadores de operación numéricamente.
 * "0042" <= "0043"
 */
function compareNumOp(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return parseInt(a, 10) - parseInt(b, 10);
}

/**
 * calcularFIFOValorCorriente
 *
 * @param stock  Todos los movimientos de stock (STK-*)
 * @param ld     Libro diario (para extraer las revalorizaciones)
 * @returns      FIFOResult: por cada idProd → { valorStock, cmvPorNum, gananciaTenencia }
 */
export function calcularFIFOValorCorriente(
  stock: StockEntry[],
  ld: JournalEntry[]
): FIFOResult {
  // ── 1. Indexar revalorizaciones por idProd ─────────────────────────────────
  const revalPorId = new Map<string, RevalEvent[]>();

  for (const entry of ld) {
    if (!entry.tipoBase.includes("Revalorizaci")) continue;

    // El detalle tiene "Ajuste Stock: MER-001-004" o similar
    const match = entry.detalle.match(
      /Ajuste Stock:\s*((?:ACT|MER|INS)-\S+)/i
    );
    if (!match) continue;

    const idItem = match[1].trim().toUpperCase();
    if (!revalPorId.has(idItem)) revalPorId.set(idItem, []);

    revalPorId.get(idItem)!.push({
      fecha: entry.fecha!,
      numOp: entry.numOp ?? "",
      monto: entry.montoTotal,
    });
  }

  // Ordenar revalorizaciones por (fecha, numOp)
  for (const [, events] of revalPorId) {
    events.sort((a, b) => {
      const df = compareDates(a.fecha, b.fecha);
      if (df !== 0) return df;
      return compareNumOp(a.numOp, b.numOp);
    });
  }

  // ── 2. Agrupar movimientos por idProd ──────────────────────────────────────
  const stockPorProd = new Map<string, StockEntry[]>();
  for (const row of stock) {
    if (!stockPorProd.has(row.idProd)) stockPorProd.set(row.idProd, []);
    stockPorProd.get(row.idProd)!.push(row);
  }

  // ── 3. Procesar FIFO por producto ──────────────────────────────────────────
  const resultado: FIFOResult = {};

  for (const [idProd, movimientos] of stockPorProd) {
    // Ordenar movimientos por (fecha, numOp)
    const sorted = [...movimientos].sort((a, b) => {
      const df = compareDates(a.fecha, b.fecha);
      if (df !== 0) return df;
      return compareNumOp(a.numOp, b.numOp);
    });

    const revals = revalPorId.get(idProd) ?? [];
    let revalIdx = 0;

    const cola: FIFOLayer[] = [];   // [{ units, cost }, …]  (FIFO queue)
    const cmvPorNum: Record<string, number> = {};
    let gananciaTenencia = 0;

    /**
     * Aplica las revalorizaciones pendientes hasta (fecha, numOp) inclusive.
     * Modifica la cola in-place y acumula gananciaTenencia.
     */
    function aplicarRevals(hastaFecha: Date, hastaNumOp: string | null = null) {
      while (revalIdx < revals.length) {
        const rv = revals[revalIdx];

        // ¿Esta reval ya ocurrió antes del punto de corte?
        const rvAntes =
          compareDates(rv.fecha, hastaFecha) < 0 ||
          (compareDates(rv.fecha, hastaFecha) === 0 &&
            (hastaNumOp === null ||
              compareNumOp(rv.numOp, hastaNumOp) <= 0));

        if (!rvAntes) break;
        revalIdx++;

        const unidadesEnCola = cola.reduce((s, l) => s + l.units, 0);

        if (unidadesEnCola <= 0) {
          // No hay stock: la ganancia va directo a resultados
          gananciaTenencia += rv.monto;
          continue;
        }

        const incrementoUnit = rv.monto / unidadesEnCola;
        for (const layer of cola) {
          layer.cost += incrementoUnit;
        }
        gananciaTenencia += rv.monto;
      }
    }

    // ── Procesar movimiento por movimiento ─────────────────────────────────
    for (const mov of sorted) {
      aplicarRevals(mov.fecha!, mov.numOp);

      if (mov.unidades > 0) {
        // Entrada: agregar capa FIFO
        cola.push({ units: mov.unidades, cost: mov.costoUnit });
      } else {
        // Salida: consumir capas FIFO (egreso de stock)
        let cant = Math.abs(mov.unidades);
        let costoSalida = 0;

        while (cant > 0 && cola.length > 0) {
          const layer = cola[0];
          if (layer.units <= cant) {
            costoSalida += layer.units * layer.cost;
            cant -= layer.units;
            cola.shift();
          } else {
            costoSalida += cant * layer.cost;
            layer.units -= cant;
            cant = 0;
          }
        }

        const key = mov.numOp ?? "_unknown";
        cmvPorNum[key] = (cmvPorNum[key] ?? 0) + costoSalida;
      }
    }

    // Aplicar revalorizaciones restantes (posteriores al último movimiento)
    if (revals.length > 0) {
      const lastReval = revals[revals.length - 1];
      aplicarRevals(lastReval.fecha, null);
    }

    const valorStock = cola.reduce((s, l) => s + l.units * l.cost, 0);

    resultado[idProd] = {
      valorStock,
      cmvPorNum,
      gananciaTenencia,
    };
  }

  return resultado;
}
