import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    session.destroy();
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[POST /api/auth/logout]", error);
    return NextResponse.json(
      { error: "Error al cerrar sesión" },
      { status: 500 }
    );
  }
}
