import { type NextRequest, NextResponse } from "next/server";
import type { Period } from "@/lib/types";

export async function GET(_request: NextRequest) {
  try {
  
    return NextResponse.json(
      { error: "DATA_NOT_CONNECTED" },
      { status: 503 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
