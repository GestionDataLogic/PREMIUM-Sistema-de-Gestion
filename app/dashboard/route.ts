import { type NextRequest, NextResponse } from "next/server";


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const periodoLabel = searchParams.get("periodo") ?? "2025";

  try {
    
    return NextResponse.json(
      { error: "DATA_NOT_CONNECTED", message: "Conectá tu hoja de cálculo para ver datos reales." },
      { status: 503 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: "SERVER_ERROR", message }, { status: 500 });
  }
}
