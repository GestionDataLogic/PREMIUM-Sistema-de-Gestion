import type {
  JournalEntry,
  StockEntry,
  DebtInstallment,
  AlertaTipo,
} from "./types";

export function cleanMoney(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const s = String(val).trim();
  if (s === "" || s === "-" || s === "nan") return 0;

  let cleaned = s.replace(/[\$\s]/g, "");

  if (cleaned.includes(",") && cleaned.includes(".")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (cleaned.includes(",") && !cleaned.includes(".")) {
    cleaned = cleaned.replace(",", ".");
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function extractParens(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = text.match(/\(([^)]+)\)/);
  return match ? match[1].trim() : null;
}

export function removeParens(text: string | null | undefined): string {
  if (!text) return "";
  return text.replace(/\s*\([^)]*\)/g, "").trim();
}


function extractNumOp(id: string): string | null {
  const match = id.match(/-(\d+)$/);
  return match ? match[1] : null;
}


function isActivo(val: string): boolean {
  return val.trim().toUpperCase() === "ACTIVO";
}

function parseDate(val: string): Date | null {
  if (!val || val.trim() === "" || val === "nan") return null;
  const d = new Date(val.trim());
  return isNaN(d.getTime()) ? null : d;
}

function calcAlertaCuota(
  vencimiento: Date | null,
  fechaPago: Date | null,
  situacion: string,
  hoy: Date
): { alertaTipo: AlertaTipo; alertaMsg: string | null } {
  const stLow = (situacion ?? "").trim().toLowerCase();

  if (fechaPago !== null) return { alertaTipo: null, alertaMsg: null };
  if (stLow.includes("pagad") || stLow.includes("realiz"))
    return { alertaTipo: null, alertaMsg: null };
  if (!vencimiento) return { alertaTipo: null, alertaMsg: null };

  const hoyNorm = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const vencNorm = new Date(
    vencimiento.getFullYear(),
    vencimiento.getMonth(),
    vencimiento.getDate()
  );

  if (vencNorm < hoyNorm)
    return { alertaTipo: "vencida", alertaMsg: "Deuda vencida" };

  const diffDays = Math.round(
    (vencNorm.getTime() - hoyNorm.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays <= 3) return { alertaTipo: "3dias", alertaMsg: "Menos de 3 días" };
  if (diffDays <= 7)
    return { alertaTipo: "7dias", alertaMsg: "Menos de 1 semana" };

  return { alertaTipo: null, alertaMsg: null };
}

export function parseJournal(rows: string[][]): JournalEntry[] {
  let headerIdx = -1;

  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some((v) => v.includes("ID de la Operaci"))) {
      headerIdx = i;
      break;
    }
  }

  const dataRows = headerIdx >= 0 ? rows.slice(headerIdx + 1) : rows;

  const diaRows = dataRows.filter((row) =>
    row[0]?.trim().match(/^DIA-/)
  );

  const entries: JournalEntry[] = [];

  for (const row of diaRows) {
    while (row.length < 10) row.push("");

    const [
      idOp,
      fechaRaw,
      tipoOp,
      ctaOrigen,
      ctaDestino,
      detalle,
      montoRaw,
      interesesRaw,
      montoTotalRaw,
      estadoRaw,
    ] = row;

    const estado = estadoRaw || "ACTIVO";
    if (!isActivo(estado)) continue;

    entries.push({
      idOp: idOp.trim(),
      fecha: parseDate(fechaRaw),
      tipoOp: tipoOp.trim(),
      ctaOrigen: ctaOrigen.trim(),
      ctaDestino: ctaDestino.trim(),
      detalle: detalle.trim(),
      monto: cleanMoney(montoRaw),
      intereses: cleanMoney(interesesRaw),
      montoTotal: cleanMoney(montoTotalRaw),
      estado: estado.trim(),
      nombreParen: extractParens(tipoOp),
      tipoBase: removeParens(tipoOp),
      numOp: extractNumOp(idOp.trim()),
    });
  }

  return entries;
}

export function parseStock(
  rows: string[][]
): { stock: StockEntry[]; deudas: DebtInstallment[] } {
  let headerIdx = -1;
  let startDebt: number | null = null;


  for (let i = 0; i < rows.length; i++) {
    const hasId = rows[i].some((v) => v.includes("ID de la Operaci"));
    const hasCosto = rows[i].some((v) => v.includes("Costo Fijo"));
    if (hasId && hasCosto) {
      headerIdx = i;
      for (let j = 0; j < rows[i].length; j++) {
        if (
          rows[i][j].includes("ID Operacion de Registro") ||
          rows[i][j].includes("ID Operación de Registro")
        ) {
          startDebt = j;
          break;
        }
      }
      break;
    }
  }

  const dataRows = headerIdx >= 0 ? rows.slice(headerIdx + 1) : rows;

  const stockEntries: StockEntry[] = [];

  for (const row of dataRows) {
    if (!row[0]?.trim().match(/^STK-/)) continue;

    while (row.length < 9) row.push("");

    const [
      idOp,
      fechaRaw,
      tipoMov,
      detalle,
      idProd,
      nombreProd,
      unidadesRaw,
      costoUnitRaw,
      estadoRaw,
    ] = row;

    const estado = estadoRaw || "ACTIVO";
    if (!isActivo(estado)) continue;

    const idProdClean = idProd.trim();
    const tipoItem = idProdClean.startsWith("MER")
      ? "MER"
      : idProdClean.startsWith("INS")
      ? "INS"
      : idProdClean.startsWith("ACT")
      ? "ACT"
      : "OTRO";

    const capa1Parts = idProdClean.split("-").slice(0, 2);
    const capa1 = capa1Parts.join("-");

    stockEntries.push({
      idOp: idOp.trim(),
      fecha: parseDate(fechaRaw),
      tipoOp: tipoMov.trim(),    
      tipoBase: removeParens(tipoMov),
      detalle: detalle.trim(),
      idProd: idProdClean,
      nombreProd: nombreProd.trim(),
      unidades: parseFloat(unidadesRaw) || 0,
      costoFijo: 0,  // <-- AÑADIR ESTA LÍNEA
      costoUnit: cleanMoney(costoUnitRaw),
      tipoItem,
      capa1,
      numOp: extractNumOp(idOp.trim()),
    });
  }

  const deudas: DebtInstallment[] = [];

  if (startDebt !== null) {
    const hoy = new Date();

    for (const row of dataRows) {
      if (row.length < startDebt + 13) continue;

      const slice = row.slice(startDebt, startDebt + 13);
      const [
        idReg,
        fechaRegRaw,
        tipoDeuda,
        deudor,
        nCuota,
        montoBaseRaw,
        interesRaw,
        montoTotalRaw,
        vencimientoRaw,
        idPago,
        fechaPagoRaw,
        situacion,
        estadoDeudaRaw,
      ] = slice;

      if (!idReg?.trim() || !isActivo(estadoDeudaRaw ?? "")) continue;

      const vencimiento = parseDate(vencimientoRaw);
      const fechaPago = parseDate(fechaPagoRaw);

      const { alertaTipo, alertaMsg } = calcAlertaCuota(
        vencimiento,
        fechaPago,
        situacion ?? "",
        hoy
      );

      deudas.push({
        idReg: idReg.trim(),
        fechaReg: parseDate(fechaRegRaw),
        tipoDeuda: tipoDeuda?.trim() ?? "",
        deudor: deudor?.trim() ?? "",
        nCuota: nCuota?.trim() ?? "",
        montoBase: cleanMoney(montoBaseRaw),
        interes: cleanMoney(interesRaw),
        montoTotal: cleanMoney(montoTotalRaw),
        vencimiento,
        idPago: idPago?.trim() ?? "",
        fechaPago,
        situacion: situacion?.trim() ?? "",
        estadoDeuda: estadoDeudaRaw?.trim() ?? "",
        alertaTipo,
        alertaMsg,
      });
    }
  }

  return { stock: stockEntries, deudas };
}


export function parseIdList(rows: string[][]): Record<string, string> {
  const nombresCapa1: Record<string, string> = {};

  let headerRow = -1;
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].some((v) => v.includes("Capa 1 (ID)"))) {
      headerRow = i;
      break;
    }
  }

  if (headerRow < 0) return nombresCapa1;

  const headers = rows[headerRow].map((v) => v.trim());
  const dataRows = rows.slice(headerRow + 1);

  const idxTipo: number[] = [];
  const idxId: number[] = [];
  const idxNombre: number[] = [];

  headers.forEach((h, i) => {
    if (h === "Tipo") idxTipo.push(i);
    if (h === "Capa 1 (ID)") idxId.push(i);
    if (h === "Capa 1 (Nombre)") idxNombre.push(i);
  });

  for (let gi = 0; gi < idxId.length; gi++) {
    const idCol = idxId[gi];
    const nomCol = idxNombre[gi];

    const tipoCol = idxTipo
      .filter((t) => t <= idCol)
      .reduce((prev, curr) => (curr > prev ? curr : prev), -1);

    if (tipoCol < 0) continue;

    let prevTipo = "";
    let prevId = "";
    let prevNom = "";

    for (const row of dataRows) {
      let tipo = (row[tipoCol] ?? "").trim();
      let c1id = (row[idCol] ?? "").trim();
      let c1nm = (row[nomCol] ?? "").trim();

      if (!tipo || tipo === "nan") tipo = prevTipo;
      else prevTipo = tipo;

      if (!c1id || c1id === "nan") c1id = prevId;
      else prevId = c1id;

      if (!c1nm || c1nm === "nan") c1nm = prevNom;
      else prevNom = c1nm;

      if (!c1id || !c1nm) continue;

      const prefijo = tipo.slice(0, 3).toUpperCase();
      if (!["MER", "INS", "ACT", "CTA", "SOC"].includes(prefijo)) continue;

      const clave = `${prefijo}-${c1id.padStart(3, "0")}`;
      if (!(clave in nombresCapa1)) {
        nombresCapa1[clave] = c1nm;
      }
    }
  }

  return nombresCapa1;
}

export function readInflation(rows: string[][]): Record<string, number> {
  const inflacion: Record<string, number> = {};

  let headerRow = -1;

  for (let i = 0; i < rows.length; i++) {
    const vals = rows[i].map((v) => v.trim().toLowerCase());
    if (vals.includes("mes") && vals.some((v) => v.includes("inflaci"))) {
      headerRow = i;
      break;
    }
  }

  if (headerRow < 0) {
    outer: for (let i = 0; i < rows.length; i++) {
      for (const v of rows[i]) {
        if (/^\d{4}-\d{2}$/.test(v.trim())) {
          headerRow = Math.max(0, i - 1);
          break outer;
        }
      }
    }
  }

  if (headerRow < 0) return inflacion;

  const headerVals = rows[headerRow].map((v) => v.trim().toLowerCase());
  const colMes = headerVals.indexOf("mes");
  const colInfl = headerVals.findIndex((v) => v.includes("inflaci"));

  if (colMes < 0 || colInfl < 0) return inflacion;

  for (const row of rows.slice(headerRow + 1)) {
    const mesStr = (row[colMes] ?? "").trim();
    const inflStr = (row[colInfl] ?? "").trim();

    if (!mesStr || mesStr === "nan" || !inflStr || inflStr === "nan") continue;
    if (!/^\d{4}-\d{1,2}$/.test(mesStr)) continue;

    const [y, m] = mesStr.split("-");
    const key = `${y}-${m.padStart(2, "0")}`;

    let tasa = parseFloat(inflStr.replace("%", "").replace(",", ".").trim());
    if (isNaN(tasa)) continue;

    if (tasa > 1) tasa /= 100;

    inflacion[key] = tasa;
  }

  return inflacion;
}
