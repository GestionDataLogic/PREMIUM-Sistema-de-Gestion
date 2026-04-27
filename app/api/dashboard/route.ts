import { type NextRequest, NextResponse } from "next/server";
import { requireAuth, apiError } from "@/lib/session";
import { loadCompanyData } from "@/lib/data-loader";
import { calcularTodo } from "@/lib/calculation";
import { calcularPeriodo } from "@/lib/periods";
import type { CalculationResult } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const { searchParams } = new URL(request.url);
    const periodoLabel = searchParams.get("periodo");

    const { ld, stk, deudas_cuotas, nombres_capa1, inflacion_por_mes, periodos } =
      await loadCompanyData(user);

    let result: CalculationResult;

    if (!periodoLabel) {
      result = calcularTodo(ld, stk, nombres_capa1, deudas_cuotas, inflacion_por_mes);
    } else {
      const periodo = periodos.find((p) => p.label === periodoLabel);
      if (!periodo) return NextResponse.json({ error: "Período no encontrado" }, { status: 404 });

      const pr = calcularPeriodo(ld, stk, nombres_capa1, deudas_cuotas, inflacion_por_mes, periodo.inicio, periodo.fin);
      if (!pr) return NextResponse.json({ error: "Sin datos para el período" }, { status: 404 });

      const ldPer = ld.filter((e) => e.fecha !== null && e.fecha >= periodo.inicio && e.fecha <= periodo.fin);
      const stkPer = stk.filter((e) => e.fecha !== null && e.fecha <= periodo.fin);
      const fullPer = calcularTodo(ldPer, stkPer, nombres_capa1, deudas_cuotas, inflacion_por_mes);

      result = {
        er: pr.er, sp: pr.sp, fc: pr.fc, cp: pr.cp,
        deudas: pr.deudas, stockActual: pr.stock, roe: pr.roe, roic: pr.roic,
        ventaXCapa1: fullPer.ventaXCapa1,
        ventasMerAnuales: fullPer.ventasMerAnuales,
        ventasMerMensuales: fullPer.ventasMerMensuales,
        ventasExtraAnuales: fullPer.ventasExtraAnuales,
        ventasExtraMensuales: fullPer.ventasExtraMensuales,
        devolucAnuales: fullPer.devolucAnuales,
        devolucMensuales: fullPer.devolucMensuales,
      };
    }

    return NextResponse.json({ result, periodos, empresa: user.empresa, nombre: user.nombre });
  } catch (err) {
    return apiError(err);
  }
}
