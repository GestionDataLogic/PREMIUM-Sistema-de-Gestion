"use client";

import { RefreshCw, Unplug } from "lucide-react";
import type { FetchState } from "@/hooks/useDashboard";

function Skeleton({ h = 120, delay = 0 }: { h?: number; delay?: number }) {
  return (
    <div
      className="skeleton"
      style={{ height: h, borderRadius: 14, animationDelay: `${delay}ms` }}
    />
  );
}

export function DashboardLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14 }}>
        {[0, 80, 160, 240, 320].map((d) => <Skeleton key={d} h={108} delay={d} />)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 14 }}>
        <Skeleton h={200} delay={0} />
        <Skeleton h={200} delay={80} />
      </div>
      <Skeleton h={280} delay={0} />
    </div>
  );
}

export function DashboardError({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: 400, padding: 40,
    }}>
      <div className="card" style={{ padding: "36px 40px", textAlign: "center", maxWidth: 420 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: "var(--red-dim)", border: "1px solid rgba(239,68,68,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
        }}>
          <RefreshCw size={20} style={{ color: "var(--red)" }} />
        </div>
        <h3 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
          Error al cargar datos
        </h3>
        <p style={{ color: "var(--text-tertiary)", fontSize: 13, marginBottom: 24 }}>
          {error ?? "Ocurrió un problema al obtener la información. Verificá tu conexión y volvé a intentar."}
        </p>
        <button
          onClick={onRetry}
          style={{
            padding: "10px 24px", background: "var(--brand)", border: "none",
            borderRadius: 10, color: "#fff", fontFamily: "inherit",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            display: "inline-flex", alignItems: "center", gap: 8,
          }}
        >
          <RefreshCw size={14} /> Reintentar
        </button>
      </div>
    </div>
  );
}

export function DashboardDisconnected() {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "center",
      minHeight: 400, padding: 40,
    }}>
      <div className="card" style={{ padding: "40px 44px", textAlign: "center", maxWidth: 480 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: "var(--brand-dim)", border: "1px solid var(--brand-glow)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 22px",
          boxShadow: "0 0 24px var(--brand-glow)",
        }}>
          <Unplug size={22} style={{ color: "var(--brand)" }} />
        </div>
        <h3 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 17, marginBottom: 10 }}>
          Datos no conectados
        </h3>
        <p style={{ color: "var(--text-tertiary)", fontSize: 13, lineHeight: 1.7, marginBottom: 28 }}>
          Tu hoja de cálculo aún no está conectada. Configurá las variables de entorno{" "}
          <code style={{ background: "var(--bg-elevated)", padding: "1px 6px", borderRadius: 4, fontSize: 12, color: "var(--brand)" }}>
            MASTER_SHEET_ID
          </code>{" "}y{" "}
          <code style={{ background: "var(--bg-elevated)", padding: "1px 6px", borderRadius: 4, fontSize: 12, color: "var(--brand)" }}>
            MASTER_GID
          </code>
          {" "}en Vercel, y completá la implementación en{" "}
          <code style={{ background: "var(--bg-elevated)", padding: "1px 6px", borderRadius: 4, fontSize: 12, color: "var(--brand)" }}>
            src/app/api/dashboard/route.ts
          </code>.
        </p>
        <div style={{
          background: "var(--bg-elevated)", borderRadius: 10, padding: "14px 16px",
          textAlign: "left", border: "1px solid var(--border-subtle)",
        }}>
          <div style={{ color: "var(--text-tertiary)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Pasos para conectar
          </div>
          {[
            "Implementá getSheetData() en lib/sheets.ts",
            "Implementá calculatePeriod() en lib/calculations.ts",
            "Conectá la ruta /api/dashboard con tus funciones",
            "Configurá MASTER_SHEET_ID y MASTER_GID en .env.local",
          ].map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < 3 ? 8 : 0, alignItems: "flex-start" }}>
              <span style={{
                width: 18, height: 18, borderRadius: "50%",
                background: "var(--brand-dim)", color: "var(--brand)",
                fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0, marginTop: 1,
              }}>{i + 1}</span>
              <span style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.5 }}>{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
