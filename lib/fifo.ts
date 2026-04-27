import type { StockEntry, JournalEntry, FIFOResult } from "./types";

interface RevalEvent {
  fecha: Date;
  numOp: string;
  monto: number;
}

type FIFOLayer = { units: number; cost: number };

function compareDates(a: Date | null, b: Date | null): number {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return a.getTime() - b.getTime();
}

function compareNumOp(a: string | null, b: string | null): number {
  if (!a && !b) return 0;
  if (!a) return -1;
  if (!b) return 1;
  return parseInt(a, 10) - parseInt(b, 10);
}

export function calcularFIFOValorCorriente(
  stock: StockEntry[],
  ld: JournalEntry[]
): FIFOResult {
  const revalPorId = new Map<string, RevalEvent[]>();

  for (const entry of ld) {
    if (!entry.tipoBase.includes("Revalorizaci")) continue;

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

  for (const [, events] of revalPorId) {
    events.sort((a, b) => {
      const df = compareDates(a.fecha, b.fecha);
      if (df !== 0) return df;
      return compareNumOp(a.numOp, b.numOp);
    });
  }

  const stockPorProd = new Map<string, StockEntry[]>();
  for (const row of stock) {
    if (!stockPorProd.has(row.idProd)) stockPorProd.set(row.idProd, []);
    stockPorProd.get(row.idProd)!.push(row);
  }

  const resultado: FIFOResult = {};

  for (const [idProd, movimientos] of stockPorProd) {
    const sorted = [...movimientos].sort((a, b) => {
      const df = compareDates(a.fecha, b.fecha);
      if (df !== 0) return df;
      return compareNumOp(a.numOp, b.numOp);
    });

    const revals = revalPorId.get(idProd) ?? [];
    let revalIdx = 0;

    const cola: FIFOLayer[] = [];   
    const cmvPorNum: Record<string, number> = {};
    let gananciaTenencia = 0;


    function aplicarRevals(hastaFecha: Date, hastaNumOp: string | null = null) {
      while (revalIdx < revals.length) {
        const rv = revals[revalIdx];

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

    for (const mov of sorted) {
      aplicarRevals(mov.fecha!, mov.numOp);

      if (mov.unidades > 0) {
        cola.push({ units: mov.unidades, cost: mov.costoUnit });
      } else {
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
