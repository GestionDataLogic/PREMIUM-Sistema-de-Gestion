"use client";

import { useState, useMemo } from "react";
import {
  LayoutDashboard, TrendingUp, TrendingDown, Package,
  CreditCard, BarChart3, ArrowLeftRight, Bell, Menu,
  X, ChevronDown, ChevronRight, CircleDollarSign,
  Wallet, AlertTriangle, CheckCircle2, Clock,
  Building2, LogOut, RefreshCw, Info
} from "lucide-react";
import {
  MOCK_RESULT, MOCK_RESULT_PREV, MOCK_PERIODS, MOCK_USER, MOCK_STOCK,
  VENTAS_MER_MENSUALES, VENTAS_EXTRA_MENSUALES
} from "@/lib/mock-data";
import {
  formatARS, formatPct, formatPctPlain, deltaClass, numClass,
  formatDate, formatPeriodLabel, pctChange, alertBadgeClass, alertBadgeLabel
} from "@/lib/format";
import type { CalculationResult, Period, DebtInstallment } from "@/lib/types";

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "dashboard",   label: "Dashboard",    icon: LayoutDashboard },
  { id: "resultados",  label: "Resultados",   icon: BarChart3 },
  { id: "patrimonio",  label: "Patrimonio",   icon: Wallet },
  { id: "flujo",       label: "Flujo de Caja",icon: CircleDollarSign },
  { id: "deudas",      label: "Deudas",       icon: CreditCard },
  { id: "stock",       label: "Stock",        icon: Package },
  { id: "comparador",  label: "Comparador",   icon: ArrowLeftRight },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId = typeof NAV_ITEMS[number]["id"];

// ─── Shared sub-components ────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 16, marginBottom: 16 }}>
      {children}
    </h2>
  );
}

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

function MetricCard({
  label, value, delta, deltaLabel, sub, delay = ""
}: {
  label: string; value: string; delta?: number;
  deltaLabel?: string; sub?: string; delay?: string;
}) {
  return (
    <div className={`card fade-up ${delay}`} style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <span style={{ color: "var(--text-secondary)", fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
        {delta !== undefined && (
          <Badge type={deltaClass(delta)} label={deltaLabel ?? formatPct(delta)} />
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && (
        <div style={{ color: "var(--text-tertiary)", fontSize: 12, marginTop: 6 }}>{sub}</div>
      )}
    </div>
  );
}

// ─── Mini bar chart (pure CSS) ────────────────────────────────────────────────

function MiniBarChart({ data, color = "var(--brand)" }: {
  data: { label: string; value: number }[];
  color?: string;
}) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 48 }}>
      {data.map((d) => (
        <div key={d.label} title={`${d.label}: ${formatARS(d.value, true)}`}
          style={{
            flex: 1, height: `${Math.max(4, (d.value / max) * 100)}%`,
            background: color, borderRadius: "3px 3px 0 0", opacity: 0.85,
            transition: "height 0.4s ease",
          }}
        />
      ))}
    </div>
  );
}

// ─── Area chart (SVG) ─────────────────────────────────────────────────────────

function AreaChart({ data, color = "#4f8ef7", height = 120 }: {
  data: { periodo: string; monto: number }[];
  color?: string;
  height?: number;
}) {
  const w = 600; const h = height;
  const max = Math.max(...data.map(d => d.monto), 1);
  const min = Math.min(...data.map(d => d.monto), 0);
  const range = max - min || 1;
  const pad = { t: 8, b: 20, l: 0, r: 0 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;

  const pts = data.map((d, i) => ({
    x: pad.l + (i / Math.max(data.length - 1, 1)) * cw,
    y: pad.t + (1 - (d.monto - min) / range) * ch,
    label: d.periodo,
    value: d.monto,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaPath = `${linePath} L${pts[pts.length - 1].x},${h - pad.b} L${pts[0].x},${h - pad.b} Z`;
  const gradId = `ag-${color.replace("#", "")}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {pts.filter((_, i) => i % Math.ceil(pts.length / 6) === 0).map((p) => (
        <g key={p.label}>
          <text x={p.x} y={h} textAnchor="middle" fontSize="9" fill="var(--text-tertiary)"
            style={{ fontFamily: "DM Sans, sans-serif" }}>
            {p.label.split("-").slice(1).join("-") || p.label}
          </text>
        </g>
      ))}
      {pts.map((p) => (
        <circle key={p.label} cx={p.x} cy={p.y} r="2.5" fill={color} opacity="0.9" />
      ))}
    </svg>
  );
}

// ─── Accordion ────────────────────────────────────────────────────────────────

function Accordion({ title, children, defaultOpen = false, badge }: {
  title: string; children: React.ReactNode;
  defaultOpen?: boolean; badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card" style={{ marginBottom: 10, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", background: "none", border: "none", cursor: "pointer",
          color: "var(--text-primary)", fontFamily: "inherit", fontSize: 14, fontWeight: 600,
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {title}
          {badge}
        </span>
        <ChevronDown size={16} style={{
          color: "var(--text-tertiary)",
          transform: open ? "rotate(180deg)" : "none",
          transition: "transform 0.2s ease",
        }} />
      </button>
      {open && (
        <div style={{ padding: "0 20px 20px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ─── DataRow ──────────────────────────────────────────────────────────────────

function DataRow({ label, value, accent = false, indent = false, mono = true }: {
  label: string; value: string; accent?: boolean; indent?: boolean; mono?: boolean;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "7px 0",
      borderBottom: "1px solid var(--border-subtle)",
    }}>
      <span style={{
        color: accent ? "var(--text-primary)" : "var(--text-secondary)",
        fontSize: indent ? 12 : 13,
        fontWeight: accent ? 600 : 400,
        paddingLeft: indent ? 12 : 0,
      }}>{label}</span>
      <span style={{
        color: accent ? "var(--text-primary)" : "var(--text-secondary)",
        fontSize: 13, fontWeight: accent ? 700 : 500,
        fontFamily: mono ? "DM Mono, monospace" : "inherit",
      }}>{value}</span>
    </div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab({ result, prev }: { result: CalculationResult; prev: CalculationResult }) {
  const { er, sp, fc, deudas } = result;

  const ventasDelta = pctChange(er.ingresoVentas, prev.er.ingresoVentas);
  const netoDelta   = pctChange(er.resultadoNeto, prev.er.resultadoNeto);
  const activosDelta= pctChange(sp.totalActivos,  prev.sp.totalActivos);
  const cajaDelta   = pctChange(sp.efectivoTotal, prev.sp.efectivoTotal);

  const chartData = VENTAS_MER_MENSUALES.slice(-12).map(v => ({
    ...v, extra: VENTAS_EXTRA_MENSUALES.find(e => e.periodo === v.periodo)?.monto ?? 0
  }));

  return (
    <div>
      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, marginBottom: 24 }}>
        <MetricCard label="Ingresos Totales"  value={formatARS(er.ingresoVentas, true)}  delta={ventasDelta}  sub={`CMV: ${formatARS(er.cmv, true)}`}              delay="fade-up-1" />
        <MetricCard label="Resultado Neto"    value={formatARS(er.resultadoNeto, true)}  delta={netoDelta}    sub={`Margen: ${formatPctPlain(er.resultadoNeto / er.ingresoVentas * 100)}`} delay="fade-up-2" />
        <MetricCard label="Total Activos"     value={formatARS(sp.totalActivos, true)}   delta={activosDelta} sub={`Pasivos: ${formatARS(sp.totalPasivos, true)}`}  delay="fade-up-3" />
        <MetricCard label="Efectivo"          value={formatARS(sp.efectivoTotal, true)}  delta={cajaDelta}    sub={`PN: ${formatARS(sp.patrimonioNeto, true)}`}      delay="fade-up-4" />
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
        <div className="card fade-up fade-up-5" style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <SubTitle>Evolución de Ventas</SubTitle>
            <Badge type="badge-blue" label="Últimos 12 meses" />
          </div>
          <AreaChart data={VENTAS_MER_MENSUALES.slice(-12)} color="#4f8ef7" height={120} />
        </div>

        <div className="card fade-up fade-up-6" style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <SubTitle>ROE / ROIC</SubTitle>
            <div style={{ display: "flex", gap: 8 }}>
              <Badge type={sp.roeNominal >= 20 ? "badge-green" : sp.roeNominal >= 12 ? "badge-yellow" : "badge-red"} label={`ROE ${formatPctPlain(sp.roeNominal)}`} />
              <Badge type={sp.roicNominal >= 15 ? "badge-green" : sp.roicNominal >= 8 ? "badge-yellow" : "badge-red"} label={`ROIC ${formatPctPlain(sp.roicNominal)}`} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
            {[
              { label: "ROE Nominal", val: sp.roeNominal },
              { label: "ROIC Nominal", val: sp.roicNominal },
              { label: "ROE Real", val: sp.roeReal },
              { label: "ROIC Real", val: sp.roicReal },
            ].map(({ label, val }) => (
              <div key={label} style={{
                background: "var(--bg-elevated)", borderRadius: 10, padding: "12px 14px",
                border: "1px solid var(--border-subtle)"
              }}>
                <div style={{ color: "var(--text-secondary)", fontSize: 11, marginBottom: 6 }}>{label}</div>
                <div className={numClass(val ?? 0)} style={{ fontSize: 20, fontWeight: 700, fontFamily: "DM Mono, monospace" }}>
                  {val !== null && val !== undefined ? formatPctPlain(val) : "—"}
                </div>
              </div>
            ))}
          </div>
          {sp.inflacionAcum !== null && (
            <div style={{ marginTop: 12, padding: "8px 12px", background: "var(--bg-elevated)", borderRadius: 8, display: "flex", alignItems: "center", gap: 8 }}>
              <Info size={12} style={{ color: "var(--text-tertiary)" }} />
              <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>
                Inflación acumulada: {formatPctPlain(sp.inflacionAcum * 100)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Alerts */}
      {deudas.alertasCuotas.length > 0 && (
        <div className="card fade-up" style={{ padding: "20px 24px", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <AlertTriangle size={16} style={{ color: "var(--red)" }} />
            <SectionTitle>Alertas de Cuotas</SectionTitle>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {deudas.alertasCuotas.map(a => (
              <div key={a.idReg} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", background: "var(--bg-elevated)",
                borderRadius: 10, border: "1px solid var(--border-subtle)"
              }}>
                <div>
                  <span style={{ color: "var(--text-primary)", fontWeight: 500, fontSize: 13 }}>{a.deudor}</span>
                  <span style={{ color: "var(--text-tertiary)", fontSize: 12, marginLeft: 10 }}>Cuota {a.cuota} · {a.tipo}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ color: "var(--text-secondary)", fontFamily: "DM Mono", fontSize: 13 }}>
                    {formatARS(a.montoTotal, true)}
                  </span>
                  <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>
                    {a.vencimiento ? formatDate(a.vencimiento) : "—"}
                  </span>
                  <Badge type={alertBadgeClass(
                    a.alerta.includes("vencida") ? "vencida" :
                    a.alerta.includes("3") ? "3dias" :
                    a.alerta.includes("1 sem") ? "7dias" : null
                  )} label={a.alerta} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ventas por categoría */}
      <div className="card" style={{ padding: "20px 24px" }}>
        <SubTitle>Ventas por Categoría</SubTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {Object.entries(result.ventaXCapa1).map(([label, data]) => {
            const margin = data.venta > 0 ? (data.ganancia / data.venta) * 100 : 0;
            const pct = data.venta / er.ingresoVentasMer * 100;
            return (
              <div key={label} style={{ padding: "12px 0", borderBottom: "1px solid var(--border-subtle)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ color: "var(--text-primary)", fontSize: 13 }}>{label}</span>
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <span style={{ color: "var(--green)", fontFamily: "DM Mono", fontSize: 12 }}>
                      +{formatARS(data.ganancia, true)}
                    </span>
                    <span style={{ color: "var(--text-secondary)", fontFamily: "DM Mono", fontSize: 12 }}>
                      {formatARS(data.venta, true)}
                    </span>
                    <Badge type={margin >= 30 ? "badge-green" : margin >= 20 ? "badge-yellow" : "badge-red"}
                      label={`${margin.toFixed(0)}%`} />
                  </div>
                </div>
                <div style={{ background: "var(--bg-elevated)", borderRadius: 4, height: 4, overflow: "hidden" }}>
                  <div style={{
                    width: `${pct}%`, height: "100%",
                    background: "linear-gradient(90deg, var(--brand), #7cb3ff)",
                    borderRadius: 4, transition: "width 0.6s ease"
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Resultados Tab ───────────────────────────────────────────────────────────

function ResultadosTab({ result }: { result: CalculationResult }) {
  const { er } = result;
  const margenBruto = er.ingresoVentasMer > 0 ? ((er.ingresoVentasMer - er.cmv) / er.ingresoVentasMer * 100) : 0;
  const margenNeto  = er.ingresoVentas > 0 ? (er.resultadoNeto / er.ingresoVentas * 100) : 0;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
        <MetricCard label="Ingresos Mer." value={formatARS(er.ingresoVentasMer, true)} delay="fade-up-1" />
        <MetricCard label="Ingresos Extra" value={formatARS(er.ingresoVentasExtra, true)} delay="fade-up-2" />
        <MetricCard label="CMV" value={formatARS(er.cmv, true)} sub={`Margen bruto: ${margenBruto.toFixed(1)}%`} delay="fade-up-3" />
        <MetricCard label="Resultado Neto" value={formatARS(er.resultadoNeto, true)} sub={`Margen neto: ${margenNeto.toFixed(1)}%`} delay="fade-up-4" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <Accordion title="Ingresos" defaultOpen>
            <DataRow label="Ventas de Mercadería" value={formatARS(er.ingresoVentasMer)} />
            <DataRow label="Ventas Extra / Servicios" value={formatARS(er.ingresoVentasExtra)} />
            <DataRow label="Total Ingresos" value={formatARS(er.ingresoVentas)} accent />
          </Accordion>
          <Accordion title="Costos y Gastos" defaultOpen>
            <DataRow label="Costo de Mercad. Vendida" value={formatARS(er.cmv)} />
            <DataRow label="Costo Activos Vendidos" value={formatARS(er.costoActivosVendidos)} />
            {Object.entries(er.gastosDetalle).map(([k, v]) => (
              <DataRow key={k} label={k} value={formatARS(v)} indent />
            ))}
            <DataRow label="Total Gastos Operativos" value={formatARS(er.gastosOp)} accent />
          </Accordion>
        </div>
        <div>
          <Accordion title="Financiero y Ajustes" defaultOpen>
            <DataRow label="Ingreso Financiero" value={formatARS(er.ingresoFinanciero)} />
            <DataRow label="Gasto Financiero" value={formatARS(er.gastoFinanciero)} />
            <DataRow label="Revalorizaciones" value={formatARS(er.revalorizacionTotal)} />
            <DataRow label="Pérdida por Rotura" value={formatARS(er.perdidaRotura)} />
            <DataRow label="Devoluciones" value={formatARS(er.devolucion)} />
            <DataRow label="Impuestos" value={formatARS(er.impuestos)} />
          </Accordion>
          <div className="card" style={{ padding: "20px 24px" }}>
            <DataRow label="Resultado Operativo" value={formatARS(er.ingresoVentasMer - er.cmv - er.gastosOp)} accent />
            <DataRow label="Resultado Neto Final" value={formatARS(er.resultadoNeto)} accent />
            <div style={{ marginTop: 16, padding: "14px", background: "var(--bg-elevated)", borderRadius: 10 }}>
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

// ─── Patrimonio Tab ───────────────────────────────────────────────────────────

function PatrimonioTab({ result }: { result: CalculationResult }) {
  const { sp } = result;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
        <MetricCard label="Total Activos"  value={formatARS(sp.totalActivos, true)}  delay="fade-up-1" />
        <MetricCard label="Total Pasivos"  value={formatARS(sp.totalPasivos, true)}  delay="fade-up-2" />
        <MetricCard label="Patrimonio Neto" value={formatARS(sp.patrimonioNeto, true)} delay="fade-up-3" />
        <MetricCard label="Capital Social" value={formatARS(sp.capitalSocial, true)}  delay="fade-up-4" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div>
          <Accordion title="Activos Corrientes" defaultOpen>
            <DataRow label="Efectivo Total" value={formatARS(sp.efectivoTotal)} />
            {Object.entries(sp.cajaDetalle).map(([k, v]) => (
              <DataRow key={k} label={k} value={formatARS(v)} indent />
            ))}
            <DataRow label="Cuentas a Cobrar" value={formatARS(sp.ctasCobrar)} />
            <DataRow label="Intereses a Cobrar" value={formatARS(sp.interesesCobrar)} />
          </Accordion>
          <Accordion title="Activos No Corrientes">
            <DataRow label="Stock Mercadería" value={formatARS(sp.stockMer)} />
            <DataRow label="Stock Insumos" value={formatARS(sp.stockIns)} />
            <DataRow label="Activos Fijos (Stock)" value={formatARS(sp.stockAct)} />
            <DataRow label="Materiales" value={formatARS(sp.materiales)} />
            <DataRow label="Total Activos" value={formatARS(sp.totalActivos)} accent />
          </Accordion>
        </div>
        <div>
          <Accordion title="Pasivos" defaultOpen>
            <DataRow label="Proveedores a Pagar" value={formatARS(sp.proveedoresPagar)} />
            <DataRow label="Intereses a Pagar" value={formatARS(sp.interesesPagar)} />
            <DataRow label="Total Pasivos" value={formatARS(sp.totalPasivos)} accent />
          </Accordion>
          <Accordion title="Patrimonio Neto" defaultOpen>
            <DataRow label="Capital Social" value={formatARS(sp.capitalSocial)} />
            <DataRow label="Resultado Acumulado" value={formatARS(sp.resultadoAcumulado)} />
            <DataRow label="Patrimonio Neto" value={formatARS(sp.patrimonioNeto)} accent />
          </Accordion>
          <Accordion title="Aportes por Socio">
            {Object.entries(sp.aportesPorSocio).map(([socio, datos]) => (
              <div key={socio} style={{ marginBottom: 12 }}>
                <div style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{socio}</div>
                <DataRow label="Aportado" value={formatARS(datos.aportado)} indent />
                <DataRow label="Retirado"  value={formatARS(datos.retirado)} indent />
                <DataRow label="Neto" value={formatARS(datos.neto)} indent />
              </div>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
}

// ─── Flujo Tab ────────────────────────────────────────────────────────────────

function FlujoTab({ result }: { result: CalculationResult }) {
  const { fc } = result;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
        <MetricCard label="Flujo Operativo" value={formatARS(fc.flujoOp, true)}    sub="Actividad principal" delay="fade-up-1" />
        <MetricCard label="Flujo Inversión"  value={formatARS(fc.flujoInv, true)}  sub="Activos fijos"       delay="fade-up-2" />
        <MetricCard label="Flujo Financiero" value={formatARS(fc.flujoFin, true)}  sub="Aportes y retiros"   delay="fade-up-3" />
        <MetricCard label="Flujo Neto Caja"  value={formatARS(fc.flujoNetoCaja, true)} delta={fc.flujoNetoCaja > 0 ? 1 : -1} deltaLabel={fc.flujoNetoCaja > 0 ? "Positivo" : "Negativo"} delay="fade-up-4" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <Accordion title="Operativo" defaultOpen>
          <DataRow label="Ventas Contado" value={formatARS(fc.ventasC)} />
          <DataRow label="Señas" value={formatARS(fc.senasC)} />
          <DataRow label="Cobros" value={formatARS(fc.cobrosC)} />
          <DataRow label="Pagos Proveedores" value={`(${formatARS(fc.pagosP)})`} />
          <DataRow label="Gastos" value={`(${formatARS(fc.gastosC)})`} />
          <DataRow label="Compras Mer." value={`(${formatARS(fc.comprasMerC)})`} />
          <DataRow label="Devoluciones" value={`(${formatARS(fc.devolucC)})`} />
          <DataRow label="Impuestos" value={`(${formatARS(fc.impuestC)})`} />
          <DataRow label="Flujo Operativo" value={formatARS(fc.flujoOp)} accent />
        </Accordion>
        <Accordion title="Inversión" defaultOpen>
          <DataRow label="Ventas de Activos" value={formatARS(fc.ventasActC)} />
          <DataRow label="Compras de Activos" value={`(${formatARS(fc.comprasActInvC)})`} />
          <DataRow label="Compras Crédito" value={`(${formatARS(fc.comprasActInvCr)})`} />
          <DataRow label="Flujo Inversión" value={formatARS(fc.flujoInv)} accent />
        </Accordion>
        <Accordion title="Financiero" defaultOpen>
          <DataRow label="Aportes de Socios" value={formatARS(fc.aportes)} />
          <DataRow label="Retiros de Socios" value={`(${formatARS(fc.retirosC)})`} />
          <DataRow label="Flujo Financiero" value={formatARS(fc.flujoFin)} accent />
        </Accordion>
      </div>
    </div>
  );
}

// ─── Deudas Tab ───────────────────────────────────────────────────────────────

type DebtFilter = "todas" | "pendientes" | "vencidas" | "alertas";

function DeudasTab({ result }: { result: CalculationResult }) {
  const { deudas } = result;
  const [tab, setTab] = useState<"cobrar" | "pagar">("cobrar");
  const [filter, setFilter] = useState<DebtFilter>("todas");

  const applyFilter = (cuotas: DebtInstallment[]) => {
    if (filter === "pendientes") return cuotas.filter(c => !c.fechaPago);
    if (filter === "vencidas")   return cuotas.filter(c => c.alertaTipo === "vencida");
    if (filter === "alertas")    return cuotas.filter(c => c.alertaTipo !== null);
    return cuotas;
  };

  const cuotas = applyFilter(tab === "cobrar" ? deudas.cuotasCobrar : deudas.cuotasPagar);

  const filterBtns: { id: DebtFilter; label: string }[] = [
    { id: "todas", label: "Todas" },
    { id: "pendientes", label: "Pendientes" },
    { id: "vencidas", label: "Vencidas" },
    { id: "alertas", label: "Con Alerta" },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 24 }}>
        <MetricCard label="Me Deben"    value={formatARS(deudas.totalCobrar, true)} sub={`${Object.keys(deudas.meDeben).length} deudores`}    delay="fade-up-1" />
        <MetricCard label="Les Debo"    value={formatARS(deudas.totalDeuda, true)}  sub={`${Object.keys(deudas.lesDebo).length} proveedores`}  delay="fade-up-2" />
        <MetricCard label="Saldo Neto"  value={formatARS(deudas.totalCobrar - deudas.totalDeuda, true)} delta={deudas.totalCobrar > deudas.totalDeuda ? 1 : -1} deltaLabel={deudas.totalCobrar > deudas.totalDeuda ? "Favorable" : "Desfavorable"} delay="fade-up-3" />
        <MetricCard label="Alertas"     value={String(deudas.alertasCuotas.length)} sub="Cuotas que requieren atención" delay="fade-up-4" />
      </div>

      {/* Resumen me deben / les debo */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
        <div className="card" style={{ padding: "20px 24px" }}>
          <SubTitle>Me Deben</SubTitle>
          {Object.entries(deudas.meDeben).map(([nombre, d]) => (
            <div key={nombre} style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-primary)", fontSize: 13 }}>{nombre}</span>
                <span className="num-positive" style={{ fontFamily: "DM Mono", fontSize: 13 }}>
                  {formatARS(d.saldo, true)}
                </span>
              </div>
              <div style={{ color: "var(--text-tertiary)", fontSize: 11, marginTop: 2 }}>
                Original: {formatARS(d.original, true)} · Cobrado: {formatARS(d.cobrado ?? 0, true)}
              </div>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: "20px 24px" }}>
          <SubTitle>Les Debo</SubTitle>
          {Object.entries(deudas.lesDebo).map(([nombre, d]) => (
            <div key={nombre} style={{ padding: "10px 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-primary)", fontSize: 13 }}>{nombre}</span>
                <span className="num-negative" style={{ fontFamily: "DM Mono", fontSize: 13 }}>
                  {formatARS(d.saldo, true)}
                </span>
              </div>
              <div style={{ color: "var(--text-tertiary)", fontSize: 11, marginTop: 2 }}>
                Original: {formatARS(d.original, true)} · Pagado: {formatARS(d.pagado ?? 0, true)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla cuotas */}
      <div className="card" style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", gap: 2 }}>
            {(["cobrar", "pagar"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "6px 16px", borderRadius: 8, border: "1px solid",
                borderColor: tab === t ? "var(--brand)" : "var(--border-subtle)",
                background: tab === t ? "var(--brand-dim)" : "transparent",
                color: tab === t ? "var(--brand)" : "var(--text-secondary)",
                cursor: "pointer", fontSize: 12, fontWeight: 500, fontFamily: "inherit",
              }}>
                {t === "cobrar" ? "A Cobrar" : "A Pagar"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {filterBtns.map(b => (
              <button key={b.id} onClick={() => setFilter(b.id)} style={{
                padding: "4px 12px", borderRadius: 6, border: "1px solid",
                borderColor: filter === b.id ? "var(--brand)" : "var(--border-subtle)",
                background: filter === b.id ? "var(--brand-dim)" : "transparent",
                color: filter === b.id ? "var(--brand)" : "var(--text-tertiary)",
                cursor: "pointer", fontSize: 11, fontFamily: "inherit",
              }}>
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                {["Deudor", "Tipo", "Cuota", "Monto", "Vencimiento", "Estado", "Alerta"].map(h => (
                  <th key={h} style={{
                    textAlign: "left", padding: "8px 10px",
                    color: "var(--text-tertiary)", fontSize: 11, fontWeight: 500,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cuotas.map((c) => (
                <tr key={c.idReg} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "10px 10px", color: "var(--text-primary)", fontWeight: 500 }}>{c.deudor}</td>
                  <td style={{ padding: "10px 10px", color: "var(--text-secondary)" }}>{c.tipoDeuda}</td>
                  <td style={{ padding: "10px 10px", color: "var(--text-secondary)", fontFamily: "DM Mono" }}>{c.nCuota}</td>
                  <td style={{ padding: "10px 10px", color: "var(--text-primary)", fontFamily: "DM Mono" }}>{formatARS(c.montoTotal, true)}</td>
                  <td style={{ padding: "10px 10px", color: "var(--text-secondary)" }}>{formatDate(c.vencimiento)}</td>
                  <td style={{ padding: "10px 10px" }}>
                    <Badge
                      type={c.fechaPago ? "badge-green" : "badge-yellow"}
                      label={c.fechaPago ? "Pagada" : "Pendiente"}
                    />
                  </td>
                  <td style={{ padding: "10px 10px" }}>
                    {c.alertaTipo && (
                      <Badge
                        type={alertBadgeClass(c.alertaTipo)}
                        label={alertBadgeLabel(c.alertaTipo, c.alertaMsg)}
                      />
                    )}
                  </td>
                </tr>
              ))}
              {cuotas.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: "24px", textAlign: "center", color: "var(--text-tertiary)" }}>
                    No hay cuotas con este filtro
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Stock Tab ────────────────────────────────────────────────────────────────

function StockTab({ result }: { result: CalculationResult }) {
  const { stockActual } = result;
  const [filter, setFilter] = useState<"todos" | "MER" | "INS" | "ACT">("todos");

  const filtered = filter === "todos" ? stockActual : stockActual.filter(s => s.tipoItem === filter);
  const totalValor = filtered.reduce((s, i) => s + i.valor, 0);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Mercadería",  val: stockActual.filter(s => s.tipoItem === "MER").reduce((s, i) => s + i.valor, 0), tipo: "MER" },
          { label: "Insumos",     val: stockActual.filter(s => s.tipoItem === "INS").reduce((s, i) => s + i.valor, 0), tipo: "INS" },
          { label: "Activos",     val: stockActual.filter(s => s.tipoItem === "ACT").reduce((s, i) => s + i.valor, 0), tipo: "ACT" },
          { label: "Total Stock", val: stockActual.reduce((s, i) => s + i.valor, 0), tipo: "todos" },
        ].map((item, idx) => (
          <MetricCard key={item.tipo} label={item.label} value={formatARS(item.val, true)} delay={`fade-up-${idx + 1}`} />
        ))}
      </div>

      <div className="card" style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <SubTitle>Inventario Actual</SubTitle>
          <div style={{ display: "flex", gap: 6 }}>
            {(["todos", "MER", "INS", "ACT"] as const).map(t => (
              <button key={t} onClick={() => setFilter(t)} style={{
                padding: "4px 12px", borderRadius: 6, border: "1px solid",
                borderColor: filter === t ? "var(--brand)" : "var(--border-subtle)",
                background: filter === t ? "var(--brand-dim)" : "transparent",
                color: filter === t ? "var(--brand)" : "var(--text-tertiary)",
                cursor: "pointer", fontSize: 11, fontFamily: "inherit",
              }}>{t}</button>
            ))}
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {["Producto", "ID", "Tipo", "Unidades", "Costo Unit.", "Valor Total"].map(h => (
                <th key={h} style={{
                  textAlign: "left", padding: "8px 10px",
                  color: "var(--text-tertiary)", fontSize: 11, fontWeight: 500,
                  textTransform: "uppercase", letterSpacing: "0.06em",
                  borderBottom: "1px solid var(--border-subtle)",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.idProd} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <td style={{ padding: "10px 10px", color: "var(--text-primary)" }}>{item.nombreProd}</td>
                <td style={{ padding: "10px 10px", color: "var(--text-tertiary)", fontFamily: "DM Mono", fontSize: 11 }}>{item.idProd}</td>
                <td style={{ padding: "10px 10px" }}>
                  <Badge
                    type={item.tipoItem === "MER" ? "badge-blue" : item.tipoItem === "INS" ? "badge-yellow" : "badge-green"}
                    label={item.tipoItem}
                  />
                </td>
                <td style={{ padding: "10px 10px", color: "var(--text-secondary)", fontFamily: "DM Mono" }}>{item.unidades}</td>
                <td style={{ padding: "10px 10px", color: "var(--text-secondary)", fontFamily: "DM Mono" }}>{formatARS(item.costoUnit, true)}</td>
                <td style={{ padding: "10px 10px", color: "var(--text-primary)", fontFamily: "DM Mono", fontWeight: 600 }}>{formatARS(item.valor, true)}</td>
              </tr>
            ))}
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

// ─── Comparador Tab ───────────────────────────────────────────────────────────

function ComparadorTab({ periods }: { periods: Period[] }) {
  const [periodA, setPeriodA] = useState(periods[0]?.label ?? "");
  const [periodB, setPeriodB] = useState(periods[1]?.label ?? "");

  // For demo, use static mock with minor variation
  const resultA = MOCK_RESULT;
  const resultB = MOCK_RESULT_PREV;

  const metrics = [
    { label: "Ingresos Ventas",  a: resultA.er.ingresoVentas,    b: resultB.er.ingresoVentas },
    { label: "CMV",              a: resultA.er.cmv,               b: resultB.er.cmv },
    { label: "Gastos Operativos",a: resultA.er.gastosOp,          b: resultB.er.gastosOp },
    { label: "Resultado Neto",   a: resultA.er.resultadoNeto,     b: resultB.er.resultadoNeto },
    { label: "Total Activos",    a: resultA.sp.totalActivos,      b: resultB.sp.totalActivos },
    { label: "Patrimonio Neto",  a: resultA.sp.patrimonioNeto,    b: resultB.sp.patrimonioNeto },
    { label: "Efectivo",         a: resultA.sp.efectivoTotal,     b: resultB.sp.efectivoTotal },
    { label: "Deuda Total",      a: resultA.sp.totalPasivos,      b: resultB.sp.totalPasivos },
    { label: "ROE",              a: resultA.sp.roeNominal,        b: resultB.sp.roeNominal, isPct: true },
    { label: "ROIC",             a: resultA.sp.roicNominal,       b: resultB.sp.roicNominal, isPct: true },
  ];

  return (
    <div>
      {/* Period selectors */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Período A", value: periodA, set: setPeriodA },
          { label: "Período B", value: periodB, set: setPeriodB },
        ].map(({ label, value, set }) => (
          <div key={label} className="card" style={{ padding: "20px 24px" }}>
            <SubTitle>{label}</SubTitle>
            <select
              value={value}
              onChange={e => set(e.target.value)}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                border: "1px solid var(--border-default)",
                background: "var(--bg-elevated)", color: "var(--text-primary)",
                fontFamily: "DM Sans, sans-serif", fontSize: 14,
                cursor: "pointer",
              }}
            >
              {periods.map(p => (
                <option key={p.label} value={p.label} style={{ background: "var(--bg-elevated)" }}>
                  {formatPeriodLabel(p.label)} ({p.tipo})
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {/* Comparison table */}
      <div className="card" style={{ padding: "20px 24px" }}>
        <SubTitle>Comparación de Métricas</SubTitle>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "8px 10px", color: "var(--text-tertiary)", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--border-subtle)" }}>Métrica</th>
              <th style={{ textAlign: "right", padding: "8px 10px", color: "var(--brand)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--border-subtle)" }}>{formatPeriodLabel(periodA)}</th>
              <th style={{ textAlign: "right", padding: "8px 10px", color: "var(--text-secondary)", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--border-subtle)" }}>{formatPeriodLabel(periodB)}</th>
              <th style={{ textAlign: "right", padding: "8px 10px", color: "var(--text-tertiary)", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid var(--border-subtle)" }}>Variación</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(m => {
              const delta = pctChange(m.a, m.b);
              return (
                <tr key={m.label} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "11px 10px", color: "var(--text-secondary)" }}>{m.label}</td>
                  <td style={{ padding: "11px 10px", textAlign: "right", color: "var(--text-primary)", fontFamily: "DM Mono", fontWeight: 600 }}>
                    {m.isPct ? formatPctPlain(m.a) : formatARS(m.a, true)}
                  </td>
                  <td style={{ padding: "11px 10px", textAlign: "right", color: "var(--text-secondary)", fontFamily: "DM Mono" }}>
                    {m.isPct ? formatPctPlain(m.b) : formatARS(m.b, true)}
                  </td>
                  <td style={{ padding: "11px 10px", textAlign: "right" }}>
                    <Badge type={deltaClass(delta)} label={formatPct(delta)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Visual bars */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
        <div className="card" style={{ padding: "20px 24px" }}>
          <SubTitle>{formatPeriodLabel(periodA)} — Estructura</SubTitle>
          {[
            { label: "Ingresos", val: resultA.er.ingresoVentas, color: "var(--green)" },
            { label: "Costos",   val: resultA.er.cmv + resultA.er.gastosOp, color: "var(--red)" },
            { label: "Resultado",val: resultA.er.resultadoNeto, color: "var(--brand)" },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{label}</span>
                <span style={{ color: "var(--text-primary)", fontFamily: "DM Mono", fontSize: 12 }}>{formatARS(val, true)}</span>
              </div>
              <div style={{ background: "var(--bg-elevated)", borderRadius: 4, height: 6 }}>
                <div style={{ width: `${Math.min(100, Math.abs(val) / resultA.er.ingresoVentas * 100)}%`, height: "100%", background: color, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: "20px 24px" }}>
          <SubTitle>{formatPeriodLabel(periodB)} — Estructura</SubTitle>
          {[
            { label: "Ingresos", val: resultB.er.ingresoVentas, color: "var(--green)" },
            { label: "Costos",   val: resultB.er.cmv + resultB.er.gastosOp, color: "var(--red)" },
            { label: "Resultado",val: resultB.er.resultadoNeto, color: "var(--brand)" },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{label}</span>
                <span style={{ color: "var(--text-primary)", fontFamily: "DM Mono", fontSize: 12 }}>{formatARS(val, true)}</span>
              </div>
              <div style={{ background: "var(--bg-elevated)", borderRadius: 4, height: 6 }}>
                <div style={{ width: `${Math.min(100, Math.abs(val) / resultB.er.ingresoVentas * 100)}%`, height: "100%", background: color, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [periodLabel, setPeriodLabel] = useState("2025");

  const result = MOCK_RESULT;
  const prev   = MOCK_RESULT_PREV;
  const periods = MOCK_PERIODS;

  const alertCount = result.deudas.alertasCuotas.length;

  function renderTab() {
    switch (activeTab) {
      case "dashboard":  return <DashboardTab result={result} prev={prev} />;
      case "resultados": return <ResultadosTab result={result} />;
      case "patrimonio": return <PatrimonioTab result={result} />;
      case "flujo":      return <FlujoTab result={result} />;
      case "deudas":     return <DeudasTab result={result} />;
      case "stock":      return <StockTab result={result} />;
      case "comparador": return <ComparadorTab periods={periods} />;
    }
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)" }}>

      {/* ── Sidebar (desktop) ── */}
      <aside style={{
        width: "var(--sidebar-w)", flexShrink: 0,
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-subtle)",
        display: "flex", flexDirection: "column",
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 40,
        transform: sidebarOpen ? "translateX(0)" : undefined,
      }} className="sidebar-desktop">

        {/* Brand */}
        <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, var(--brand), #7cb3ff)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <BarChart3 size={16} style={{ color: "#fff" }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>DataLogic</div>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>Panel Financiero</div>
            </div>
          </div>
        </div>

        {/* Period selector */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ fontSize: 10, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Período Activo
          </div>
          <select
            value={periodLabel}
            onChange={e => setPeriodLabel(e.target.value)}
            style={{
              width: "100%", padding: "8px 10px", borderRadius: 8,
              border: "1px solid var(--border-default)",
              background: "var(--bg-elevated)", color: "var(--text-primary)",
              fontFamily: "DM Sans, sans-serif", fontSize: 12, cursor: "pointer",
            }}
          >
            {periods.map(p => (
              <option key={p.label} value={p.label} style={{ background: "var(--bg-elevated)" }}>
                {formatPeriodLabel(p.label)}
              </option>
            ))}
          </select>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => { setActiveTab(item.id as TabId); setSidebarOpen(false); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 12px", borderRadius: 10, marginBottom: 2,
                  background: active ? "var(--brand-dim)" : "transparent",
                  border: `1px solid ${active ? "var(--brand-glow)" : "transparent"}`,
                  color: active ? "var(--brand)" : "var(--text-secondary)",
                  cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: active ? 600 : 400,
                  transition: "all 0.15s ease", textAlign: "left",
                }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {item.id === "deudas" && alertCount > 0 && (
                  <span style={{
                    marginLeft: "auto", background: "var(--red)", color: "#fff",
                    borderRadius: "99px", fontSize: 10, fontWeight: 700,
                    padding: "1px 7px",
                  }}>{alertCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: "var(--brand-dim)", border: "1px solid var(--brand-glow)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--brand)", fontSize: 13, fontWeight: 700,
            }}>
              {MOCK_USER.nombre.charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {MOCK_USER.nombre}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {MOCK_USER.empresa}
              </div>
            </div>
            <LogOut size={14} style={{ color: "var(--text-tertiary)", cursor: "pointer" }} />
          </div>
        </div>
      </aside>

      {/* ── Mobile overlay ── */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
            zIndex: 39, backdropFilter: "blur(4px)",
          }}
        />
      )}

      {/* ── Main content ── */}
      <main style={{
        flex: 1,
        marginLeft: "var(--sidebar-w)",
        display: "flex", flexDirection: "column",
        minHeight: "100vh",
      }}>
        {/* Top bar */}
        <header style={{
          position: "sticky", top: 0, zIndex: 30,
          background: "rgba(10,11,13,0.85)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "0 28px", height: 60,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                display: "none", background: "none", border: "none",
                cursor: "pointer", color: "var(--text-secondary)", padding: 4,
              }}
              className="mobile-menu-btn"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                {NAV_ITEMS.find(n => n.id === activeTab)?.label}
              </h1>
              <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                {MOCK_USER.empresa} · {formatPeriodLabel(periodLabel)}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button style={{
              background: "none", border: "1px solid var(--border-subtle)", borderRadius: 8,
              padding: "6px 8px", cursor: "pointer", color: "var(--text-secondary)",
              display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontFamily: "inherit",
            }}>
              <RefreshCw size={13} />
              <span style={{ display: "none" }} className="show-md">Actualizar</span>
            </button>
            <div style={{ position: "relative" }}>
              <button style={{
                background: "none", border: "1px solid var(--border-subtle)", borderRadius: 8,
                padding: "6px 8px", cursor: "pointer", color: "var(--text-secondary)",
                display: "flex", alignItems: "center",
              }}>
                <Bell size={14} />
              </button>
              {alertCount > 0 && (
                <span style={{
                  position: "absolute", top: -4, right: -4,
                  background: "var(--red)", color: "#fff",
                  width: 16, height: 16, borderRadius: "50%",
                  fontSize: 9, fontWeight: 700,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "2px solid var(--bg-base)",
                }}>{alertCount}</span>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div style={{ padding: "28px", flex: 1 }}>
          {renderTab()}
        </div>
      </main>

      {/* ── Mobile Bottom Navigation ── */}
      <nav style={{
        display: "none",
        position: "fixed", bottom: 0, left: 0, right: 0,
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border-subtle)",
        zIndex: 50, padding: "8px 0 max(8px, env(safe-area-inset-bottom))",
      }} className="mobile-bottom-nav">
        {NAV_ITEMS.slice(0, 5).map(item => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button key={item.id} onClick={() => setActiveTab(item.id as TabId)}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                background: "none", border: "none", cursor: "pointer", padding: "6px 0",
                color: active ? "var(--brand)" : "var(--text-tertiary)",
                fontFamily: "inherit", fontSize: 10, fontWeight: active ? 600 : 400,
                transition: "color 0.15s ease",
              }}
            >
              <div style={{ position: "relative" }}>
                <Icon size={20} />
                {item.id === "deudas" && alertCount > 0 && (
                  <span style={{
                    position: "absolute", top: -4, right: -6,
                    background: "var(--red)", color: "#fff",
                    width: 14, height: 14, borderRadius: "50%",
                    fontSize: 8, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>{alertCount}</span>
                )}
              </div>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .sidebar-desktop {
            transform: translateX(-100%) !important;
            transition: transform 0.25s ease;
          }
          ${sidebarOpen ? `.sidebar-desktop { transform: translateX(0) !important; }` : ""}
          main { margin-left: 0 !important; padding-bottom: 70px; }
          .mobile-menu-btn { display: flex !important; }
          .mobile-bottom-nav { display: flex !important; }
        }
        @media (max-width: 640px) {
          .grid-2col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
