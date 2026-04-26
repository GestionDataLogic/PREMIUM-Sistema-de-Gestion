import { type NextRequest, NextResponse } from "next/server";

// ─── This route fetches real data from Google Sheets and runs calculations ────
// Replace the stub below with your actual `calculations.ts` imports once wired.

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const periodoLabel = searchParams.get("periodo") ?? "2025";

  try {
    // ── REAL IMPLEMENTATION ──────────────────────────────────────────────────
    // Uncomment and adapt once your calculations.ts is ready:
    //
    // import { getSheetData } from "@/lib/sheets";
    // import { calculatePeriod } from "@/lib/calculations";
    //
    // const raw = await getSheetData(
    //   process.env.MASTER_SHEET_ID!,
    //   process.env.MASTER_GID!
    // );
    // const result = await calculatePeriod(raw, periodoLabel);
    // return NextResponse.json(result);
    // ────────────────────────────────────────────────────────────────────────

    // Temporary: returns 503 so the UI shows a "connect your data" state
    return NextResponse.json(
      { error: "DATA_NOT_CONNECTED", message: "Conectá tu hoja de cálculo para ver datos reales." },
      { status: 503 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "SERVER_ERROR", message }, { status: 500 });
  }
}