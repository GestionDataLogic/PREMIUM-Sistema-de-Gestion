"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { CalculationResult, DebtInstallment } from "@/lib/types";
import { formatARS, formatDate, alertBadgeClass, alertBadgeLabel } from "@/lib/format";

type DebtFilter = "todas" | "pendientes" | "vencidas" | "alertas";
type DebtTab = "cobrar" | "pagar";

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

function SummaryCard({
  title, items, positiveValue,
}: {
  title: string;
  items: Record<string, { original: number; cobrado?: number; pagado?: number; saldo: number }>;
  positiveValue: boolean;
}) {
  return (
    <div className="card" style={{ padding: "18px 20px" }}>
      <SubTitle>{title}</SubTitle>
      {Object.entries(items).map(([nombre, d]) => (
        <div key={nombre} style={{ padding: "9px 0", borderBottom: "1px solid var(--border-subtle)" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-primary)", fontSize: 13 }}>{nombre}</span>
            <span
              className={positiveValue ? "num-positive" : "num-negative"}
              style={{ fontFamily: "DM Mono", fontSize: 13 }}
            >
              {formatARS(d.saldo, true)}
            </span>
          </div>
          <div style={{ color: "var(--text-tertiary)", fontSize: 11, marginTop: 2 }}>
            Original: {formatARS(d.original, true)}
            {" · "}
            {positiveValue
              ? `Cobrado: ${formatARS(d.cobrado ?? 0, true)}`
              : `Pagado: ${formatARS(d.pagado ?? 0, true)}`}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DebtTable({ result }: { result: CalculationResult }) {
  const { deudas } = result;
  const [tab, setTab] = useState<DebtTab>("cobrar");
  const [filter, setFilter] = useState<DebtFilter>("todas");

  const applyFilter = (cuotas: DebtInstallment[]): DebtInstallment[] => {
    switch (filter) {
      case "pendientes": return cuotas.filter((c) => !c.fechaPago);
      case "vencidas":   return cuotas.filter((c) => c.alertaTipo === "vencida");
      case "alertas":    return cuotas.filter((c) => c.alertaTipo !== null);
      default: return cuotas;
    }
  };

  const cuotas = applyFilter(tab === "cobrar" ? deudas.cuotasCobrar : deudas.cuotasPagar);

  const filterBtns: { id: DebtFilter; label: string }[] = [
    { id: "todas",      label: "Todas" },
    { id: "pendientes", label: "Pendientes" },
    { id: "vencidas",   label: "Vencidas" },
    { id: "alertas",    label: "Con Alerta" },
  ];

  const btnStyle = (active: boolean): React.CSSProperties => ({
    padding: "5px 13px", borderRadius: 7, border: "1px solid",
    borderColor: active ? "var(--brand)" : "var(--border-subtle)",
    background: active ? "var(--brand-dim)" : "transparent",
    color: active ? "var(--brand)" : "var(--text-tertiary)",
    cursor: "pointer", fontSize: 11, fontFamily: "inherit",
    fontWeight: active ? 600 : 400, transition: "all 0.15s",
  });

  return (
    <div>
      {/* Summary KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 14, marginBottom: 20 }}>
        {[
          { label: "Me Deben",   value: formatARS(deudas.totalCobrar, true), sub: `${Object.keys(deudas.meDeben).length} deudores`,    cls: "num-positive" },
          { label: "Les Debo",   value: formatARS(deudas.totalDeuda, true),  sub: `${Object.keys(deudas.lesDebo).length} proveedores`,  cls: "num-negative" },
          {
            label: "Saldo Neto",
            value: formatARS(deudas.totalCobrar - deudas.totalDeuda, true),
            sub: deudas.totalCobrar > deudas.totalDeuda ? "Favorable" : "Desfavorable",
            cls: deudas.totalCobrar > deudas.totalDeuda ? "num-positive" : "num-negative",
          },
          { label: "Alertas",    value: String(deudas.alertasCuotas.length), sub: "Cuotas urgentes",  cls: deudas.alertasCuotas.length > 0 ? "num-negative" : "num-positive" },
        ].map(({ label, value, sub, cls }) => (
          <div key={label} className="card fade-up" style={{ padding: "18px 20px" }}>
            <div style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
              {label}
            </div>
            <div className={cls} style={{ fontSize: 24, fontWeight: 700, fontFamily: "DM Mono", lineHeight: 1.1 }}>
              {value}
            </div>
            <div style={{ color: "var(--text-tertiary)", fontSize: 11, marginTop: 4 }}>{sub}</div>
          </div>
        ))}
      </div>

      {/* Urgent alerts banner */}
      {deudas.alertasCuotas.length > 0 && (
        <div className="card" style={{ padding: "16px 20px", marginBottom: 16, border: "1px solid rgba(239,68,68,0.2)", background: "rgba(239,68,68,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <AlertTriangle size={15} style={{ color: "var(--red)", flexShrink: 0 }} />
            <span style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13 }}>
              {deudas.alertasCuotas.length} cuota{deudas.alertasCuotas.length !== 1 ? "s" : ""} requieren atención
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {deudas.alertasCuotas.map((a) => (
              <div key={a.idReg} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 12px", background: "var(--bg-elevated)",
                borderRadius: 8, border: "1px solid var(--border-subtle)",
              }}>
                <div>
                  <span style={{ color: "var(--text-primary)", fontWeight: 500, fontSize: 13 }}>{a.deudor}</span>
                  <span style={{ color: "var(--text-tertiary)", fontSize: 11, marginLeft: 8 }}>
                    Cuota {a.cuota} · {a.tipo}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ color: "var(--text-secondary)", fontFamily: "DM Mono", fontSize: 12 }}>
                    {formatARS(a.montoTotal, true)}
                  </span>
                  <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>
                    {a.vencimiento ? formatDate(a.vencimiento) : "—"}
                  </span>
                  <Badge
                    type={alertBadgeClass(
                      a.alerta.toLowerCase().includes("vencida") ? "vencida" :
                      a.alerta.includes("3") ? "3dias" :
                      a.alerta.toLowerCase().includes("sem") ? "7dias" : null
                    )}
                    label={a.alerta}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
        <SummaryCard title="Me Deben" items={deudas.meDeben} positiveValue />
        <SummaryCard title="Les Debo" items={deudas.lesDebo} positiveValue={false} />
      </div>

      {/* Installment table */}
      <div className="card" style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", gap: 4 }}>
            {(["cobrar", "pagar"] as DebtTab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)} style={btnStyle(tab === t)}>
                {t === "cobrar" ? "A Cobrar" : "A Pagar"}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            {filterBtns.map((b) => (
              <button key={b.id} onClick={() => setFilter(b.id)} style={btnStyle(filter === b.id)}>
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
            <thead>
              <tr>
                {["Deudor", "Tipo", "Cuota", "Monto", "Vencimiento", "Estado", "Alerta"].map((h) => (
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
              {cuotas.map((c) => (
                <tr key={c.idReg} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <td style={{ padding: "10px", color: "var(--text-primary)", fontWeight: 500 }}>{c.deudor}</td>
                  <td style={{ padding: "10px", color: "var(--text-secondary)" }}>{c.tipoDeuda}</td>
                  <td style={{ padding: "10px", color: "var(--text-secondary)", fontFamily: "DM Mono" }}>{c.nCuota}</td>
                  <td style={{ padding: "10px", color: "var(--text-primary)", fontFamily: "DM Mono" }}>
                    {formatARS(c.montoTotal, true)}
                  </td>
                  <td style={{ padding: "10px", color: "var(--text-secondary)" }}>
                    {formatDate(c.vencimiento)}
                  </td>
                  <td style={{ padding: "10px" }}>
                    <Badge
                      type={c.fechaPago ? "badge-green" : "badge-yellow"}
                      label={c.fechaPago ? "Pagada" : "Pendiente"}
                    />
                  </td>
                  <td style={{ padding: "10px" }}>
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
                  <td colSpan={7} style={{ padding: "28px", textAlign: "center", color: "var(--text-tertiary)" }}>
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