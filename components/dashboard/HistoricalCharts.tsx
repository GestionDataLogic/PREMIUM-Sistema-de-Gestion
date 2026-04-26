"use client";

import type { CalculationResult } from "@/lib/types";
import { formatARS } from "@/lib/format";

// ─── SVG Area Chart ───────────────────────────────────────────────────────────

interface SeriesPoint { periodo: string; monto: number }

function AreaChart({
  data,
  color = "#4f8ef7",
  height = 130,
  label,
}: {
  data: SeriesPoint[];
  color?: string;
  height?: number;
  label?: string;
}) {
  if (!data.length) return null;
  const w = 600; const h = height;
  const max = Math.max(...data.map((d) => d.monto), 1);
  const min = Math.min(...data.map((d) => d.monto), 0);
  const range = max - min || 1;
  const pad = { t: 8, b: 22, l: 0, r: 0 };
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
  const gradId = `grad-${color.replace(/[^a-z0-9]/gi, "")}`;

  const tickStep = Math.ceil(pts.length / 6);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height, display: "block" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <path
        d={linePath} fill="none" stroke={color}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
      {pts
        .filter((_, i) => i % tickStep === 0 || i === pts.length - 1)
        .map((p) => {
          const parts = p.label.split("-");
          const tick = parts.length === 1 ? parts[0] : parts.slice(1).join("-");
          return (
            <text
              key={p.label}
              x={p.x} y={h - 2}
              textAnchor="middle"
              fontSize="9"
              fill="var(--text-tertiary)"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              {tick}
            </text>
          );
        })}
      {pts.map((p) => (
        <circle key={p.label} cx={p.x} cy={p.y} r="2.5" fill={color} opacity="0.9">
          <title>{`${p.label}: ${formatARS(p.value, true)}`}</title>
        </circle>
      ))}
    </svg>
  );
}

// ─── Dual Area Chart (Activos vs Pasivos) ─────────────────────────────────────

function DualAreaChart({
  dataA, dataB, colorA = "#22c55e", colorB = "#ef4444", height = 130,
}: {
  dataA: SeriesPoint[];
  dataB: SeriesPoint[];
  colorA?: string;
  colorB?: string;
  height?: number;
}) {
  const combined = [...dataA.map((d) => d.monto), ...dataB.map((d) => d.monto)];
  if (!combined.length) return null;

  const w = 600; const h = height;
  const max = Math.max(...combined, 1);
  const min = 0;
  const range = max - min || 1;
  const pad = { t: 8, b: 22, l: 0, r: 0 };
  const cw = w; const ch = h - pad.t - pad.b;

  const toPath = (data: SeriesPoint[], area: boolean) => {
    const pts = data.map((d, i) => ({
      x: (i / Math.max(data.length - 1, 1)) * cw,
      y: pad.t + (1 - (d.monto - min) / range) * ch,
    }));
    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    if (!area) return { line, pts };
    const a = `${line} L${pts[pts.length - 1].x},${h - pad.b} L${pts[0].x},${h - pad.b} Z`;
    return { line, area: a, pts };
  };

  const A = toPath(dataA, true);
  const B = toPath(dataB, true);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height, display: "block" }}
    >
      <defs>
        <linearGradient id="gradActivos" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={colorA} stopOpacity="0.2" />
          <stop offset="100%" stopColor={colorA} stopOpacity="0.01" />
        </linearGradient>
        <linearGradient id="gradPasivos" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={colorB} stopOpacity="0.2" />
          <stop offset="100%" stopColor={colorB} stopOpacity="0.01" />
        </linearGradient>
      </defs>
      {A.area && <path d={A.area} fill="url(#gradActivos)" />}
      {B.area && <path d={B.area} fill="url(#gradPasivos)" />}
      <path d={A.line} fill="none" stroke={colorA} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d={B.line} fill="none" stroke={colorB} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {A.pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2" fill={colorA} opacity="0.9" />
      ))}
      {B.pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2" fill={colorB} opacity="0.9" />
      ))}
      {/* x-axis labels from dataA */}
      {dataA
        .filter((_, i) => i % Math.ceil(dataA.length / 6) === 0 || i === dataA.length - 1)
        .map((d, idx) => {
          const i = dataA.findIndex((x) => x.periodo === d.periodo);
          const x = (i / Math.max(dataA.length - 1, 1)) * cw;
          const parts = d.periodo.split("-");
          const tick = parts.length === 1 ? parts[0] : parts.slice(1).join("-");
          return (
            <text
              key={d.periodo}
              x={x} y={h - 2}
              textAnchor="middle"
              fontSize="9"
              fill="var(--text-tertiary)"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              {tick}
            </text>
          );
        })}
    </svg>
  );
}

// ─── Mini KPI strip ───────────────────────────────────────────────────────────

function MiniKpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ color: "var(--text-tertiary)", fontSize: 11 }}>{label}</span>
      <span style={{ color: "var(--text-primary)", fontFamily: "DM Mono", fontSize: 12, marginLeft: "auto" }}>{value}</span>
    </div>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
      {children}
    </p>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function HistoricalCharts({ result }: { result: CalculationResult }) {
  const { ventasMerMensuales, ventasExtraMensuales, sp } = result;

  // Build simplified activos/pasivos from monthly ventas as proxy if no dedicated series
  // (replace with real time-series once your API exposes them)
  const ventasSeries = ventasMerMensuales.slice(-12);
  const extraSeries  = ventasExtraMensuales.slice(-12);

  const lastVenta = ventasSeries[ventasSeries.length - 1]?.monto ?? 0;
  const prevVenta = ventasSeries[ventasSeries.length - 2]?.monto ?? 0;
  const ventasDelta = prevVenta > 0 ? ((lastVenta - prevVenta) / prevVenta * 100).toFixed(1) : "0.0";

  return (
    <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 14 }}>
      {/* Ventas Mercadería */}
      <div className="card fade-up fade-up-1" style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <SubTitle>Evolución de Ventas — Últimos 12 meses</SubTitle>
          <span className={`badge ${parseFloat(ventasDelta) >= 0 ? "badge-green" : "badge-red"}`}>
            {parseFloat(ventasDelta) >= 0 ? "+" : ""}{ventasDelta}% vs mes ant.
          </span>
        </div>
        <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
          <MiniKpi label="Mercadería" value={formatARS(lastVenta, true)} color="#4f8ef7" />
          <MiniKpi label="Extras" value={formatARS(extraSeries[extraSeries.length - 1]?.monto ?? 0, true)} color="#a78bfa" />
        </div>
        <AreaChart data={ventasSeries} color="#4f8ef7" height={130} />
      </div>

      {/* Activos vs Pasivos */}
      <div className="card fade-up fade-up-2" style={{ padding: "20px 24px" }}>
        <SubTitle>Estructura Patrimonial</SubTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          <MiniKpi label="Total Activos"     value={formatARS(sp.totalActivos, true)}    color="#22c55e" />
          <MiniKpi label="Total Pasivos"     value={formatARS(sp.totalPasivos, true)}    color="#ef4444" />
          <MiniKpi label="Patrimonio Neto"   value={formatARS(sp.patrimonioNeto, true)}  color="#4f8ef7" />
        </div>

        {/* Stacked bars */}
        {[
          { label: "Activos",   val: sp.totalActivos,   color: "#22c55e" },
          { label: "Pasivos",   val: sp.totalPasivos,   color: "#ef4444" },
          { label: "Pat. Neto", val: sp.patrimonioNeto, color: "#4f8ef7" },
        ].map(({ label, val, color }) => (
          <div key={label} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ color: "var(--text-secondary)", fontSize: 11 }}>{label}</span>
              <span style={{ color: "var(--text-primary)", fontFamily: "DM Mono", fontSize: 11 }}>{formatARS(val, true)}</span>
            </div>
            <div style={{ background: "var(--bg-elevated)", borderRadius: 4, height: 5 }}>
              <div style={{
                width: `${Math.min(100, Math.abs(val) / (sp.totalActivos || 1) * 100)}%`,
                height: "100%", background: color, borderRadius: 4,
                transition: "width 0.6s ease",
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}