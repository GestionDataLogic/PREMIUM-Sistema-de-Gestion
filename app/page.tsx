"use client";

import { useState, useCallback } from "react";
import { SidebarLayout, type TabId } from "@/components/dashboard/SidebarLayout";
import { MetricCards } from "@/components/dashboard/MetricCards";
import { HistoricalCharts } from "@/components/dashboard/HistoricalCharts";
import { ComparisonTable } from "@/components/dashboard/ComparisonTable";
import { DebtTable } from "@/components/dashboard/DebtTable";
import { ResultadosTab, PatrimonioTab, FlujoTab, StockTab } from "@/components/dashboard/OtherTabs";
import {
  DashboardLoading,
  DashboardError,
  DashboardDisconnected,
} from "@/components/dashboard/DashboardStates";
import { useDashboard } from "@/hooks/useDashboard";
import { formatARS, formatPctPlain } from "@/lib/format";
import type { CalculationResult } from "@/lib/types";

// ─── Ventas por categoría inline (dashboard main view) ───────────────────────

function VentasCategoria({ result }: { result: CalculationResult }) {
  return (
    <div className="card" style={{ padding: "20px 24px" }}>
      <p style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>
        Ventas por Categoría
      </p>
      <div>
        {Object.entries(result.ventaXCapa1).map(([label, data]) => {
          const margin = data.venta > 0 ? (data.ganancia / data.venta) * 100 : 0;
          const pct = result.er.ingresoVentasMer > 0 ? (data.venta / result.er.ingresoVentasMer) * 100 : 0;
          return (
            <div key={label} style={{ padding: "11px 0", borderBottom: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <span style={{ color: "var(--text-primary)", fontSize: 13 }}>{label}</span>
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <span style={{ color: "var(--green)", fontFamily: "DM Mono", fontSize: 12 }}>
                    +{formatARS(data.ganancia, true)}
                  </span>
                  <span style={{ color: "var(--text-secondary)", fontFamily: "DM Mono", fontSize: 12 }}>
                    {formatARS(data.venta, true)}
                  </span>
                  <span className={`badge ${margin >= 30 ? "badge-green" : margin >= 20 ? "badge-yellow" : "badge-red"}`}>
                    {margin.toFixed(0)}%
                  </span>
                </div>
              </div>
              <div style={{ background: "var(--bg-elevated)", borderRadius: 4, height: 4, overflow: "hidden" }}>
                <div style={{
                  width: `${pct}%`, height: "100%",
                  background: "linear-gradient(90deg, var(--brand), #7cb3ff)",
                  borderRadius: 4, transition: "width 0.6s ease",
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Dashboard tab ───────────────────────────────────────────────────────

function DashboardMainView({ result, prev }: { result: CalculationResult; prev: CalculationResult | null }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <MetricCards result={result} prev={prev} />
      <HistoricalCharts result={result} />
      <VentasCategoria result={result} />
    </div>
  );
}

// ─── Comparador with its own period fetch state ───────────────────────────────

function ComparadorView({ periods }: { periods: ReturnType<typeof useDashboard>["periods"] }) {
  const defaultA = periods[0]?.label ?? "";
  const defaultB = periods[1]?.label ?? "";
  const [periodA, setPeriodA] = useState(defaultA);
  const [periodB, setPeriodB] = useState(defaultB);

  const { result: resultA, state: stateA } = useDashboard(periodA);
  const { result: resultB, state: stateB } = useDashboard(periodB);

  if (stateA === "disconnected" || stateB === "disconnected") {
    return <DashboardDisconnected />;
  }

  if ((stateA === "loading" && !resultA) || (stateB === "loading" && !resultB)) {
    return <DashboardLoading />;
  }

  if (!resultA || !resultB) {
    return <DashboardLoading />;
  }

  return (
    <ComparisonTable
      resultA={resultA}
      resultB={resultB}
      periods={periods}
      periodLabelA={periodA}
      periodLabelB={periodB}
      onChangePeriodA={setPeriodA}
      onChangePeriodB={setPeriodB}
      loadingA={stateA === "loading"}
      loadingB={stateB === "loading"}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [periodLabel, setPeriodLabel] = useState("2025");

  const { result, periods, state, error, refetch } = useDashboard(periodLabel);

  // Previous period for delta calculations
  const prevPeriod = periods.find((p) => {
    if (/^\d{4}$/.test(periodLabel)) {
      return p.label === String(parseInt(periodLabel) - 1);
    }
    if (/^\d{4}-(\d{2})$/.test(periodLabel)) {
      const [y, m] = periodLabel.split("-");
      const mNum = parseInt(m) - 1;
      if (mNum === 0) return p.label === `${parseInt(y) - 1}-12`;
      return p.label === `${y}-${String(mNum).padStart(2, "0")}`;
    }
    return false;
  });

  const { result: prevResult } = useDashboard(prevPeriod?.label ?? "");

  const alertCount = result?.deudas.alertasCuotas.length ?? 0;

  // ── user info (replace with session data once auth is wired) ──
  const userName    = "Usuario";
  const userEmpresa = "Tu Empresa";

  function renderContent() {
    // Disconnected state: show guide instead of content
    if (state === "disconnected") {
      return <DashboardDisconnected />;
    }

    // Loading with no cached data
    if (state === "loading" && !result) {
      return <DashboardLoading />;
    }

    // Error state
    if (state === "error") {
      return <DashboardError error={error} onRetry={refetch} />;
    }

    // No data yet
    if (!result) {
      return <DashboardLoading />;
    }

    switch (activeTab) {
      case "dashboard":
        return <DashboardMainView result={result} prev={prevResult ?? null} />;
      case "resultados":
        return <ResultadosTab result={result} />;
      case "patrimonio":
        return <PatrimonioTab result={result} />;
      case "flujo":
        return <FlujoTab result={result} />;
      case "deudas":
        return <DebtTable result={result} />;
      case "stock":
        return <StockTab result={result} />;
      case "comparador":
        return <ComparadorView periods={periods} />;
    }
  }

  return (
    <SidebarLayout
      activeTab={activeTab}
      onChangeTab={setActiveTab}
      periodLabel={periodLabel}
      onChangePeriod={setPeriodLabel}
      periods={periods.length > 0 ? periods : [{ label: "2025", inicio: new Date("2025-01-01"), fin: new Date("2025-12-31"), tipo: "anual" }]}
      alertCount={alertCount}
      userName={userName}
      userEmpresa={userEmpresa}
      onRefresh={refetch}
    >
      {renderContent()}
    </SidebarLayout>
  );
}