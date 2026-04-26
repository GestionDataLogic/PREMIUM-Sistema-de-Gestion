"use client";

import { useState } from "react";
import type { CalculationResult } from "@/lib/types";
import { formatARS, formatPctPlain, numClass } from "@/lib/format";

function Badge({ type, label }: { type: string; label: string }) {
  return <span className={`badge ${type}`}>{label}</span>;
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
      {children}
    </p>
  );
}

function DataRow({ label, value, accent = false, indent = false }: {
  label: string; value: string; accent?: boolean; indent?: boolean;
}) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "7px 0", borderBottom: "1px solid var(--border-subtle)",
    }}>
      <span style={{ color: accent ? "var(--text-primary)" : "var(--text-secondary)", fontSize: indent ? 12 : 13, fontWeight: accent ? 600 : 400, paddingLeft: indent ? 12 : 0 }}>
        {label}
      </span>
      <span style={{ color: accent ? "var(--text-primary)" : "var(--text-secondary)", fontSize: 13, fontWeight: accent ? 700 : 500, fontFamily: "DM Mono, monospace" }}>
        {value}
      </span>
    </div>
  );
}

function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card" style={{ marginBottom: 10, overflow: "hidden" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 18px", background: "none", border: "none", cursor: "pointer",
          color: "var(--text-primary)", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
        }}
      >
        {title}
        <span style={{ color: "var(--text-tertiary)", fontSize: 16, transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "none", display: "block" }}>
          ›
        </span>
      </button>
      {open && <div style={{ padding: "0 18px 16px" }}>{children}</div>}
    </div>
  );
}

function MetricCard({ label, value, sub, delay }: { label: string; value: string; sub?: string; delay?: string }) {
  return (
    <div className={`card fade-up ${delay ?? ""}`} style={{ padding: "18px 22px" }}>
      <div style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", fontFamily: "DM Mono, monospace", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ color: "var(--text-tertiary)", fontSize: 11, marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

// ─── Resultados Tab ───────────────────────────────────────────────────────────

export function ResultadosTab({ result }: { result: CalculationResult }) {
  const { er } = result;
  const margenBruto = er.ingresoVentasMer > 0 ? ((er.ingresoVentasMer - er.cmv) / er.ingresoVentasMer * 100) : 0;
  const margenNeto  = er.ingresoVentas > 0 ? (er.resultadoNeto / er.ingresoVentas * 100) : 0;

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        <MetricCard label="Ingresos Mer."  value={formatARS(er.ingresoVentasMer, true)}  delay="fade-up-1" />
        <MetricCard label="Ingresos Extra" value={formatARS(er.ingresoVentasExtra, true)} delay="fade-up-2" />
        <MetricCard label="CMV"            value={formatARS(er.cmv, true)} sub={`Margen bruto: ${margenBruto.toFixed(1)}%`} delay="fade-up-3" />
        <MetricCard label="Resultado Neto" value={formatARS(er.resultadoNeto, true)} sub={`Margen neto: ${margenNeto.toFixed(1)}%`} delay="fade-up-4" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="grid-2col">
        <div>
          <Accordion title="Ingresos" defaultOpen>
            <DataRow label="Ventas de Mercadería"   value={formatARS(er.ingresoVentasMer)} />
            <DataRow label="Ventas Extra / Servicios" value={formatARS(er.ingresoVentasExtra)} />
            <DataRow label="Total Ingresos"          value={formatARS(er.ingresoVentas)} accent />
          </Accordion>
          <Accordion title="Costos y Gastos" defaultOpen>
            <DataRow label="Costo de Mercad. Vendida" value={formatARS(er.cmv)} />
            <DataRow label="Costo Activos Vendidos"   value={formatARS(er.costoActivosVendidos)} />
            {Object.entries(er.gastosDetalle).map(([k, v]) => (
              <DataRow key={k} label={k} value={formatARS(v)} indent />
            ))}
            <DataRow label="Total Gastos Operativos" value={formatARS(er.gastosOp)} accent />
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
          <div className="card" style={{ padding: "18px 20px" }}>
            <DataRow label="Resultado Operativo" value={formatARS(er.ingresoVentasMer - er.cmv - er.gastosOp)} accent />
            <DataRow label="Resultado Neto Final" value={formatARS(er.resultadoNeto)} accent />
            <div style={{ marginTop: 14, padding: "12px", background: "var(--bg-elevated)", borderRadius: 10 }}>
              {[
                { label: "Margen Bruto", val: margenBruto },
                { label: "Margen Neto",  val: margenNeto },
              ].map(({ label, val }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ color: "var(--text-secondary)", fontSize: 13 }}>{label}</span>
                  <span className={numClass(val)} style={{ fontFamily: "DM Mono", fontSize: 13 }}>{val.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Patrimonio Tab ───────────────────────────────────────────────────────────

export function PatrimonioTab({ result }: { result: CalculationResult }) {
  const { sp } = result;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        <MetricCard label="Total Activos"   value={formatARS(sp.totalActivos, true)}   delay="fade-up-1" />
        <MetricCard label="Total Pasivos"   value={formatARS(sp.totalPasivos, true)}   delay="fade-up-2" />
        <MetricCard label="Patrimonio Neto" value={formatARS(sp.patrimonioNeto, true)} delay="fade-up-3" />
        <MetricCard label="Capital Social"  value={formatARS(sp.capitalSocial, true)}  delay="fade-up-4" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="grid-2col">
        <div>
          <Accordion title="Activos Corrientes" defaultOpen>
            <DataRow label="Efectivo Total"       value={formatARS(sp.efectivoTotal)} />
            {Object.entries(sp.cajaDetalle).map(([k, v]) => (
              <DataRow key={k} label={k} value={formatARS(v)} indent />
            ))}
            <DataRow label="Cuentas a Cobrar"     value={formatARS(sp.ctasCobrar)} />
            <DataRow label="Intereses a Cobrar"   value={formatARS(sp.interesesCobrar)} />
          </Accordion>
          <Accordion title="Activos No Corrientes">
            <DataRow label="Stock Mercadería"     value={formatARS(sp.stockMer)} />
            <DataRow label="Stock Insumos"        value={formatARS(sp.stockIns)} />
            <DataRow label="Activos Fijos"        value={formatARS(sp.stockAct)} />
            <DataRow label="Materiales"           value={formatARS(sp.materiales)} />
            <DataRow label="Total Activos"        value={formatARS(sp.totalActivos)} accent />
          </Accordion>
        </div>
        <div>
          <Accordion title="Pasivos" defaultOpen>
            <DataRow label="Proveedores a Pagar"  value={formatARS(sp.proveedoresPagar)} />
            <DataRow label="Intereses a Pagar"    value={formatARS(sp.interesesPagar)} />
            <DataRow label="Total Pasivos"        value={formatARS(sp.totalPasivos)} accent />
          </Accordion>
          <Accordion title="Patrimonio Neto" defaultOpen>
            <DataRow label="Capital Social"       value={formatARS(sp.capitalSocial)} />
            <DataRow label="Resultado Acumulado"  value={formatARS(sp.resultadoAcumulado)} />
            <DataRow label="Patrimonio Neto"      value={formatARS(sp.patrimonioNeto)} accent />
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

// ─── Flujo Tab ────────────────────────────────────────────────────────────────

export function FlujoTab({ result }: { result: CalculationResult }) {
  const { fc } = result;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 22 }}>
        <MetricCard label="Flujo Operativo"  value={formatARS(fc.flujoOp, true)}      sub="Actividad principal"  delay="fade-up-1" />
        <MetricCard label="Flujo Inversión"  value={formatARS(fc.flujoInv, true)}     sub="Activos fijos"        delay="fade-up-2" />
        <MetricCard label="Flujo Financiero" value={formatARS(fc.flujoFin, true)}     sub="Aportes y retiros"    delay="fade-up-3" />
        <MetricCard label="Flujo Neto Caja"  value={formatARS(fc.flujoNetoCaja, true)} sub={fc.flujoNetoCaja > 0 ? "Positivo ✓" : "Negativo ✗"} delay="fade-up-4" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
        <Accordion title="Operativo" defaultOpen>
          <DataRow label="Ventas Contado"    value={formatARS(fc.ventasC)} />
          <DataRow label="Señas"             value={formatARS(fc.senasC)} />
          <DataRow label="Cobros"            value={formatARS(fc.cobrosC)} />
          <DataRow label="Pagos Proveedores" value={`(${formatARS(fc.pagosP)})`} />
          <DataRow label="Gastos"            value={`(${formatARS(fc.gastosC)})`} />
          <DataRow label="Compras Mer."      value={`(${formatARS(fc.comprasMerC)})`} />
          <DataRow label="Devoluciones"      value={`(${formatARS(fc.devolucC)})`} />
          <DataRow label="Impuestos"         value={`(${formatARS(fc.impuestC)})`} />
          <DataRow label="Flujo Operativo"   value={formatARS(fc.flujoOp)} accent />
        </Accordion>
        <Accordion title="Inversión" defaultOpen>
          <DataRow label="Ventas de Activos"  value={formatARS(fc.ventasActC)} />
          <DataRow label="Compras de Activos" value={`(${formatARS(fc.comprasActInvC)})`} />
          <DataRow label="Compras Crédito"    value={`(${formatARS(fc.comprasActInvCr)})`} />
          <DataRow label="Flujo Inversión"    value={formatARS(fc.flujoInv)} accent />
        </Accordion>
        <Accordion title="Financiero" defaultOpen>
          <DataRow label="Aportes de Socios"  value={formatARS(fc.aportes)} />
          <DataRow label="Retiros de Socios"  value={`(${formatARS(fc.retirosC)})`} />
          <DataRow label="Flujo Financiero"   value={formatARS(fc.flujoFin)} accent />
        </Accordion>
      </div>
    </div>
  );
}

// ─── Stock Tab ────────────────────────────────────────────────────────────────

type StockFilter = "todos" | "MER" | "INS" | "ACT";

export function StockTab({ result }: { result: CalculationResult }) {
  const { stockActual } = result;
  const [filter, setFilter] = useState<StockFilter>("todos");

  const filtered = filter === "todos" ? stockActual : stockActual.filter((s) => s.tipoItem === filter);
  const totalValor = filtered.reduce((s, i) => s + i.valor, 0);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 14, marginBottom: 22 }}>
        {(["MER", "INS", "ACT"] as const).map((tipo, idx) => {
          const val = stockActual.filter((s) => s.tipoItem === tipo).reduce((s, i) => s + i.valor, 0);
          const labels: Record<string, string> = { MER: "Mercadería", INS: "Insumos", ACT: "Activos" };
          return (
            <MetricCard key={tipo} label={labels[tipo]} value={formatARS(val, true)} delay={`fade-up-${idx + 1}`} />
          );
        })}
        <MetricCard label="Total Stock" value={formatARS(stockActual.reduce((s, i) => s + i.valor, 0), true)} delay="fade-up-4" />
      </div>

      <div className="card" style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <SubTitle>Inventario Actual</SubTitle>
          <div style={{ display: "flex", gap: 5 }}>
            {(["todos", "MER", "INS", "ACT"] as StockFilter[]).map((t) => (
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

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 560 }}>
            <thead>
              <tr>
                {["Producto", "ID", "Tipo", "Unidades", "Costo Unit.", "Valor Total"].map((h) => (
                  <th key={h} style={{
                    textAlign: "left", padding: "8px 10px",
                    color: "var(--text-tertiary)", fontSize: 10, fontWeight: 500,
                    textTransform: "uppercase", letterSpacing: "0.06em",
                    borderBottom: "1px solid var(--border-subtle)",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.idProd} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "10px", color: "var(--text-primary)" }}>{item.nombreProd}</td>
                  <td style={{ padding: "10px", color: "var(--text-tertiary)", fontFamily: "DM Mono", fontSize: 11 }}>{item.idProd}</td>
                  <td style={{ padding: "10px" }}>
                    <Badge
                      type={item.tipoItem === "MER" ? "badge-blue" : item.tipoItem === "INS" ? "badge-yellow" : "badge-green"}
                      label={item.tipoItem}
                    />
                  </td>
                  <td style={{ padding: "10px", color: "var(--text-secondary)", fontFamily: "DM Mono" }}>{item.unidades}</td>
                  <td style={{ padding: "10px", color: "var(--text-secondary)", fontFamily: "DM Mono" }}>{formatARS(item.costoUnit, true)}</td>
                  <td style={{ padding: "10px", color: "var(--text-primary)", fontFamily: "DM Mono", fontWeight: 600 }}>{formatARS(item.valor, true)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "2px solid var(--border-default)" }}>
                <td colSpan={5} style={{ padding: "10px", color: "var(--text-primary)", fontWeight: 600 }}>Total</td>
                <td style={{ padding: "10px", color: "var(--brand)", fontFamily: "DM Mono", fontWeight: 700 }}>{formatARS(totalValor, true)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}