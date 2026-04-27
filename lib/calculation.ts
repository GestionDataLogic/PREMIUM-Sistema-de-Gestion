import type {
  JournalEntry,
  StockEntry,
  DebtInstallment,
  StockItem,
  IncomeStatement,
  BalanceSheet,
  CashFlow,
  EquityChangeRow,
  DebtControl,
  DeudorDetail,
  AlertaCuota,
  VentaTemporal,
  VentaXCapa1,
  CalculationResult,
} from "./types";
import { calcularFIFOValorCorriente } from "./fifo";
import {
  calculateAccumulatedInflation,
  fisherReal,
  toYearMonth,
} from "./inflation";
import { extractParens, removeParens } from "./parsers";

// ─── Helpers de clasificación ─────────────────────────────────────────────────

function isVentaMer(tipoOp: string): boolean {
  const t = tipoOp.toLowerCase();
  return t.includes("venta") && t.includes("mercader");
}

function isVentaExtra(tipoOp: string): boolean {
  const t = tipoOp.toLowerCase();
  const esVentaNoMer =
    t.includes("venta") &&
    !t.includes("mercader") &&
    !t.includes("recibo de se");
  const esIngresoExtra = t.includes("ingreso extra");
  return esVentaNoMer || esIngresoExtra;
}

function isSenaMer(tipoOp: string): boolean {
  const t = tipoOp.toLowerCase();
  if (!t.includes("recibo de se")) return false;
  const paren = extractParens(tipoOp);
  return !!(paren && paren.toUpperCase().startsWith("MER"));
}

function isSenaExtra(tipoOp: string): boolean {
  const t = tipoOp.toLowerCase();
  if (!t.includes("recibo de se")) return false;
  return !isSenaMer(tipoOp);
}

function isSena(tipoBase: string): boolean {
  return tipoBase.toLowerCase().includes("recibo de se");
}

function isGastos(tipoBase: string): boolean {
  return /gastos/i.test(tipoBase);
}

// ─── Agrupar gastos por tipo ──────────────────────────────────────────────────

function agruparGastos(ld: JournalEntry[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const entry of ld) {
    if (!isGastos(entry.tipoBase)) continue;
    const key = entry.tipoBase.trim();
    result[key] = (result[key] ?? 0) + entry.montoTotal;
  }
  return result;
}

// ─── calcularDeudas ───────────────────────────────────────────────────────────

export function calcularDeudas(
  ld: JournalEntry[],
  deudasCuotas: DebtInstallment[],
  intCompraCrXProv: Record<string, number>,
  intVentaCrXCli: Record<string, number>
): DebtControl {
  const deudaOrig: Record<string, number> = {};
  const deudaPagado: Record<string, number> = {};
  const cobrarOrig: Record<string, number> = {};
  const cobrarCobrado: Record<string, number> = {};
  const intExtraPagar: Record<string, number> = {};
  const intExtraCobrar: Record<string, number> = {};

  for (const entry of ld) {
    const n = entry.nombreParen;
    const t = entry.tipoBase.toLowerCase();
    if (!n || t.includes("porte")) continue;

    if (t.includes("compra a cr")) {
      deudaOrig[n] = (deudaOrig[n] ?? 0) + entry.monto;
    } else if (t.includes("pago a proveedores") || t.includes("cuentas a pagar")) {
      deudaPagado[n] = (deudaPagado[n] ?? 0) + entry.monto;
      if (deudasCuotas.length > 0) {
        const cuotasProv = deudasCuotas.filter(
          (c) => c.deudor.toLowerCase() === n.toLowerCase()
        );
        const cuotaMatch = cuotasProv.find(
          (c) => c.idPago.trim() === entry.idOp.trim()
        );
        let miPact = 0;
        if (cuotaMatch) {
          miPact = cuotaMatch.interes;
        } else {
          const nq = cuotasProv.length || 1;
          miPact = (intCompraCrXProv[n] ?? 0) / nq;
        }
        intExtraPagar[n] = (intExtraPagar[n] ?? 0) + Math.max(0, entry.intereses - miPact);
      }
    } else if (t.includes("venta a cr")) {
      cobrarOrig[n] = (cobrarOrig[n] ?? 0) + entry.monto;
    } else if (t.includes("cobro de deudores")) {
      cobrarCobrado[n] = (cobrarCobrado[n] ?? 0) + entry.monto;
      if (deudasCuotas.length > 0) {
        const cuotasCli = deudasCuotas.filter(
          (c) => c.deudor.toLowerCase() === n.toLowerCase()
        );
        const cuotaMatch = cuotasCli.find(
          (c) => c.idPago.trim() === entry.idOp.trim()
        );
        let miPact = 0;
        if (cuotaMatch) {
          miPact = cuotaMatch.interes;
        } else {
          const nq = cuotasCli.length || 1;
          miPact = (intVentaCrXCli[n] ?? 0) / nq;
        }
        intExtraCobrar[n] = (intExtraCobrar[n] ?? 0) + Math.max(0, entry.intereses - miPact);
      }
    }
  }

  const todosProvs = new Set([...Object.keys(deudaOrig), ...Object.keys(deudaPagado)]);
  const todosClients = new Set([...Object.keys(cobrarOrig), ...Object.keys(cobrarCobrado)]);

  const lesDebo: Record<string, DeudorDetail> = {};
  for (const n of todosProvs) {
    const saldo = Math.max(0, (deudaOrig[n] ?? 0) - (deudaPagado[n] ?? 0));
    if (saldo > 0.01) {
      lesDebo[n] = {
        original: deudaOrig[n] ?? 0,
        pagado: deudaPagado[n] ?? 0,
        intExtra: intExtraPagar[n] ?? 0,
        saldo,
      };
    }
  }

  const meDeben: Record<string, DeudorDetail> = {};
  for (const n of todosClients) {
    const saldo = Math.max(0, (cobrarOrig[n] ?? 0) - (cobrarCobrado[n] ?? 0));
    if (saldo > 0.01) {
      meDeben[n] = {
        original: cobrarOrig[n] ?? 0,
        cobrado: cobrarCobrado[n] ?? 0,
        intExtra: intExtraCobrar[n] ?? 0,
        saldo,
      };
    }
  }

  const cuotasCobrar = deudasCuotas.filter((c) =>
    /Venta a Cr/i.test(c.tipoDeuda)
  );
  const cuotasPagar = deudasCuotas.filter((c) =>
    /Compra (a|cr) Cr/i.test(c.tipoDeuda)
  );

  const alertasCuotas: AlertaCuota[] = deudasCuotas
    .filter((c) => c.alertaTipo !== null)
    .map((c) => ({
      deudor: c.deudor,
      cuota: c.nCuota,
      tipo: c.tipoDeuda,
      montoTotal: c.montoTotal,
      vencimiento: c.vencimiento,
      alerta: c.alertaMsg ?? "",
      idReg: c.idReg,
    }));

  return {
    lesDebo,
    meDeben,
    totalDeuda: Object.values(lesDebo).reduce((s, d) => s + d.saldo, 0),
    totalCobrar: Object.values(meDeben).reduce((s, d) => s + d.saldo, 0),
    cuotasCobrar,
    cuotasPagar,
    alertasCuotas,
  };
}

// ─── calcularTodo ─────────────────────────────────────────────────────────────

/**
 * Traducción directa de calcular_todo() de Python.
 * Recibe el libro diario, el stock, y configuración de inflación.
 */
export function calcularTodo(
  ld: JournalEntry[],
  stk: StockEntry[],
  nombresCapa1: Record<string, string> = {},
  deudasCuotas: DebtInstallment[] = [],
  inflacionPorMes: Record<string, number> = {}
): CalculationResult {
  // ── 1. FIFO ────────────────────────────────────────────────────────────────
  const fifoResultado = calcularFIFOValorCorriente(stk, ld);

  // ── 2. Stock actual ────────────────────────────────────────────────────────
  const stockActualMap = new Map<string, StockItem>();

  for (const [idProd, info] of Object.entries(fifoResultado)) {
    const movs = stk.filter((s) => s.idProd === idProd);
    if (movs.length === 0) continue;
    const first = movs[0];
    const unidadesNetas = movs.reduce((s, m) => s + m.unidades, 0);

    stockActualMap.set(idProd, {
      idProd,
      nombreProd: first.nombreProd,
      tipoItem: first.tipoItem,
      capa1: first.capa1,
      unidades: unidadesNetas,
      costoUnit: unidadesNetas > 0 ? info.valorStock / unidadesNetas : 0,
      valor: info.valorStock,
    });
  }
  const stockActual = [...stockActualMap.values()];

  // ── 3. Clasificación de entradas del libro ─────────────────────────────────
  const ldVentaMer    = ld.filter((e) => isVentaMer(e.tipoOp));
  const ldVentaExtra  = ld.filter((e) => isVentaExtra(e.tipoOp));
  const ldSenasMer    = ld.filter((e) => isSenaMer(e.tipoOp));
  const ldSenasExtra  = ld.filter((e) => isSenaExtra(e.tipoOp));
  const ldSenas       = ld.filter((e) => isSena(e.tipoBase));

  const ingresoVentasMer =
    sumBy(ldVentaMer, "monto") + sumBy(ldSenasMer, "montoTotal");
  const ingresoVentasExtra =
    sumBy(ldVentaExtra, "monto") + sumBy(ldSenasExtra, "montoTotal");
  const ingresoVentasTotal = ingresoVentasMer + ingresoVentasExtra;

  // ── 4. CMV FIFO ────────────────────────────────────────────────────────────
  const numsVentaMer = new Set(ldVentaMer.map((e) => e.numOp));

  const stkVendido = stk.filter(
    (s) => numsVentaMer.has(s.numOp) && s.unidades < 0
  );

  const cmvFifo = stkVendido.reduce((sum, sv) => {
    const cmvNum = fifoResultado[sv.idProd]?.cmvPorNum[sv.numOp ?? ""] ?? 0;
    return sum + cmvNum;
  }, 0);

  const cmvAjusteMat = ld
    .filter((e) => /ajuste de materiales sin id/i.test(e.tipoBase))
    .reduce((s, e) => s + e.montoTotal, 0);

  const cmv = cmvFifo + cmvAjusteMat;

  // ── 5. Gastos ──────────────────────────────────────────────────────────────
  const gastosDetalle = agruparGastos(ld);
  const gastosOp = Object.values(gastosDetalle).reduce((s, v) => s + v, 0);

  // ── 6. Intereses financieros ───────────────────────────────────────────────
  const intCompraCrXProv: Record<string, number> = {};
  for (const e of ld.filter((e) => /compra a cr/i.test(e.tipoBase))) {
    if (e.nombreParen) {
      intCompraCrXProv[e.nombreParen] =
        (intCompraCrXProv[e.nombreParen] ?? 0) + e.intereses;
    }
  }

  const intPactadoPagadoXProv: Record<string, number> = {};
  let intExtraTotalPagar = 0;

  for (const e of ld.filter(
    (e) =>
      /pago a proveedores|cuentas a pagar/i.test(e.tipoBase)
  )) {
    const n = e.nombreParen;
    if (!n) continue;
    const miPagado = e.intereses;
    let miPactado = 0;

    if (deudasCuotas.length > 0) {
      const cuotasProv = deudasCuotas.filter(
        (c) => c.deudor.toLowerCase() === n.toLowerCase()
      );
      const cuotaMatch = cuotasProv.find(
        (c) => c.idPago.trim() === e.idOp.trim()
      );
      if (cuotaMatch) {
        miPactado = cuotaMatch.interes;
      } else {
        const nq = cuotasProv.length || 1;
        miPactado = (intCompraCrXProv[n] ?? 0) / nq;
      }
    } else {
      miPactado = miPagado;
    }

    intPactadoPagadoXProv[n] = (intPactadoPagadoXProv[n] ?? 0) + miPactado;
    intExtraTotalPagar += Math.max(0, miPagado - miPactado);
  }

  const gastoFinanciero =
    Object.values(intCompraCrXProv).reduce((s, v) => s + v, 0) +
    intExtraTotalPagar;

  const intVentaCrXCli: Record<string, number> = {};
  for (const e of ld.filter((e) => /Venta a Cr/i.test(e.tipoBase))) {
    if (e.nombreParen) {
      intVentaCrXCli[e.nombreParen] =
        (intVentaCrXCli[e.nombreParen] ?? 0) + e.intereses;
    }
  }

  let intExtraTotalCobrar = 0;
  let interesesCobrarAccum = Object.values(intVentaCrXCli).reduce((s, v) => s + v, 0);

  for (const e of ld.filter((e) => /cobro de deudores/i.test(e.tipoBase))) {
    const n = e.nombreParen;
    if (!n) continue;
    const miCobrado = e.intereses;
    let miPactado = 0;

    if (deudasCuotas.length > 0) {
      const cuotasCli = deudasCuotas.filter(
        (c) => c.deudor.toLowerCase() === n.toLowerCase()
      );
      const cuotaMatch = cuotasCli.find(
        (c) => c.idPago.trim() === e.idOp.trim()
      );
      if (cuotaMatch) {
        miPactado = cuotaMatch.interes;
      } else {
        const nq = cuotasCli.length || 1;
        miPactado = (intVentaCrXCli[n] ?? 0) / nq;
      }
    } else {
      miPactado = miCobrado;
    }

    intExtraTotalCobrar += Math.max(0, miCobrado - miPactado);
  }

  const ingresoFinanciero = interesesCobrarAccum + intExtraTotalCobrar;

  // ── 7. Otros ───────────────────────────────────────────────────────────────
  const perdidaRotura = ld
    .filter((e) => /rotura|perdida|pérdida/i.test(e.tipoBase))
    .reduce((s, e) => s + e.montoTotal, 0);

  const devolucion = ld
    .filter((e) => /Devoluci/i.test(e.tipoBase))
    .reduce((s, e) => s + e.montoTotal, 0);

  const impuestos = ld
    .filter((e) => /impuesto/i.test(e.tipoBase))
    .reduce((s, e) => s + e.montoTotal, 0);

  const revalorizacionTotal = Object.values(fifoResultado).reduce(
    (s, info) => s + info.gananciaTenencia,
    0
  );

  // Costo FIFO de activos fijos vendidos (dentro de ventas extra)
  const numsVentaExtra = new Set(ldVentaExtra.map((e) => e.numOp));
  const stkActivosVendidos = stk.filter(
    (s) => numsVentaExtra.has(s.numOp) && s.tipoItem === "ACT" && s.unidades < 0
  );
  const costoActivosVendidos = stkActivosVendidos.reduce((sum, sv) => {
    const c = fifoResultado[sv.idProd]?.cmvPorNum[sv.numOp ?? ""] ?? 0;
    return sum + c;
  }, 0);

  const resultadoNeto =
    ingresoVentasTotal -
    cmv -
    costoActivosVendidos -
    gastosOp -
    gastoFinanciero +
    ingresoFinanciero +
    revalorizacionTotal -
    perdidaRotura -
    devolucion -
    impuestos;

  const er: IncomeStatement = {
    ingresoVentasMer,
    ingresoVentasExtra,
    ingresoVentas: ingresoVentasTotal,
    costoActivosVendidos,
    cmv,
    gastosOp,
    gastosDetalle,
    gastoFinanciero,
    ingresoFinanciero,
    revalorizacion: revalorizacionTotal,
    revalorizacionTotal,
    perdidaRotura,
    devolucion,
    impuestos,
    resultadoNeto,
  };

  // ── 8. Balance / SP ────────────────────────────────────────────────────────
  const cajaMap: Record<string, number> = {};
  let materialesSaldo = 0;
  let proveedoresPagar = 0;
  let ctasCobrar = 0;
  let interesesCobrar = 0;
  let interesesPagar = 0;
  const intPactadoXProvPendiente: Record<string, number> = {};

  for (const e of ld) {
    const tl = e.tipoBase.toLowerCase();
    const tipoOpRaw = e.tipoOp.toLowerCase();
    const n = e.nombreParen;
    const ctaO = e.ctaOrigen;
    const ctaD = e.ctaDestino;

    if (tl.includes("aporte")) {
      cajaMap[ctaD] = (cajaMap[ctaD] ?? 0) + e.montoTotal;
    } else if (tl.includes("ingreso extra")) {
      cajaMap[ctaD] = (cajaMap[ctaD] ?? 0) + e.montoTotal;
    } else if (tl.startsWith("gastos")) {
      cajaMap[ctaO] = (cajaMap[ctaO] ?? 0) - e.montoTotal;
    } else if (tl === "compra al contado") {
      cajaMap[ctaO] = (cajaMap[ctaO] ?? 0) - e.montoTotal;
      if (/materiales sin id/i.test(ctaD)) materialesSaldo += e.montoTotal;
    } else if (tl.includes("compra a cr")) {
      proveedoresPagar += e.monto;
      interesesPagar += e.intereses;
      if (n) intPactadoXProvPendiente[n] = (intPactadoXProvPendiente[n] ?? 0) + e.intereses;
    } else if (tl.includes("pago a proveedores") || tl.includes("cuentas a pagar")) {
      proveedoresPagar -= e.monto;
      cajaMap[ctaO] = (cajaMap[ctaO] ?? 0) - e.montoTotal;
      if (n) {
        let miPactado = 0;
        if (deudasCuotas.length > 0) {
          const cuotasProv = deudasCuotas.filter(
            (c) => c.deudor.toLowerCase() === n.toLowerCase()
          );
          const match = cuotasProv.find(
            (c) => c.idPago.trim() === e.idOp.trim()
          );
          if (match) {
            miPactado = match.interes;
          } else {
            const nq = cuotasProv.length || 1;
            miPactado = (intPactadoXProvPendiente[n] ?? 0) / nq;
          }
        } else {
          miPactado = e.intereses;
        }
        const reduccion = Math.min(miPactado, interesesPagar);
        interesesPagar -= reduccion;
        intPactadoXProvPendiente[n] = Math.max(
          0,
          (intPactadoXProvPendiente[n] ?? 0) - reduccion
        );
      }
    } else if (/fabricaci/i.test(tl) && /insumo/i.test(tl)) {
      materialesSaldo -= e.montoTotal;
    } else if (/fabricaci/i.test(tl) && /mercader/i.test(tl)) {
      if (!/insumo/i.test(ctaO.toLowerCase())) materialesSaldo -= e.montoTotal;
    } else if (/venta al contado/i.test(tipoOpRaw)) {
      cajaMap[ctaD] = (cajaMap[ctaD] ?? 0) + e.montoTotal;
    } else if (/venta a cr/i.test(tl)) {
      ctasCobrar += e.monto;
      interesesCobrar += e.intereses;
    } else if (/recibo de se/i.test(tl)) {
      cajaMap[ctaD] = (cajaMap[ctaD] ?? 0) + e.montoTotal;
    } else if (/cobro de deudores/i.test(tl)) {
      cajaMap[ctaD] = (cajaMap[ctaD] ?? 0) + e.montoTotal;
      ctasCobrar -= e.monto;
      if (n && deudasCuotas.length > 0) {
        const cuotasCli = deudasCuotas.filter(
          (c) => c.deudor.toLowerCase() === n.toLowerCase()
        );
        const match = cuotasCli.find(
          (c) => c.idPago.trim() === e.idOp.trim()
        );
        let miPactado = 0;
        if (match) {
          miPactado = match.interes;
        } else {
          const nq = cuotasCli.length || 1;
          miPactado = interesesCobrar > 0 ? interesesCobrar / nq : e.intereses;
        }
        interesesCobrar -= Math.min(miPactado, interesesCobrar);
      } else {
        interesesCobrar -= e.intereses;
      }
    } else if (/devoluci/i.test(tl)) {
      cajaMap[ctaO] = (cajaMap[ctaO] ?? 0) - e.montoTotal;
    } else if (/retiro de soci/i.test(tl)) {
      cajaMap[ctaO] = (cajaMap[ctaO] ?? 0) - e.montoTotal;
    } else if (/pago de impuestos|^impuesto/i.test(tl)) {
      cajaMap[ctaO] = (cajaMap[ctaO] ?? 0) - e.montoTotal;
    } else if (/movimiento entre/i.test(tl)) {
      cajaMap[ctaO] = (cajaMap[ctaO] ?? 0) - e.montoTotal;
      cajaMap[ctaD] = (cajaMap[ctaD] ?? 0) + e.montoTotal;
    } else if (/ajuste de materiales sin id/i.test(tl)) {
      materialesSaldo -= e.montoTotal;
    }
  }

  // Filtrar cuentas que no son caja real
  const cuentasNoCaja = new Set([
    "gastos operativos",
    "materiales sin id",
    "insumos",
    "mercaderia",
    "activos",
    "cuentas por pagar",
    "cuentas por cobrar",
    "capital social",
    "ingreso por ventas",
    "resultados por revalorizaci",
    "anticipo clientes",
    "anticipo proveedores",
    "devoluciones",
    "pérdidas por rotura",
    "perdidas por rotura",
  ]);

  const cajaFiltrada: Record<string, number> = {};
  for (const [k, v] of Object.entries(cajaMap)) {
    const kLow = k.toLowerCase();
    if ([...cuentasNoCaja].some((nc) => kLow.includes(nc))) continue;
    if (Math.abs(v) > 0.01) cajaFiltrada[k] = v;
  }

  const efectivoTotal = Object.values(cajaFiltrada).reduce((s, v) => s + v, 0);

  const aportesTotal = ld
    .filter((e) => /porte/i.test(e.tipoBase))
    .reduce((s, e) => s + e.montoTotal, 0);
  const retirosTotal = ld
    .filter((e) => /retiro de soci/i.test(e.tipoBase))
    .reduce((s, e) => s + e.montoTotal, 0);

  const balanceCS = aportesTotal - retirosTotal;
  const capitalSocial = Math.max(0, balanceCS);
  const excedenteRetiros = Math.min(0, balanceCS);

  const stockMer = stockActual
    .filter((s) => s.tipoItem === "MER" && s.unidades > 0)
    .reduce((sum, s) => sum + s.valor, 0);
  const stockIns = stockActual
    .filter((s) => s.tipoItem === "INS" && s.unidades > 0)
    .reduce((sum, s) => sum + s.valor, 0);
  const stockAct = stockActual
    .filter((s) => s.tipoItem === "ACT" && s.unidades > 0)
    .reduce((sum, s) => sum + s.valor, 0);
  const matPos = Math.max(0, materialesSaldo);
  const ctasCobrarPos = Math.max(0, ctasCobrar);
  const intCobrarPos = Math.max(0, interesesCobrar);

  const totalActivos =
    efectivoTotal +
    ctasCobrarPos +
    intCobrarPos +
    Math.max(0, stockMer) +
    Math.max(0, stockIns) +
    stockAct +
    matPos;
  const totalPasivos =
    Math.max(0, proveedoresPagar) + Math.max(0, interesesPagar);
  const patrimonioNeto = capitalSocial + excedenteRetiros + resultadoNeto;

  // ROE / ROIC
  const gastosExtraordinarios = gastosDetalle["Gastos Extraordinarios"] ?? 0;
  const resultadoOperativo =
    ingresoVentasMer -
    cmv -
    (gastosOp - gastosExtraordinarios) -
    perdidaRotura -
    devolucion;

  const roe = patrimonioNeto > 0 ? (resultadoNeto / patrimonioNeto) * 100 : 0;
  const roic =
    patrimonioNeto > 0 ? (resultadoOperativo / patrimonioNeto) * 100 : 0;

  // Inflación acumulada
  const fechaPrimeraOp = ld
    .filter((e) => e.fecha !== null)
    .map((e) => e.fecha!)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const fechaHoy = new Date();
  let inflacionAcum: number | null = null;
  if (Object.keys(inflacionPorMes).length > 0 && fechaPrimeraOp) {
    inflacionAcum = calculateAccumulatedInflation(
      inflacionPorMes,
      fechaPrimeraOp,
      fechaHoy
    );
  }

  const roeReal =
    inflacionAcum !== null
      ? fisherReal(roe / 100, inflacionAcum) * 100
      : null;
  const roicReal =
    inflacionAcum !== null
      ? fisherReal(roic / 100, inflacionAcum) * 100
      : null;

  // Desglose socios
  const aporteXSocio: Record<string, number> = {};
  const retiroXSocio: Record<string, number> = {};
  for (const e of ld.filter((e) => /porte/i.test(e.tipoBase))) {
    const socio = extractParens(e.tipoOp) ?? "Socio";
    aporteXSocio[socio] = (aporteXSocio[socio] ?? 0) + e.montoTotal;
  }
  for (const e of ld.filter((e) => /retiro de soci/i.test(e.tipoBase))) {
    const socio = extractParens(e.tipoOp) ?? "Socio";
    retiroXSocio[socio] = (retiroXSocio[socio] ?? 0) + e.montoTotal;
  }
  const todosSocios = new Set([
    ...Object.keys(aporteXSocio),
    ...Object.keys(retiroXSocio),
  ]);
  const aportesPorSocio: BalanceSheet["aportesPorSocio"] = {};
  for (const s of todosSocios) {
    aportesPorSocio[s] = {
      aportado: aporteXSocio[s] ?? 0,
      retirado: retiroXSocio[s] ?? 0,
      neto: (aporteXSocio[s] ?? 0) - (retiroXSocio[s] ?? 0),
    };
  }

  const sp: BalanceSheet = {
    cajaDetalle: cajaFiltrada,
    efectivoTotal,
    ctasCobrar: ctasCobrarPos,
    interesesCobrar: intCobrarPos,
    materiales: matPos,
    materialesRaw: materialesSaldo,
    stockIns: Math.max(0, stockIns),
    stockMer: Math.max(0, stockMer),
    stockAct,
    totalActivos,
    proveedoresPagar: Math.max(0, proveedoresPagar),
    interesesPagar: Math.max(0, interesesPagar),
    totalPasivos,
    capitalSocial,
    excedenteRetiros,
    resultadoAcumulado: resultadoNeto,
    patrimonioNeto,
    inflacionAcum,
    roeNominal: roe,
    roicNominal: roic,
    roeReal,
    roicReal,
    aportesPorSocio,
  };

  // ── 9. Flujo de Caja ───────────────────────────────────────────────────────
  const ventasC = ld
    .filter((e) => /venta al contado/i.test(e.tipoOp))
    .reduce((s, e) => s + e.monto, 0);
  const senasC = ldSenas.reduce((s, e) => s + e.montoTotal, 0);
  const cobrosC = ld
    .filter((e) => /cobro de deudores/i.test(e.tipoBase))
    .reduce((s, e) => s + e.montoTotal, 0);
  const pagosP = ld
    .filter((e) => /pago a proveedores|cuentas a pagar/i.test(e.tipoBase))
    .reduce((s, e) => s + e.montoTotal, 0);
  const gastosC = ld
    .filter((e) => isGastos(e.tipoBase))
    .reduce((s, e) => s + e.montoTotal, 0);
  const comprasMerC = ld
    .filter(
      (e) =>
        e.tipoBase === "Compra al Contado" &&
        /mercader|insumo|material/i.test(e.ctaDestino)
    )
    .reduce((s, e) => s + e.montoTotal, 0);
  const comprasActC = ld
    .filter(
      (e) =>
        e.tipoBase === "Compra al Contado" &&
        /activ/i.test(e.ctaDestino)
    )
    .reduce((s, e) => s + e.montoTotal, 0);
  const comprasCrAct = ld
    .filter(
      (e) =>
        /compra a cr/i.test(e.tipoBase) && /activ/i.test(e.ctaDestino)
    )
    .reduce((s, e) => s + e.monto, 0);
  const devolucC = ld
    .filter((e) => /devoluci/i.test(e.tipoBase))
    .reduce((s, e) => s + e.montoTotal, 0);
  const impuestC = ld
    .filter((e) => /impuesto/i.test(e.tipoBase))
    .reduce((s, e) => s + e.montoTotal, 0);
  const ventasActC = ldVentaExtra.reduce((s, e) => s + e.monto, 0);
  const aportesFC = ld
    .filter((e) => /porte/i.test(e.tipoBase))
    .reduce((s, e) => s + e.montoTotal, 0);
  const retirosC = ld
    .filter((e) => /retiro de soci/i.test(e.tipoBase))
    .reduce((s, e) => s + e.montoTotal, 0);

  const flujoOp = ventasC + senasC + cobrosC - pagosP - gastosC - comprasMerC - devolucC - impuestC;
  const flujoInv = ventasActC - comprasActC;
  const flujoFin = aportesFC - retirosC;
  const flujoNetoCaja = flujoOp + flujoInv + flujoFin;

  const fc: CashFlow = {
    ventasC,
    senasC,
    cobrosC,
    pagosP,
    gastosC,
    comprasMerC,
    devolucC,
    impuestC,
    comprasActInvC: comprasActC,
    comprasActInvCr: comprasCrAct,
    ventasActC,
    aportes: aportesFC,
    retirosC,
    flujoOp,
    flujoInv,
    flujoFin,
    flujoNetoCaja,
    comprasC: comprasMerC + comprasActC,
  };

  // ── 10. Cambio de Patrimonio ───────────────────────────────────────────────
  const cpRows: EquityChangeRow[] = [];
  for (const e of ld.filter((entry) => /porte/i.test(entry.tipoBase))) {
    cpRows.push({
      fecha: e.fecha,
      concepto: e.tipoOp,
      capitalSocial: e.montoTotal,
      resultados: 0,
      totalPN: e.montoTotal,
    });
  }
  for (const e of ld.filter((entry) => /retiro de soci/i.test(entry.tipoBase))) {
    cpRows.push({
      fecha: e.fecha,
      concepto: e.tipoOp,
      capitalSocial: -e.montoTotal,
      resultados: 0,
      totalPN: -e.montoTotal,
    });
  }

  const fechaMax = ld
    .filter((e) => e.fecha !== null)
    .map((e) => e.fecha!)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  cpRows.push({
    fecha: fechaMax ?? null,
    concepto: "Resultado del Período",
    capitalSocial: 0,
    resultados: resultadoNeto,
    totalPN: resultadoNeto,
  });
  cpRows.sort((a, b) => {
    if (!a.fecha && !b.fecha) return 0;
    if (!a.fecha) return -1;
    if (!b.fecha) return 1;
    return a.fecha.getTime() - b.fecha.getTime();
  });

  // ── 11. Deudas ─────────────────────────────────────────────────────────────
  const deudas = calcularDeudas(ld, deudasCuotas, intCompraCrXProv, intVentaCrXCli);

  // ── 12. Ventas por categoría y temporalidad ────────────────────────────────
  const ventaXNumMer = Object.fromEntries(ldVentaMer.map((e) => [e.numOp, e.monto]));

  // Señas agrupadas por capa1
  const senasXCapa1: Record<string, number> = {};
  for (const e of ldSenasMer) {
    const idProd = extractParens(e.tipoOp)?.trim().toUpperCase() ?? "";
    const capa1Key = idProd.split("-").slice(0, 2).join("-");
    senasXCapa1[capa1Key] = (senasXCapa1[capa1Key] ?? 0) + e.monto;
  }

  const ventaXCapa1: VentaXCapa1 = {};
  const udsXLabel: Record<string, number> = {};

  // Agrupar por capa1
  const stkVendidoByCapa1 = groupBy(stkVendido, (s) => s.capa1);

  for (const [c1, grupo] of Object.entries(stkVendidoByCapa1)) {
    const costo = grupo.reduce((sum, sv) => {
      return sum + (fifoResultado[sv.idProd]?.cmvPorNum[sv.numOp ?? ""] ?? 0);
    }, 0);

    const numsUnicos = [...new Set(grupo.map((s) => s.numOp))];
    let venta = numsUnicos.reduce((s, num) => s + (ventaXNumMer[num ?? ""] ?? 0), 0);
    venta += senasXCapa1[c1] ?? 0;

    const ganancia = venta - costo;
    const unidades = Math.abs(grupo.reduce((s, sv) => s + sv.unidades, 0));

    const nombreC1 =
      nombresCapa1[c1] ??
      (() => {
        const prod = stk.filter((s) => s.capa1 === c1)[0];
        return prod ? prod.nombreProd.split(" ").slice(0, 2).join(" ") : c1;
      })();

    const label = `${nombreC1} (x${unidades} uds)`;
    udsXLabel[label] = unidades;
    ventaXCapa1[label] = { venta, costo, ganancia };
  }

  // Ajuste por materiales sin ID
  if (cmvAjusteMat > 0 && Object.keys(ventaXCapa1).length > 0) {
    const totalUdsVendidas = Object.values(udsXLabel).reduce((s, v) => s + v, 0);
    if (totalUdsVendidas > 0) {
      const ajustePorUdad = cmvAjusteMat / totalUdsVendidas;
      for (const [lbl, uds] of Object.entries(udsXLabel)) {
        const adj = ajustePorUdad * uds;
        ventaXCapa1[lbl].costo += adj;
        ventaXCapa1[lbl].ganancia -= adj;
      }
    }
  }

  // Ventas temporales
  const ventasMerAnuales = ventasTemporales(ldVentaMer, "anual");
  const ventasMerMensuales = ventasTemporales(ldVentaMer, "mensual");
  const ventasExtraAnuales = ventasTemporales(ldVentaExtra, "anual");
  const ventasExtraMensuales = ventasTemporales(ldVentaExtra, "mensual");

  const ldDevolucion = ld.filter(
    (e) => /Devoluci/i.test(e.tipoBase) && e.fecha !== null
  );
  const devolucAnuales = ventasTemporales(ldDevolucion, "anual", "montoTotal");
  const devolucMensuales = ventasTemporales(ldDevolucion, "mensual", "montoTotal");

  return {
    er,
    sp,
    fc,
    cp: cpRows,
    deudas,
    stockActual,
    roe,
    roic,
    ventaXCapa1,
    ventasMerAnuales,
    ventasMerMensuales,
    ventasExtraAnuales,
    ventasExtraMensuales,
    devolucAnuales,
    devolucMensuales,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sumBy(arr: JournalEntry[], key: keyof JournalEntry): number {
  return arr.reduce((s, e) => s + ((e[key] as number) ?? 0), 0);
}

function groupBy<T>(arr: T[], fn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of arr) {
    const key = fn(item);
    if (!result[key]) result[key] = [];
    result[key].push(item);
  }
  return result;
}

function ventasTemporales(
  entries: JournalEntry[],
  granularity: "anual" | "mensual",
  montoKey: "monto" | "montoTotal" = "monto"
): VentaTemporal[] {
  const agg: Record<string, number> = {};

  for (const e of entries) {
    if (!e.fecha) continue;
    const periodo =
      granularity === "anual"
        ? String(e.fecha.getFullYear())
        : toYearMonth(e.fecha);
    agg[periodo] = (agg[periodo] ?? 0) + e[montoKey];
  }

  return Object.entries(agg)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodo, monto]) => ({ periodo, monto }));
}
