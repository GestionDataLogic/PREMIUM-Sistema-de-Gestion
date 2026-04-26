"use client";

import { useState } from "react";
import {
  LayoutDashboard, Package, CreditCard, BarChart3,
  ArrowLeftRight, Bell, Menu, ChevronDown,
  CircleDollarSign, Wallet, AlertTriangle, LogOut,
  RefreshCw, Info, Loader2,
} from "lucide-react";
import { useCompanyData } from "@/hooks/useCompanyData";
import {
  formatARS, formatPct, formatPctPlain, deltaClass, numClass,
  formatDate, formatPeriodLabel, pctChange,
  alertBadgeClass, alertBadgeLabel,
} from "@/lib/format";
import type { CalculationResult, Period, DebtInstallment } from "@/lib/types";

// ─── Nav ──────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "dashboard",  label: "Dashboard",     icon: LayoutDashboard },
  { id: "resultados", label: "Resultados",    icon: BarChart3 },
  { id: "patrimonio", label: "Patrimonio",    icon: Wallet },
  { id: "flujo",      label: "Flujo de Caja", icon: CircleDollarSign },
  { id: "deudas",     label: "Deudas",        icon: CreditCard },
  { id: "stock",      label: "Stock",         icon: Package },
  { id: "comparador", label: "Comparador",    icon: ArrowLeftRight },
] as const;

type TabId = typeof NAV_ITEMS[number]["id"];

// ─── Loading / Error states ───────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="card" style={{ padding: "20px 24px" }}>
      <div className="skeleton" style={{ height: 12, width: "50%", marginBottom: 14 }} />
      <div className="skeleton" style={{ height: 28, width: "70%", marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 10, width: "40%" }} />
    </div>
  );
}

function LoadingGrid() {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <SkeletonCard /><SkeletonCard />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: "80px 24px", textAlign: "center" }}>
      <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--red-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <AlertTriangle size={22} style={{ color: "var(--red)" }} />
      </div>
      <div>
        <div style={{ color: "var(--text-primary)", fontWeight: 600, marginBottom: 6 }}>Error al cargar datos</div>
        <div style={{ color: "var(--text-tertiary)", fontSize: 12, maxWidth: 360 }}>{message}</div>
      </div>
      <button onClick={onRetry} style={{ padding: "9px 20px", borderRadius: 9, border: "1px solid var(--brand)", background: "var(--brand-dim)", color: "var(--brand)", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 7 }}>
        <RefreshCw size={13} /> Reintentar
      </button>
    </div>
  );
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: "var(--text-secondary)", fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
      {children}
    </p>
  );
}

function Badge({ type, label }: { type: string; label: string }) {
  return <span className={`badge ${type}`}>{label}</span>;
}

function MetricCard({ label, value, delta, deltaLabel, sub, delay = "" }: {
  label: string; value: string; delta?: number; deltaLabel?: string; sub?: string; delay?: string;
}) {
  return (
    <div className={`card fade-up ${delay}`} style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <span style={{ color: "var(--text-secondary)", fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
        {delta !== undefined && <Badge type={deltaClass(delta)} label={deltaLabel ?? formatPct(delta)} />}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ color: "var(--text-tertiary)", fontSize: 12, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function Accordion({ title, children, defaultOpen = false, badge }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean; badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card" style={{ marginBottom: 10, overflow: "hidden" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", fontFamily: "inherit", fontSize: 14, fontWeight: 600 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>{title}{badge}</span>
        <ChevronDown size={16} style={{ color: "var(--text-tertiary)", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }} />
      </button>
      {open && <div style={{ padding: "0 20px 20px" }}>{children}</div>}
    </div>
  );
}

function DataRow({ label, value, accent = false, indent = false }: {
  label: string; value: string; accent?: boolean; indent?: boolean;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid var(--border-subtle)" }}>
      <span style={{ color: accent ? "var(--text-primary)" : "var(--text-secondary)", fontSize: indent ? 12 : 13, fontWeight: accent ? 600 : 400, paddingLeft: indent ? 12 : 0 }}>{label}</span>
      <span style={{ color: accent ? "var(--text-primary)" : "var(--text-secondary)", fontSize: 13, fontWeight: accent ? 700 : 500, fontFamily: "DM Mono, monospace" }}>{value}</span>
    </div>
  );
}

// ─── SVG Area Chart ───────────────────────────────────────────────────────────

function AreaChart({ data, color = "#4f8ef7", height = 120 }: {
  data: { periodo: string; monto: number }[]; color?: string; height?: number;
}) {
  if (!data.length) return <div style={{ color: "var(--text-tertiary)", fontSize: 12, paddingTop: 20 }}>Sin datos</div>;
  const W = 600; const H = height;
  const max = Math.max(...data.map(d => d.monto), 1);
  const min = Math.min(...data.map(d => d.monto), 0);
  const range = max - min || 1;
  const pad = { t: 8, b: 20, l: 0, r: 0 };
  const cw = W - pad.l - pad.r; const ch = H - pad.t - pad.b;
  const pts = data.map((d, i) => ({
    x: pad.l + (i / Math.max(data.length - 1, 1)) * cw,
    y: pad.t + (1 - (d.monto - min) / range) * ch,
    label: d.periodo,
  }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].x},${H - pad.b} L${pts[0].x},${H - pad.b} Z`;
  const gid = `ag${color.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.filter((_, i) => i % Math.ceil(pts.length / 6) === 0).map(p => (
        <text key={p.label} x={p.x} y={H} textAnchor="middle" fontSize="9" fill="var(--text-tertiary)" style={{ fontFamily: "DM Sans, sans-serif" }}>
          {p.label.split("-").slice(1).join("-") || p.label}
        </text>
      ))}
      {pts.map(p => <circle key={p.label} cx={p.x} cy={p.y} r="2.5" fill={color} opacity="0.9" />)}
    </svg>
  );
}

// ─── Tab components ───────────────────────────────────────────────────────────

function DashboardTab({ result }: { result: CalculationResult }) {
  const { er, sp, deudas, ventasMerMensuales, ventaXCapa1 } = result;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
        <MetricCard label="Ingresos Totales" value={formatARS(er.ingresoVentas, true)} sub={`CMV: ${formatARS(er.cmv, true)}`} delay="fade-up-1" />
        <MetricCard label="Resultado Neto"   value={formatARS(er.resultadoNeto, true)}
          delta={er.resultadoNeto > 0 ? 1 : -1}
          deltaLabel={`Margen ${formatPctPlain(er.ingresoVentas > 0 ? er.resultadoNeto / er.ingresoVentas * 100 : 0)}`}
          delay="fade-up-2" />
        <MetricCard label="Total Activos"    value={formatARS(sp.totalActivos, true)} sub={`Pasivos: ${formatARS(sp.totalPasivos, true)}`} delay="fade-up-3" />
        <MetricCard label="Efectivo"         value={formatARS(sp.efectivoTotal, true)} sub={`PN: ${formatARS(sp.patrimonioNeto, true)}`} delay="fade-up-4" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
        <div className="card fade-up fade-up-5" style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <SubTitle>Evolución de Ventas</SubTitle>
            <Badge type="badge-blue" label="Últimos 12 meses" />
          </div>
          <AreaChart data={ventasMerMensuales.slice(-12)} color="#4f8ef7" height={120} />
        </div>
        <div className="card fade-up fade-up-6" style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <SubTitle>Rentabilidad</SubTitle>
            <div style={{ display: "flex", gap: 6 }}>
              <Badge type={sp.roeNominal >= 20 ? "badge-green" : sp.roeNominal >= 12 ? "badge-yellow" : "badge-red"} label={`ROE ${formatPctPlain(sp.roeNominal)}`} />
              <Badge type={sp.roicNominal >= 15 ? "badge-green" : sp.roicNominal >= 8 ? "badge-yellow" : "badge-red"} label={`ROIC ${formatPctPlain(sp.roicNominal)}`} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {([
              { label: "ROE Nominal",  val: sp.roeNominal },
              { label: "ROIC Nominal", val: sp.roicNominal },
              { label: "ROE Real",     val: sp.roeReal },
              { label: "ROIC Real",    val: sp.roicReal },
            ] as { label: string; val: number | null }[]).map(({ label, val }) => (
              <div key={label} style={{ background: "var(--bg-elevated)", borderRadius: 10, padding: "12px 14px", border: "1px solid var(--border-subtle)" }}>
                <div style={{ color: "var(--text-secondary)", fontSize: 11, marginBottom: 6 }}>{label}</div>
                <div className={numClass(val ?? 0)} style={{ fontSize: 20, fontWeight: 700, fontFamily: "DM Mono, monospace" }}>
                  {val !== null && val !== undefined ? formatPctPlain(val) : "—"}
                </div>
              </div>
            ))}
          </div>
          {sp.inflacionAcum !== null && (
            <div style={{ marginTop: 10, padding: "8px 12px", background: "var(--bg-elevated)", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <Info size={12} style={{ color: "var(--text-tertiary)" }} />
              <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>Inflación acumulada: {formatPctPlain(sp.inflacionAcum * 100)}</span>
            </div>
          )}
        </div>
      </div>

      {deudas.alertasCuotas.length > 0 && (
        <div className="card fade-up" style={{ padding: "20px 24px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <AlertTriangle size={15} style={{ color: "var(--red)" }} />
            <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>Alertas de Cuotas</span>
          </div>
          {deudas.alertasCuotas.map(a => (
            <div key={a.idReg} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--bg-elevated)", borderRadius: 10, border: "1px solid var(--border-subtle)", marginBottom: 8 }}>
              <div>
                <span style={{ color: "var(--text-primary)", fontWeight: 500, fontSize: 13 }}>{a.deudor}</span>
                <span style={{ color: "var(--text-tertiary)", fontSize: 12, marginLeft: 10 }}>Cuota {a.cuota} · {a.tipo}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ color: "var(--text-secondary)", fontFamily: "DM Mono", fontSize: 12 }}>{formatARS(a.montoTotal, true)}</span>
                <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>{formatDate(a.vencimiento)}</span>
                <Badge type={alertBadgeClass(a.alerta.toLowerCase().includes("vencida") ? "vencida" : a.alerta.includes("3") ? "3dias" : a.alerta.toLowerCase().includes("sem") ? "7dias" : null)} label={a.alerta} />
              </div>
            </div>
          ))}
        </div>
      )}

      {Object.keys(ventaXCapa1).length > 0 && (
        <div className="card" style={{ padding: "20px 24px" }}>
          <SubTitle>Ventas por Categoría</SubTitle>
          {Object.entries(ventaXCapa1).map(([label, data]) => {
            const margin = data.venta > 0 ? (data.ganancia / data.venta) * 100 : 0;
            const pct    = er.ingresoVentasMer > 0 ? (data.venta / er.ingresoVentasMer) * 100 : 0;
            return (
              <div key={label} style={{ padding: "12px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ color: "var(--text-primary)", fontSize: 13 }}>{label}</span>
                  <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                    <span style={{ color: "var(--green)", fontFamily: "DM Mono", fontSize: 12 }}>+{formatARS(data.ganancia, true)}</span>
                    <span style={{ color: "var(--text-secondary)", fontFamily: "DM Mono", fontSize: 12 }}>{formatARS(data.venta, true)}</span>
                    <Badge type={margin >= 30 ? "badge-green" : margin >= 20 ? "badge-yellow" : "badge-red"} label={`${margin.toFixed(0)}%`} />
                  </div>
                </div>
                <div style={{ background: "var(--bg-elevated)", borderRadius: 4, height: 4, overflow: "hidden" }}>
                  <div style={{ width: `${pct}%`, height: "100%", background: "linear-gradient(90deg, var(--brand), #7cb3ff)", borderRadius: 4, transition: "width 0.6s ease" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ResultadosTab({ result }: { result: CalculationResult }) {
  const { er } = result;
  const margenBruto = er.ingresoVentasMer > 0 ? (er.ingresoVentasMer - er.cmv) / er.ingresoVentasMer * 100 : 0;
  const margenNeto  = er.ingresoVentas > 0 ? er.resultadoNeto / er.ingresoVentas * 100 : 0;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
        <MetricCard label="Ingresos Mer."  value={formatARS(er.ingresoVentasMer, true)}  delay="fade-up-1" />
        <MetricCard label="Ingresos Extra" value={formatARS(er.ingresoVentasExtra, true)} delay="fade-up-2" />
        <MetricCard label="CMV"            value={formatARS(er.cmv, true)} sub={`Margen bruto: ${margenBruto.toFixed(1)}%`} delay="fade-up-3" />
        <MetricCard label="Resultado Neto" value={formatARS(er.resultadoNeto, true)} sub={`Margen neto: ${margenNeto.toFixed(1)}%`} delay="fade-up-4" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <Accordion title="Ingresos" defaultOpen>
            <DataRow label="Ventas de Mercadería"    value={formatARS(er.ingresoVentasMer)} />
            <DataRow label="Ventas Extra / Servicios" value={formatARS(er.ingresoVentasExtra)} />
            <DataRow label="Total Ingresos"           value={formatARS(er.ingresoVentas)} accent />
          </Accordion>
          <Accordion title="Costos y Gastos" defaultOpen>
            <DataRow label="Costo Mercadería Vendida" value={formatARS(er.cmv)} />
            <DataRow label="Costo Activos Vendidos"   value={formatARS(er.costoActivosVendidos)} />
            {Object.entries(er.gastosDetalle).map(([k, v]) => <DataRow key={k} label={k} value={formatARS(v)} indent />)}
            <DataRow label="Total Gastos Op." value={formatARS(er.gastosOp)} accent />
          </Accordion>
        </div>
        <div>
          <Accordion title="Financiero y Ajustes" defaultOpen>
            <DataRow label="Ingreso Financiero"  value={formatARS(er.ingresoFinanciero)} />
            <DataRow label="Gasto Financiero"    value={formatARS(er.gastoFinanciero)} />
            <DataRow label="Revalorizaciones"    value={formatARS(er.revalorizacionTotal)} />
            <DataRow label="Pérdida por Rotura"  value={formatARS(er.perdidaRotura)} />
            <DataRow label="Devoluciones"        value={formatARS(er.devolucion)} />
            <DataRow label="Impuestos"           value={formatARS(er.impuestos)} />
          </Accordion>
          <div className="card" style={{ padding: "20px 24px" }}>
            <DataRow label="Resultado Operativo"  value={formatARS(er.ingresoVentasMer - er.cmv - er.gastosOp)} accent />
            <DataRow label="Resultado Neto Final" value={formatARS(er.resultadoNeto)} accent />
            <div style={{ marginTop: 14, padding: 14, background: "var(--bg-elevated)", borderRadius: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Margen Bruto</span>
                <span className={numClass(margenBruto)} style={{ fontFamily: "DM Mono", fontSize: 13 }}>{margenBruto.toFixed(1)}%</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>Margen Neto</span>
                <span className={numClass(margenNeto)} style={{ fontFamily: "DM Mono", fontSize: 13 }}>{margenNeto.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PatrimonioTab({ result }: { result: CalculationResult }) {
  const { sp } = result;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
        <MetricCard label="Total Activos"   value={formatARS(sp.totalActivos, true)}   delay="fade-up-1" />
        <MetricCard label="Total Pasivos"   value={formatARS(sp.totalPasivos, true)}   delay="fade-up-2" />
        <MetricCard label="Patrimonio Neto" value={formatARS(sp.patrimonioNeto, true)} delay="fade-up-3" />
        <MetricCard label="Capital Social"  value={formatARS(sp.capitalSocial, true)}  delay="fade-up-4" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <Accordion title="Activos Corrientes" defaultOpen>
            <DataRow label="Efectivo Total" value={formatARS(sp.efectivoTotal)} />
            {Object.entries(sp.cajaDetalle).map(([k, v]) => <DataRow key={k} label={k} value={formatARS(v)} indent />)}
            <DataRow label="Cuentas a Cobrar"   value={formatARS(sp.ctasCobrar)} />
            <DataRow label="Intereses a Cobrar" value={formatARS(sp.interesesCobrar)} />
          </Accordion>
          <Accordion title="Activos No Corrientes">
            <DataRow label="Stock Mercadería" value={formatARS(sp.stockMer)} />
            <DataRow label="Stock Insumos"    value={formatARS(sp.stockIns)} />
            <DataRow label="Activos Fijos"    value={formatARS(sp.stockAct)} />
            <DataRow label="Materiales"       value={formatARS(sp.materiales)} />
            <DataRow label="Total Activos"    value={formatARS(sp.totalActivos)} accent />
          </Accordion>
        </div>
        <div>
          <Accordion title="Pasivos" defaultOpen>
            <DataRow label="Proveedores a Pagar" value={formatARS(sp.proveedoresPagar)} />
            <DataRow label="Intereses a Pagar"   value={formatARS(sp.interesesPagar)} />
            <DataRow label="Total Pasivos"        value={formatARS(sp.totalPasivos)} accent />
          </Accordion>
          <Accordion title="Patrimonio Neto" defaultOpen>
            <DataRow label="Capital Social"      value={formatARS(sp.capitalSocial)} />
            <DataRow label="Resultado Acumulado" value={formatARS(sp.resultadoAcumulado)} />
            <DataRow label="Patrimonio Neto"     value={formatARS(sp.patrimonioNeto)} accent />
          </Accordion>
          <Accordion title="Aportes por Socio">
            {Object.entries(sp.aportesPorSocio).map(([socio, datos]) => (
              <div key={socio} style={{ marginBottom: 12 }}>
                <div style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{socio}</div>
                <DataRow label="Aportado" value={formatARS(datos.aportado)} indent />
                <DataRow label="Retirado" value={formatARS(datos.retirado)} indent />
                <DataRow label="Neto"     value={formatARS(datos.neto)}     indent />
              </div>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
}

function FlujoTab({ result }: { result: CalculationResult }) {
  const { fc } = result;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
        <MetricCard label="Flujo Operativo"  value={formatARS(fc.flujoOp, true)}       sub="Actividad principal" delay="fade-up-1" />
        <MetricCard label="Flujo Inversión"  value={formatARS(fc.flujoInv, true)}      sub="Activos fijos"       delay="fade-up-2" />
        <MetricCard label="Flujo Financiero" value={formatARS(fc.flujoFin, true)}      sub="Aportes y retiros"   delay="fade-up-3" />
        <MetricCard label="Flujo Neto Caja"  value={formatARS(fc.flujoNetoCaja, true)} delta={fc.flujoNetoCaja >= 0 ? 1 : -1} deltaLabel={fc.flujoNetoCaja >= 0 ? "Positivo" : "Negativo"} delay="fade-up-4" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <Accordion title="Operativo" defaultOpen>
          <DataRow label="Ventas Contado"     value={formatARS(fc.ventasC)} />
          <DataRow label="Señas"              value={formatARS(fc.senasC)} />
          <DataRow label="Cobros"             value={formatARS(fc.cobrosC)} />
          <DataRow label="Pagos Proveedores"  value={`(${formatARS(fc.pagosP)})`} />
          <DataRow label="Gastos"             value={`(${formatARS(fc.gastosC)})`} />
          <DataRow label="Compras Mercadería" value={`(${formatARS(fc.comprasMerC)})`} />
          <DataRow label="Devoluciones"       value={`(${formatARS(fc.devolucC)})`} />
          <DataRow label="Impuestos"          value={`(${formatARS(fc.impuestC)})`} />
          <DataRow label="Flujo Operativo"    value={formatARS(fc.flujoOp)} accent />
        </Accordion>
        <Accordion title="Inversión" defaultOpen>
          <DataRow label="Ventas de Activos"  value={formatARS(fc.ventasActC)} />
          <DataRow label="Compras de Activos" value={`(${formatARS(fc.comprasActInvC)})`} />
          <DataRow label="Compras a Crédito"  value={`(${formatARS(fc.comprasActInvCr)})`} />
          <DataRow label="Flujo Inversión"    value={formatARS(fc.flujoInv)} accent />
        </Accordion>
        <Accordion title="Financiero" defaultOpen>
          <DataRow label="Aportes de Socios" value={formatARS(fc.aportes)} />
          <DataRow label="Retiros de Socios" value={`(${formatARS(fc.retirosC)})`} />
          <DataRow label="Flujo Financiero"  value={formatARS(fc.flujoFin)} accent />
        </Accordion>
      </div>
    </div>
  );
}

type DebtFilter = "todas" | "pendientes" | "vencidas" | "alertas";

function DeudasTab({ result }: { result: CalculationResult }) {
  const { deudas } = result;
  const [tab, setTab]       = useState<"cobrar" | "pagar">("cobrar");
  const [filter, setFilter] = useState<DebtFilter>("todas");

  const applyFilter = (cuotas: DebtInstallment[]) => {
    if (filter === "pendientes") return cuotas.filter(c => !c.fechaPago);
    if (filter === "vencidas")   return cuotas.filter(c => c.alertaTipo === "vencida");
    if (filter === "alertas")    return cuotas.filter(c => c.alertaTipo !== null);
    return cuotas;
  };
  const cuotas = applyFilter(tab === "cobrar" ? deudas.cuotasCobrar : deudas.cuotasPagar);

  const btn = (active: boolean) => ({
    padding: "5px 14px", borderRadius: 7, border: "1px solid",
    borderColor: active ? "var(--brand)" : "var(--border-subtle)",
    background:  active ? "var(--brand-dim)" : "transparent",
    color:       active ? "var(--brand)" : "var(--text-secondary)",
    cursor: "pointer", fontSize: 12, fontWeight: active ? 600 : 400, fontFamily: "inherit",
  } as const);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
        <MetricCard label="Me Deben"   value={formatARS(deudas.totalCobrar, true)} sub={`${Object.keys(deudas.meDeben).length} deudores`}   delay="fade-up-1" />
        <MetricCard label="Les Debo"   value={formatARS(deudas.totalDeuda, true)}  sub={`${Object.keys(deudas.lesDebo).length} proveedores`} delay="fade-up-2" />
        <MetricCard label="Saldo Neto" value={formatARS(deudas.totalCobrar - deudas.totalDeuda, true)} delta={deudas.totalCobrar >= deudas.totalDeuda ? 1 : -1} deltaLabel={deudas.totalCobrar >= deudas.totalDeuda ? "Favorable" : "Desfavorable"} delay="fade-up-3" />
        <MetricCard label="Alertas"    value={String(deudas.alertasCuotas.length)} sub="Requieren atención" delay="fade-up-4" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
        <div className="card" style={{ padding: "20px 24px" }}>
          <SubTitle>Me Deben</SubTitle>
          {Object.keys(deudas.meDeben).length === 0
            ? <div style={{ color: "var(--text-tertiary)", fontSize: 12 }}>Sin deudores activos</div>
            : Object.entries(deudas.meDeben).map(([nombre, d]) => (
              <div key={nombre} style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-primary)", fontSize: 13 }}>{nombre}</span>
                  <span className="num-positive" style={{ fontFamily: "DM Mono", fontSize: 13 }}>{formatARS(d.saldo, true)}</span>
                </div>
                <div style={{ color: "var(--text-tertiary)", fontSize: 11, marginTop: 2 }}>
                  Original: {formatARS(d.original, true)} · Cobrado: {formatARS(d.cobrado ?? 0, true)}
                </div>
              </div>
            ))
          }
        </div>
        <div className="card" style={{ padding: "20px 24px" }}>
          <SubTitle>Les Debo</SubTitle>
          {Object.keys(deudas.lesDebo).length === 0
            ? <div style={{ color: "var(--text-tertiary)", fontSize: 12 }}>Sin deudas con proveedores</div>
            : Object.entries(deudas.lesDebo).map(([nombre, d]) => (
              <div key={nombre} style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-primary)", fontSize: 13 }}>{nombre}</span>
                  <span className="num-negative" style={{ fontFamily: "DM Mono", fontSize: 13 }}>{formatARS(d.saldo, true)}</span>
                </div>
                <div style={{ color: "var(--text-tertiary)", fontSize: 11, marginTop: 2 }}>
                  Original: {formatARS(d.original, true)} · Pagado: {formatARS(d.pagado ?? 0, true)}
                </div>
              </div>
            ))
          }
        </div>
      </div>
      <div className="card" style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 4 }}>
            <button style={btn(tab === "cobrar")} onClick={() => setTab("cobrar")}>A Cobrar</button>
            <button style={btn(tab === "pagar")}  onClick={() => setTab("pagar")}>A Pagar</button>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            {(["todas", "pendientes", "vencidas", "alertas"] as DebtFilter[]).map(f => (
              <button key={f} style={btn(filter === f)} onClick={() => setFilter(f)}>
                {f === "todas" ? "Todas" : f === "pendientes" ? "Pendientes" : f === "vencidas" ? "Vencidas" : "Con Alerta"}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr>
                {["Deudor", "Tipo", "Cuota", "Monto", "Vencimiento", "Estado", "Alerta"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "7px 10px", color: "var(--text-tertiary)", fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--border-subtle)" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cuotas.map(c => (
                <tr key={c.idReg} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "9px 10px", color: "var(--text-primary)", fontWeight: 500 }}>{c.deudor}</td>
                  <td style={{ padding: "9px 10px", color: "var(--text-secondary)" }}>{c.tipoDeuda}</td>
                  <td style={{ padding: "9px 10px", color: "var(--text-secondary)", fontFamily: "DM Mono" }}>{c.nCuota}</td>
                  <td style={{ padding: "9px 10px", color: "var(--text-primary)", fontFamily: "DM Mono" }}>{formatARS(c.montoTotal, true)}</td>
                  <td style={{ padding: "9px 10px", color: "var(--text-secondary)" }}>{formatDate(c.vencimiento)}</td>
                  <td style={{ padding: "9px 10px" }}><Badge type={c.fechaPago ? "badge-green" : "badge-yellow"} label={c.fechaPago ? "Pagada" : "Pendiente"} /></td>
                  <td style={{ padding: "9px 10px" }}>
                    {c.alertaTipo && <Badge type={alertBadgeClass(c.alertaTipo)} label={alertBadgeLabel(c.alertaTipo, c.alertaMsg)} />}
                  </td>
                </tr>
              ))}
              {cuotas.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 24, textAlign: "center", color: "var(--text-tertiary)" }}>No hay cuotas con este filtro</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StockTab({ result }: { result: CalculationResult }) {
  const { stockActual } = result;
  const [filter, setFilter] = useState<"todos" | "MER" | "INS" | "ACT">("todos");
  const filtered   = filter === "todos" ? stockActual : stockActual.filter(s => s.tipoItem === filter);
  const totalValor = filtered.reduce((s, i) => s + i.valor, 0);
  const btn = (active: boolean) => ({ padding: "4px 12px", borderRadius: 6, border: "1px solid", borderColor: active ? "var(--brand)" : "var(--border-subtle)", background: active ? "var(--brand-dim)" : "transparent", color: active ? "var(--brand)" : "var(--text-tertiary)", cursor: "pointer", fontSize: 11, fontFamily: "inherit" } as const);
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        {(["MER", "INS", "ACT"] as const).map((t, i) => (
          <MetricCard key={t} label={t === "MER" ? "Mercadería" : t === "INS" ? "Insumos" : "Activos"} value={formatARS(stockActual.filter(s => s.tipoItem === t).reduce((s, i) => s + i.valor, 0), true)} delay={`fade-up-${i + 1}`} />
        ))}
        <MetricCard label="Total Stock" value={formatARS(stockActual.reduce((s, i) => s + i.valor, 0), true)} delay="fade-up-4" />
      </div>
      <div className="card" style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <SubTitle>Inventario (FIFO)</SubTitle>
          <div style={{ display: "flex", gap: 5 }}>
            {(["todos", "MER", "INS", "ACT"] as const).map(t => (
              <button key={t} style={btn(filter === t)} onClick={() => setFilter(t)}>{t}</button>
            ))}
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {["Producto", "ID", "Tipo", "Unidades", "Costo Unit.", "Valor Total"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "7px 10px", color: "var(--text-tertiary)", fontSize: 10, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--border-subtle)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.idProd} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td style={{ padding: "9px 10px", color: "var(--text-primary)" }}>{item.nombreProd}</td>
                <td style={{ padding: "9px 10px", color: "var(--text-tertiary)", fontFamily: "DM Mono", fontSize: 10 }}>{item.idProd}</td>
                <td style={{ padding: "9px 10px" }}><Badge type={item.tipoItem === "MER" ? "badge-blue" : item.tipoItem === "INS" ? "badge-yellow" : "badge-green"} label={item.tipoItem} /></td>
                <td style={{ padding: "9px 10px", color: "var(--text-secondary)", fontFamily: "DM Mono" }}>{item.unidades}</td>
                <td style={{ padding: "9px 10px", color: "var(--text-secondary)", fontFamily: "DM Mono" }}>{formatARS(item.costoUnit, true)}</td>
                <td style={{ padding: "9px 10px", color: "var(--text-primary)", fontFamily: "DM Mono", fontWeight: 600 }}>{formatARS(item.valor, true)}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: "center", color: "var(--text-tertiary)" }}>Sin productos</td></tr>}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: "2px solid var(--border-default)" }}>
              <td colSpan={5} style={{ padding: "10px 10px", color: "var(--text-primary)", fontWeight: 600, fontSize: 13 }}>Total</td>
              <td style={{ padding: "10px 10px", color: "var(--brand)", fontFamily: "DM Mono", fontWeight: 700 }}>{formatARS(totalValor, true)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function ComparadorTab({ result, periodos }: { result: CalculationResult; periodos: Period[] }) {
  const [labelA, setLabelA] = useState(periodos[0]?.label ?? "");
  const [labelB, setLabelB] = useState(periodos[1]?.label ?? "");
  const dataA = useCompanyData(labelA || undefined);
  const dataB = useCompanyData(labelB || undefined);
  const rA = dataA.result ?? result;
  const rB = dataB.result ?? result;

  const metrics = [
    { label: "Ingresos Ventas",   a: rA.er.ingresoVentas,  b: rB.er.ingresoVentas },
    { label: "CMV",               a: rA.er.cmv,             b: rB.er.cmv },
    { label: "Gastos Operativos", a: rA.er.gastosOp,        b: rB.er.gastosOp },
    { label: "Resultado Neto",    a: rA.er.resultadoNeto,   b: rB.er.resultadoNeto },
    { label: "Total Activos",     a: rA.sp.totalActivos,    b: rB.sp.totalActivos },
    { label: "Patrimonio Neto",   a: rA.sp.patrimonioNeto,  b: rB.sp.patrimonioNeto },
    { label: "Efectivo",          a: rA.sp.efectivoTotal,   b: rB.sp.efectivoTotal },
    { label: "Deuda Total",       a: rA.sp.totalPasivos,    b: rB.sp.totalPasivos },
    { label: "ROE",               a: rA.sp.roeNominal,      b: rB.sp.roeNominal,    isPct: true },
    { label: "ROIC",              a: rA.sp.roicNominal,     b: rB.sp.roicNominal,   isPct: true },
  ];

  const sel = { width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid var(--border-default)", background: "var(--bg-elevated)", color: "var(--text-primary)", fontFamily: "DM Sans, sans-serif", fontSize: 13, cursor: "pointer" } as const;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
        {([{ lbl: "Período A", val: labelA, set: setLabelA, loading: dataA.loading }, { lbl: "Período B", val: labelB, set: setLabelB, loading: dataB.loading }] as const).map(({ lbl, val, set, loading }) => (
          <div key={lbl} className="card" style={{ padding: "20px 24px" }}>
            <SubTitle>{lbl}</SubTitle>
            <div style={{ position: "relative" }}>
              <select value={val} onChange={e => set(e.target.value)} style={sel}>
                {periodos.map(p => <option key={p.label} value={p.label} style={{ background: "var(--bg-elevated)" }}>{formatPeriodLabel(p.label)} ({p.tipo})</option>)}
              </select>
              {loading && <Loader2 size={13} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--brand)", animation: "spin 1s linear infinite" }} />}
            </div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: "20px 24px", marginBottom: 14 }}>
        <SubTitle>Comparación — {formatPeriodLabel(labelA)} vs {formatPeriodLabel(labelB)}</SubTitle>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "7px 10px", color: "var(--text-tertiary)", fontSize: 10, fontWeight: 500, textTransform: "uppercase", borderBottom: "1px solid var(--border-subtle)" }}>Métrica</th>
              <th style={{ textAlign: "right", padding: "7px 10px", color: "var(--brand)", fontSize: 10, fontWeight: 600, textTransform: "uppercase", borderBottom: "1px solid var(--border-subtle)" }}>{formatPeriodLabel(labelA)}</th>
              <th style={{ textAlign: "right", padding: "7px 10px", color: "var(--text-secondary)", fontSize: 10, fontWeight: 500, textTransform: "uppercase", borderBottom: "1px solid var(--border-subtle)" }}>{formatPeriodLabel(labelB)}</th>
              <th style={{ textAlign: "right", padding: "7px 10px", color: "var(--text-tertiary)", fontSize: 10, fontWeight: 500, textTransform: "uppercase", borderBottom: "1px solid var(--border-subtle)" }}>Variación</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(m => {
              const delta = pctChange(m.a, m.b);
              return (
                <tr key={m.label} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "10px 10px", color: "var(--text-secondary)" }}>{m.label}</td>
                  <td style={{ padding: "10px 10px", textAlign: "right", color: "var(--text-primary)", fontFamily: "DM Mono", fontWeight: 600 }}>{m.isPct ? formatPctPlain(m.a) : formatARS(m.a, true)}</td>
                  <td style={{ padding: "10px 10px", textAlign: "right", color: "var(--text-secondary)", fontFamily: "DM Mono" }}>{m.isPct ? formatPctPlain(m.b) : formatARS(m.b, true)}</td>
                  <td style={{ padding: "10px 10px", textAlign: "right" }}><Badge type={deltaClass(delta)} label={formatPct(delta)} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {([{ label: formatPeriodLabel(labelA), r: rA }, { label: formatPeriodLabel(labelB), r: rB }] as const).map(({ label, r }) => (
          <div key={label} className="card" style={{ padding: "20px 24px" }}>
            <SubTitle>{label} — Estructura</SubTitle>
            {[
              { name: "Ingresos", val: r.er.ingresoVentas,               color: "var(--green)" },
              { name: "Costos",   val: r.er.cmv + r.er.gastosOp,         color: "var(--red)" },
              { name: "Resultado",val: r.er.resultadoNeto,                color: "var(--brand)" },
            ].map(({ name, val, color }) => (
              <div key={name} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{name}</span>
                  <span style={{ color: "var(--text-primary)", fontFamily: "DM Mono", fontSize: 12 }}>{formatARS(val, true)}</span>
                </div>
                <div style={{ background: "var(--bg-elevated)", borderRadius: 4, height: 6 }}>
                  <div style={{ width: `${r.er.ingresoVentas > 0 ? Math.min(100, Math.abs(val) / r.er.ingresoVentas * 100) : 0}%`, height: "100%", background: color, borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <style>{`@keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [activeTab,    setActiveTab]    = useState<TabId>("dashboard");
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [periodoLabel, setPeriodoLabel] = useState<string | undefined>(undefined);

  const { result, periodos, empresa, nombre, loading, error, refetch } =
    useCompanyData(periodoLabel);

  const alertCount = result?.deudas.alertasCuotas.length ?? 0;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  function renderTab() {
    if (loading && !result) return <LoadingGrid />;
    if (error && !result)   return <ErrorState message={error} onRetry={refetch} />;
    if (!result)            return <LoadingGrid />;

    switch (activeTab) {
      case "dashboard":  return <DashboardTab  result={result} />;
      case "resultados": return <ResultadosTab result={result} />;
      case "patrimonio": return <PatrimonioTab result={result} />;
      case "flujo":      return <FlujoTab      result={result} />;
      case "deudas":     return <DeudasTab     result={result} />;
      case "stock":      return <StockTab      result={result} />;
      case "comparador": return <ComparadorTab result={result} periodos={periodos} />;
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)" }}>

      {/* Sidebar */}
      <aside className="sidebar-desktop" style={{
        width: "var(--sidebar-w)", flexShrink: 0,
        background: "var(--bg-surface)", borderRight: "1px solid var(--border-subtle)",
        display: "flex", flexDirection: "column",
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 40,
      }}>
        {/* Brand */}
        <div style={{ padding: "22px 18px 18px", borderBottom: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, var(--brand), #7cb3ff)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <BarChart3 size={15} style={{ color: "#fff" }} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>DataLogic</div>
            <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{empresa || "Panel Financiero"}</div>
          </div>
        </div>

        {/* Period selector */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 7 }}>Período</div>
          <select value={periodoLabel ?? ""} onChange={e => setPeriodoLabel(e.target.value || undefined)} style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: "1px solid var(--border-default)", background: "var(--bg-elevated)", color: "var(--text-primary)", fontFamily: "DM Sans, sans-serif", fontSize: 12, cursor: "pointer" }}>
            <option value="">Acumulado completo</option>
            {periodos.map(p => <option key={p.label} value={p.label} style={{ background: "var(--bg-elevated)" }}>{formatPeriodLabel(p.label)}</option>)}
          </select>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "10px 8px", overflowY: "auto" }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon; const active = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", borderRadius: 9, marginBottom: 1, background: active ? "var(--brand-dim)" : "transparent", border: `1px solid ${active ? "var(--brand-glow)" : "transparent"}`, color: active ? "var(--brand)" : "var(--text-secondary)", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: active ? 600 : 400, transition: "all .15s ease", textAlign: "left" }}>
                <Icon size={15} />
                <span>{item.label}</span>
                {item.id === "deudas" && alertCount > 0 && (
                  <span style={{ marginLeft: "auto", background: "var(--red)", color: "#fff", borderRadius: "99px", fontSize: 9, fontWeight: 700, padding: "1px 6px" }}>{alertCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div style={{ padding: "14px 16px", borderTop: "1px solid var(--border-subtle)", display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--brand-dim)", border: "1px solid var(--brand-glow)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand)", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
            {(nombre || "U").charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nombre}</div>
            <div style={{ fontSize: 10, color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{empresa}</div>
          </div>
          <button onClick={handleLogout} title="Cerrar sesión" style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--text-tertiary)" }}>
            <LogOut size={13} />
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 39, backdropFilter: "blur(4px)" }} />
      )}

      {/* Main */}
      <main style={{ flex: 1, marginLeft: "var(--sidebar-w)", display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <header style={{ position: "sticky", top: 0, zIndex: 30, background: "rgba(10,11,13,0.88)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--border-subtle)", padding: "0 26px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mobile-menu-btn" style={{ display: "none", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}>
              <Menu size={19} />
            </button>
            <div>
              <h1 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                {NAV_ITEMS.find(n => n.id === activeTab)?.label}
              </h1>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                {empresa} · {periodoLabel ? formatPeriodLabel(periodoLabel) : "Acumulado"}
                {loading && " · actualizando…"}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={refetch} title="Actualizar datos" style={{ background: "none", border: "1px solid var(--border-subtle)", borderRadius: 7, padding: "5px 8px", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
              {loading
                ? <Loader2 size={12} style={{ animation: "spin 1s linear infinite" }} />
                : <RefreshCw size={12} />
              }
            </button>
            <div style={{ position: "relative" }}>
              <button style={{ background: "none", border: "1px solid var(--border-subtle)", borderRadius: 7, padding: "5px 8px", cursor: "pointer", color: "var(--text-secondary)", display: "flex", alignItems: "center" }}>
                <Bell size={13} />
              </button>
              {alertCount > 0 && (
                <span style={{ position: "absolute", top: -4, right: -4, background: "var(--red)", color: "#fff", width: 15, height: 15, borderRadius: "50%", fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid var(--bg-base)" }}>{alertCount}</span>
              )}
            </div>
          </div>
        </header>

        <div style={{ padding: "26px", flex: 1 }}>{renderTab()}</div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="mobile-bottom-nav" style={{ display: "none", position: "fixed", bottom: 0, left: 0, right: 0, background: "var(--bg-surface)", borderTop: "1px solid var(--border-subtle)", zIndex: 50, padding: "8px 0 max(8px, env(safe-area-inset-bottom))" }}>
        {NAV_ITEMS.slice(0, 5).map(item => {
          const Icon = item.icon; const active = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => setActiveTab(item.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "6px 0", color: active ? "var(--brand)" : "var(--text-tertiary)", fontFamily: "inherit", fontSize: 9, fontWeight: active ? 600 : 400 }}>
              <div style={{ position: "relative" }}>
                <Icon size={19} />
                {item.id === "deudas" && alertCount > 0 && (
                  <span style={{ position: "absolute", top: -3, right: -6, background: "var(--red)", color: "#fff", width: 13, height: 13, borderRadius: "50%", fontSize: 7, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{alertCount}</span>
                )}
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .sidebar-desktop { transform: translateX(-100%) !important; transition: transform .25s ease; }
          ${sidebarOpen ? ".sidebar-desktop { transform: translateX(0) !important; }" : ""}
          main { margin-left: 0 !important; padding-bottom: 70px; }
          .mobile-menu-btn { display: flex !important; }
          .mobile-bottom-nav { display: flex !important; }
        }
      `}</style>
    </div>
  );
}
