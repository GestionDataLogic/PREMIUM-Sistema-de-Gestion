"use client";

import { useState, useEffect, useCallback } from "react";
import type { CalculationResult, Period } from "@/lib/types";

export type FetchState = "idle" | "loading" | "success" | "error" | "disconnected";

interface UseDashboardReturn {
  result: CalculationResult | null;
  periods: Period[];
  state: FetchState;
  error: string | null;
  refetch: () => void;
}

export function useDashboard(periodoLabel: string): UseDashboardReturn {
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [state, setState] = useState<FetchState>("idle");
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setState("loading");
    setError(null);

    try {
      // Fetch periods first (only once on mount effectively, but kept here for simplicity)
      const [periodRes, dataRes] = await Promise.all([
        fetch("/api/periods"),
        fetch(`/api/dashboard?periodo=${encodeURIComponent(periodoLabel)}`),
      ]);

      if (!periodRes.ok) {
        const pData = await periodRes.json();
        if (pData?.error === "DATA_NOT_CONNECTED") {
          setState("disconnected");
          return;
        }
      } else {
        const pData = await periodRes.json();
        // Deserialize dates
        const parsed: Period[] = (pData as Period[]).map((p) => ({
          ...p,
          inicio: new Date(p.inicio),
          fin: new Date(p.fin),
        }));
        setPeriods(parsed);
      }

      if (!dataRes.ok) {
        const dData = await dataRes.json();
        if (dData?.error === "DATA_NOT_CONNECTED") {
          setState("disconnected");
          return;
        }
        throw new Error(dData?.message ?? `HTTP ${dataRes.status}`);
      }

      const raw = await dataRes.json();
      // Deep-deserialize Dates in result
      setResult(deserializeResult(raw));
      setState("success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al cargar datos";
      setError(msg);
      setState("error");
    }
  }, [periodoLabel]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { result, periods, state, error, refetch: fetchData };
}

// ─── Date deserializer ────────────────────────────────────────────────────────

function deserializeResult(raw: unknown): CalculationResult {
  // Cast – the backend guarantees the shape; we just need to fix Date fields
  const r = raw as CalculationResult;

  // cp dates
  r.cp = r.cp.map((row) => ({
    ...row,
    fecha: row.fecha ? new Date(row.fecha as unknown as string) : null,
  }));

  // deudas installment dates
  const fixInstallment = (c: unknown) => {
    const i = c as CalculationResult["deudas"]["cuotasCobrar"][0];
    return {
      ...i,
      fechaReg: i.fechaReg ? new Date(i.fechaReg as unknown as string) : null,
      vencimiento: i.vencimiento ? new Date(i.vencimiento as unknown as string) : null,
      fechaPago: i.fechaPago ? new Date(i.fechaPago as unknown as string) : null,
    };
  };

  r.deudas.cuotasCobrar = r.deudas.cuotasCobrar.map(fixInstallment);
  r.deudas.cuotasPagar = r.deudas.cuotasPagar.map(fixInstallment);
  r.deudas.alertasCuotas = r.deudas.alertasCuotas.map((a) => ({
    ...a,
    vencimiento: a.vencimiento ? new Date(a.vencimiento as unknown as string) : null,
  }));

  return r;
}