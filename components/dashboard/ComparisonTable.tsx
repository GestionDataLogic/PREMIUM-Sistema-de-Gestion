"use client";

import { useState } from "react";
import type { CalculationResult, Period } from "@/lib/types";
import { formatARS, formatPct, formatPctPlain, deltaClass, pctChange, formatPeriodLabel } from "@/lib/format";

interface ComparisonTableProps {
  resultA: CalculationResult;
  resultB: CalculationResult;
  periods: Period[];
  periodLabelA: string;
  periodLabelB: string;
  onChangePeriodA: (label: string) => void;
  onChangePeriodB: (label: string) => void;
  loadingA?: boolean;
  loadingB?: boolean;
}

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

type MetricGroup = "financiero" | "patrimonio" | "rentabilidad";

const METRIC_GROUPS: Record<MetricGroup, { label: string; metrics: { key: string; label: string; isPct?: boolean; path: (r: CalculationResult) => number }[] }> = {
  financiero: {
    label: "Estado de Resultados",
    metrics: [
      { key: "ingresos",  label: "Ingresos Totales",   path: (r) => r.er.ingresoVentas },
      { key: "ingMer",    label: "Ingresos Mercadería", path: (r) => r.er.ingresoVentasMer },
      { key: "ingExtra",  label: "Ingresos Extra",      path: (r) => r.er.ingresoVentasExtra },
      { key: "cmv",       label: "CMV",                 path: (r) => r.er.cmv },
      { key: "gastosOp",  label: "Gastos Operativos",   path: (r) => r.er.gastosOp },
      { key: "gasFin",    label: "Gasto Financiero",    path: (r) => r.er.gastoFinanciero },
      { key: "ingFin",    label: "Ingreso Financiero",  path: (r) => r.er.ingresoFinanciero },
      { key: "impuestos", label: "Impuestos",           path: (r) => r.er.impuestos },
      { key: "neto",      label: "Resultado Neto",      path: (r) => r.er.resultadoNeto },
    ],
  },
  patrimonio: {
    label: "Balance General",
    metrics: [
      { key: "activos",   label: "Total Activos",       path: (r) => r.sp.totalActivos },
      { key: "efectivo",  label: "Efectivo",            path: (r) => r.sp.efectivoTotal },
      { key: "ctasCob",   label: "Cuentas a Cobrar",    path: (r) => r.sp.ctasCobrar },
      { key: "stockMer",  label: "Stock Mercadería",    path: (r) => r.sp.stockMer },
      { key: "pasivos",   label: "Total Pasivos",       path: (r) => r.sp.totalPasivos },
      { key: "pn",        label: "Patrimonio Neto",     path: (r) => r.sp.patrimonioNeto },
      { key: "capital",   label: "Capital Social",      path: (r) => r.sp.capitalSocial },
    ],
  },
  rentabilidad: {
    label: "Rentabilidad",
    metrics: [
      { key: "roeN",  label: "ROE Nominal",   isPct: true, path: (r) => r.sp.roeNominal },
      { key: "roicN", label: "ROIC Nominal",  isPct: true, path: (r) => r.sp.roicNominal },
      { key: "roeR",  label: "ROE Real",      isPct: true, path: (r) => r.sp.roeReal ?? 0 },
      { key: "roicR", label: "ROIC Real",     isPct: true, path: (r) => r.sp.roicReal ?? 0 },
      { key: "flujoN",label: "Flujo Neto Caja",          path: (r) => r.fc.flujoNetoCaja },
      { key: "flujoO",label: "Flujo Operativo",          path: (r) => r.fc.flujoOp },
    ],
  },
};

export function ComparisonTable({
  resultA, resultB, periods,
  periodLabelA, periodLabelB,
  onChangePeriodA, onChangePeriodB,
  loadingA, loadingB,
}: ComparisonTableProps) {
  const [activeGroup, setActiveGroup] = useState<MetricGroup>("financiero");

  const group = METRIC_GROUPS[activeGroup];

  const selectStyle: React.CSSProperties = {
    padding: "9px 12px", borderRadius: 10,
    border: "1px solid var(--border-default)",
    background: "var(--bg-elevated)", color: "var(--text-primary)",
    fontFamily: "DM Sans, sans-serif", fontSize: 13,
    cursor: "pointer", width: "100%",
    outline: "none",
  };

  return (
    <div>
      {/* Period selectors */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Período A", value: periodLabelA, onChange: onChangePeriodA, loading: loadingA },
          { label: "Período B", value: periodLabelB, onChange: onChangePeriodB, loading: loadingB },
        ].map(({ label, value, onChange, loading }) => (
          <div key={label} className="card" style={{ padding: "16px 20px" }}>
            <SubTitle>{label}</SubTitle>
            <div style={{ position: "relative" }}>
              <select value={value} onChange={(e) => onChange(e.target.value)} style={selectStyle}>
                {periods.map((p) => (
                  <option key={p.label} value={p.label} style={{ background: "var(--bg-elevated)" }}>
                    {formatPeriodLabel(p.label)} ({p.tipo})
                  </option>
                ))}
              </select>
              {loading && (
                <div style={{
                  position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                  width: 12, height: 12, borderRadius: "50%",
                  border: "2px solid var(--brand)", borderTopColor: "transparent",
                  animation: "spin 0.8s linear infinite",
                }} />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Group tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {(Object.keys(METRIC_GROUPS) as MetricGroup[]).map((g) => (
          <button
            key={g}
            onClick={() => setActiveGroup(g)}
            style={{
              padding: "7px 16px", borderRadius: 8, border: "1px solid",
              borderColor: activeGroup === g ? "var(--brand)" : "var(--border-subtle)",
              background: activeGroup === g ? "var(--brand-dim)" : "transparent",
              color: activeGroup === g ? "var(--brand)" : "var(--text-secondary)",
              cursor: "pointer", fontSize: 12, fontWeight: 500,
              fontFamily: "inherit", transition: "all 0.15s",
            }}
          >
            {METRIC_GROUPS[g].label}
          </button>
        ))}
      </div>

      {/* Comparison table */}
      <div className="card" style={{ overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
              <th style={{ textAlign: "left", padding: "12px 16px", color: "var(--text-tertiary)", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Métrica
              </th>
              <th style={{ textAlign: "right", padding: "12px 16px", color: "var(--brand)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {formatPeriodLabel(periodLabelA)}
              </th>
              <th style={{ textAlign: "right", padding: "12px 16px", color: "var(--text-secondary)", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {formatPeriodLabel(periodLabelB)}
              </th>
              <th style={{ textAlign: "right", padding: "12px 16px", color: "var(--text-tertiary)", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Δ Variación
              </th>
            </tr>
          </thead>
          <tbody>
            {group.metrics.map((m, idx) => {
              const valA = m.path(resultA);
              const valB = m.path(resultB);
              const delta = pctChange(valA, valB);
              const isLast = idx === group.metrics.length - 1;
              return (
                <tr
                  key={m.key}
                  style={{
                    borderBottom: isLast ? "none" : "1px solid var(--border-subtle)",
                    background: isLast ? "var(--bg-elevated)" : "transparent",
                  }}
                >
                  <td style={{ padding: "11px 16px", color: "var(--text-secondary)", fontWeight: isLast ? 600 : 400 }}>
                    {m.label}
                  </td>
                  <td style={{ padding: "11px 16px", textAlign: "right", color: "var(--text-primary)", fontFamily: "DM Mono", fontWeight: isLast ? 700 : 500 }}>
                    {m.isPct ? formatPctPlain(valA) : formatARS(valA, true)}
                  </td>
                  <td style={{ padding: "11px 16px", textAlign: "right", color: "var(--text-secondary)", fontFamily: "DM Mono" }}>
                    {m.isPct ? formatPctPlain(valB) : formatARS(valB, true)}
                  </td>
                  <td style={{ padding: "11px 16px", textAlign: "right" }}>
                    <Badge type={deltaClass(delta)} label={formatPct(delta)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Visual bars split view */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
        {[
          { label: periodLabelA, result: resultA },
          { label: periodLabelB, result: resultB },
        ].map(({ label, result: r }) => (
          <div key={label} className="card" style={{ padding: "18px 20px" }}>
            <SubTitle>{formatPeriodLabel(label)} — Estructura P&L</SubTitle>
            {[
              { label: "Ingresos", val: r.er.ingresoVentas, color: "var(--green)" },
              { label: "Costos + Gastos", val: r.er.cmv + r.er.gastosOp, color: "var(--red)" },
              { label: "Resultado Neto", val: r.er.resultadoNeto, color: "var(--brand)" },
            ].map(({ label: bl, val, color }) => (
              <div key={bl} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>{bl}</span>
                  <span style={{ color: "var(--text-primary)", fontFamily: "DM Mono", fontSize: 12 }}>
                    {formatARS(val, true)}
                  </span>
                </div>
                <div style={{ background: "var(--bg-elevated)", borderRadius: 4, height: 5 }}>
                  <div style={{
                    width: `${Math.min(100, Math.abs(val) / (r.er.ingresoVentas || 1) * 100)}%`,
                    height: "100%", background: color, borderRadius: 4, transition: "width 0.6s ease",
                  }} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes spin { to { transform: translateY(-50%) rotate(360deg); } }
      `}</style>
    </div>
  );
}