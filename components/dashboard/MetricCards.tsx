"use client";

import { Info } from "lucide-react";
import type { CalculationResult } from "@/lib/types";
import { formatARS, formatPct, formatPctPlain, deltaClass, numClass, pctChange } from "@/lib/format";

interface MetricCardsProps {
  result: CalculationResult;
  prev: CalculationResult | null;
}

function Badge({ type, label }: { type: string; label: string }) {
  return <span className={`badge ${type}`}>{label}</span>;
}

function Card({
  label, value, delta, deltaLabel, sub, delay,
}: {
  label: string; value: string; delta?: number;
  deltaLabel?: string; sub?: string; delay?: string;
}) {
  return (
    <div className={`card fade-up ${delay ?? ""}`} style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <span style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          {label}
        </span>
        {delta !== undefined && (
          <Badge type={deltaClass(delta)} label={deltaLabel ?? formatPct(delta)} />
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.1, fontFamily: "DM Mono, monospace" }}>
        {value}
      </div>
      {sub && <div style={{ color: "var(--text-tertiary)", fontSize: 11, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function RoeCard({ result }: { result: CalculationResult }) {
  const { sp } = result;
  return (
    <div className="card fade-up fade-up-5" style={{ padding: "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <span style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          Rentabilidad
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          <Badge
            type={sp.roeNominal >= 20 ? "badge-green" : sp.roeNominal >= 12 ? "badge-yellow" : "badge-red"}
            label={`ROE ${formatPctPlain(sp.roeNominal)}`}
          />
          <Badge
            type={sp.roicNominal >= 15 ? "badge-green" : sp.roicNominal >= 8 ? "badge-yellow" : "badge-red"}
            label={`ROIC ${formatPctPlain(sp.roicNominal)}`}
          />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {[
          { label: "ROE Nominal", val: sp.roeNominal },
          { label: "ROIC Nominal", val: sp.roicNominal },
          { label: "ROE Real", val: sp.roeReal },
          { label: "ROIC Real", val: sp.roicReal },
        ].map(({ label, val }) => (
          <div key={label} style={{
            background: "var(--bg-elevated)", borderRadius: 10, padding: "10px 12px",
            border: "1px solid var(--border-subtle)",
          }}>
            <div style={{ color: "var(--text-tertiary)", fontSize: 10, marginBottom: 4 }}>{label}</div>
            <div className={numClass(val ?? 0)} style={{ fontSize: 18, fontWeight: 700, fontFamily: "DM Mono, monospace" }}>
              {val !== null && val !== undefined ? formatPctPlain(val) : "—"}
            </div>
          </div>
        ))}
      </div>
      {sp.inflacionAcum !== null && (
        <div style={{ marginTop: 10, padding: "7px 10px", background: "var(--bg-elevated)", borderRadius: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <Info size={11} style={{ color: "var(--text-tertiary)", flexShrink: 0 }} />
          <span style={{ color: "var(--text-tertiary)", fontSize: 10 }}>
            Inflación acumulada: {formatPctPlain((sp.inflacionAcum ?? 0) * 100)}
          </span>
        </div>
      )}
    </div>
  );
}

export function MetricCards({ result, prev }: MetricCardsProps) {
  const { er, sp, fc } = result;

  const ventasDelta = prev ? pctChange(er.ingresoVentas, prev.er.ingresoVentas) : undefined;
  const netoDelta   = prev ? pctChange(er.resultadoNeto, prev.er.resultadoNeto) : undefined;
  const activosDelta= prev ? pctChange(sp.totalActivos, prev.sp.totalActivos) : undefined;
  const cajaDelta   = prev ? pctChange(sp.efectivoTotal, prev.sp.efectivoTotal) : undefined;

  const margenNeto = er.ingresoVentas > 0 ? (er.resultadoNeto / er.ingresoVentas * 100) : 0;
  const endeudamiento = sp.totalActivos > 0 ? (sp.totalPasivos / sp.totalActivos * 100) : 0;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
      <Card
        label="Ingresos Totales"
        value={formatARS(er.ingresoVentas, true)}
        delta={ventasDelta}
        sub={`CMV: ${formatARS(er.cmv, true)}`}
        delay="fade-up-1"
      />
      <Card
        label="Resultado Neto"
        value={formatARS(er.resultadoNeto, true)}
        delta={netoDelta}
        sub={`Margen: ${formatPctPlain(margenNeto)}`}
        delay="fade-up-2"
      />
      <Card
        label="Total Activos"
        value={formatARS(sp.totalActivos, true)}
        delta={activosDelta}
        sub={`Endeud.: ${formatPctPlain(endeudamiento)}`}
        delay="fade-up-3"
      />
      <Card
        label="Efectivo"
        value={formatARS(sp.efectivoTotal, true)}
        delta={cajaDelta}
        sub={`PN: ${formatARS(sp.patrimonioNeto, true)}`}
        delay="fade-up-4"
      />
      <RoeCard result={result} />
    </div>
  );
}