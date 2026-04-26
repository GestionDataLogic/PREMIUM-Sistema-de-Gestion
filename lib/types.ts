// lib/types.ts

export type AlertaTipo = "vencida" | "3dias" | "7dias" | null;

export interface DebtInstallment {
  idReg: string;
  fechaReg: Date | null;
  tipoDeuda: string;
  deudor: string;
  nCuota: string | number;
  montoBase: number;
  interes: number;
  montoTotal: number;
  vencimiento: Date | null;
  idPago: string;
  fechaPago: Date | null;
  situacion: string;
  estadoDeuda: string;
  alertaTipo: AlertaTipo;
  alertaMsg: string | null;
}

export interface StockItem {
  idProd: string;
  nombreProd: string;
  tipoItem: "MER" | "INS" | "ACT" | "OTRO";
  capa1: string;
  unidades: number;
  costoUnit: number;
  valor: number;
}

export interface IncomeStatement {
  ingresoVentasMer: number;
  ingresoVentasExtra: number;
  ingresoVentas: number;
  costoActivosVendidos: number;
  cmv: number;
  gastosOp: number;
  gastosDetalle: Record<string, number>;
  gastoFinanciero: number;
  ingresoFinanciero: number;
  revalorizacion: number;
  revalorizacionTotal: number;
  perdidaRotura: number;
  devolucion: number;
  impuestos: number;
  resultadoNeto: number;
}

export interface BalanceSheet {
  cajaDetalle: Record<string, number>;
  efectivoTotal: number;
  ctasCobrar: number;
  interesesCobrar: number;
  materiales: number;
  materialesRaw: number;
  stockIns: number;
  stockMer: number;
  stockAct: number;
  totalActivos: number;
  proveedoresPagar: number;
  interesesPagar: number;
  totalPasivos: number;
  capitalSocial: number;
  excedenteRetiros: number;
  resultadoAcumulado: number;
  patrimonioNeto: number;
  resultadoPeriodosAnteriores?: number;
  resultadoNetoPeriodo?: number;
  inflacionAcum: number | null;
  roeNominal: number;
  roicNominal: number;
  roeReal: number | null;
  roicReal: number | null;
  aportesPorSocio: Record<string, { aportado: number; retirado: number; neto: number }>;
}

export interface CashFlow {
  ventasC: number;
  senasC: number;
  cobrosC: number;
  pagosP: number;
  gastosC: number;
  comprasMerC: number;
  devolucC: number;
  impuestC: number;
  comprasActInvC: number;
  comprasActInvCr: number;
  ventasActC: number;
  aportes: number;
  retirosC: number;
  flujoOp: number;
  flujoInv: number;
  flujoFin: number;
  flujoNetoCaja: number;
  comprasC: number;
}

export interface EquityChangeRow {
  fecha: Date | null;
  concepto: string;
  capitalSocial: number;
  resultados: number;
  totalPN: number;
}

export interface DeudorDetail {
  original: number;
  pagado?: number;
  cobrado?: number;
  intExtra: number;
  saldo: number;
}

export interface AlertaCuota {
  deudor: string;
  cuota: string | number;
  tipo: string;
  montoTotal: number;
  vencimiento: Date | null;
  alerta: string;
  idReg: string;
}

export interface DebtControl {
  lesDebo: Record<string, DeudorDetail>;
  meDeben: Record<string, DeudorDetail>;
  totalDeuda: number;
  totalCobrar: number;
  cuotasCobrar: DebtInstallment[];
  cuotasPagar: DebtInstallment[];
  alertasCuotas: AlertaCuota[];
}

export interface VentaTemporal {
  periodo: string;
  monto: number;
}

export interface VentaXCapa1 {
  [label: string]: { venta: number; costo: number; ganancia: number };
}

export interface CalculationResult {
  er: IncomeStatement;
  sp: BalanceSheet;
  fc: CashFlow;
  cp: EquityChangeRow[];
  deudas: DebtControl;
  stockActual: StockItem[];
  roe: number;
  roic: number;
  ventaXCapa1: VentaXCapa1;
  ventasMerAnuales: VentaTemporal[];
  ventasMerMensuales: VentaTemporal[];
  ventasExtraAnuales: VentaTemporal[];
  ventasExtraMensuales: VentaTemporal[];
  devolucAnuales: VentaTemporal[];
  devolucMensuales: VentaTemporal[];
}

export type PeriodType = "anual" | "trimestre" | "mensual";

export interface Period {
  label: string;
  inicio: Date;
  fin: Date;
  tipo: PeriodType;
}

// ─── Libro Diario ────────────────────────────────────────────────────────────
export interface JournalEntry {
  idOp: string;
  fecha: Date | null;
  tipoOp: string;
  tipoBase: string;
  nombreParen: string | null;
  numOp: string | null;
  ctaOrigen: string;
  ctaDestino: string;
  monto: number;
  intereses: number;
  montoTotal: number;
  detalle: string;
  estado: string;
}

// ─── Stock ─────────────────────────────────────────────────────────────────── 
export interface StockEntry {
  idOp: string;
  fecha: Date | null;
  tipoOp: string;
  tipoBase: string;
  numOp: string | null;
  detalle: string;          
  idProd: string;
  nombreProd: string;
  tipoItem: "MER" | "INS" | "ACT" | "OTRO";
  capa1: string;
  unidades: number;
  costoFijo: number;
  costoUnit: number;
}

// ─── FIFO ────────────────────────────────────────────────────────────────────
export interface FIFOProductResult {
  valorStock: number;
  cmvPorNum: Record<string, number>;
  gananciaTenencia: number;
}
export type FIFOResult = Record<string, FIFOProductResult>;

// ─── Configuración de usuario ────────────────────────────────────────────────
export interface UserConfig {
  nombre: string;
  celular: string;
  empresa: string;
  usuario: string;
  clave: string;
  sheetId: string;
  gidLd: string;
  gidStock: string;
  gidIds: string;
}

// ─── Datos de empresa (caché) ────────────────────────────────────────────────
export interface CompanyData {
  ld: JournalEntry[];
  stk: StockEntry[];
  deudas_cuotas: DebtInstallment[];
  nombres_capa1: Record<string, string>;
  inflacion_por_mes: Record<string, number>;
  periodos: Period[];
}

// ─── Resultado de período ────────────────────────────────────────────────────
export interface PeriodResult {
  er: IncomeStatement;
  sp: BalanceSheet;
  fc: CashFlow;
  cp: EquityChangeRow[];
  deudas: DebtControl;
  stock: StockItem[];
  roe: number;
  roic: number;
  tieneEr: boolean;
  fechaInicio: Date;
  fechaFin: Date;
}
