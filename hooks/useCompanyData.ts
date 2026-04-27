"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { CalculationResult, Period } from "@/lib/types";

export interface CompanyDataState {
  result:   CalculationResult | null;
  periodos: Period[];
  empresa:  string;
  nombre:   string;
  loading:  boolean;
  error:    string | null;
}


const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function reviveDates(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string" && ISO_RE.test(obj)) return new Date(obj);
  if (Array.isArray(obj)) return obj.map(reviveDates);
  if (typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = reviveDates(v);
    }
    return out;
  }
  return obj;
}

export function useCompanyData(periodoLabel?: string) {
  const [state, setState] = useState<CompanyDataState>({
    result:   null,
    periodos: [],
    empresa:  "",
    nombre:   "",
    loading:  true,
    error:    null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (periodo?: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setState(s => ({ ...s, loading: true, error: null }));

    try {
      const url = periodo
        ? `/api/dashboard?periodo=${encodeURIComponent(periodo)}`
        : "/api/dashboard";

      const res = await fetch(url, {
        signal: controller.signal,
        credentials: "include",
      });

      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `Error ${res.status}`);
      }

      const raw = await res.json();
      const result   = reviveDates(raw.result)   as CalculationResult;
      const periodos = reviveDates(raw.periodos)  as Period[];

      setState({
        result,
        periodos,
        empresa: (raw.empresa as string) ?? "",
        nombre:  (raw.nombre  as string) ?? "",
        loading: false,
        error:   null,
      });

    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      setState(s => ({
        ...s,
        loading: false,
        error: (err as Error).message ?? "Error al cargar datos",
      }));
    }
  }, []);

  useEffect(() => {
    fetchData(periodoLabel);
    return () => { abortRef.current?.abort(); };
  }, [fetchData, periodoLabel]);

  const refetch = useCallback(() => fetchData(periodoLabel), [fetchData, periodoLabel]);

  return { ...state, refetch };
}
