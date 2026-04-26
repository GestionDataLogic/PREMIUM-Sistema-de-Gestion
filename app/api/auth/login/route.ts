import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { downloadSheet } from "@/lib/google-sheets";
export async function POST(request: NextRequest) {
  try {
    const { usuario, clave } = await request.json();
    if (!usuario || !clave) {
      return NextResponse.json(
        { error: "Usuario y clave son requeridos" },
        { status: 400 }
      );
    }

    const masterSheetId = process.env.MASTER_SHEET_ID;
    if (!masterSheetId) {
      return NextResponse.json(
        { error: "Configuración incompleta del servidor" },
        { status: 500 }
      );
    }
    const rows = await downloadSheet(masterSheetId, 0);
    // Buscar usuario en la hoja
    // Estructura: A=Nombre, B=Celular, C=Empresa, D=Usuario, E=Contraseña, F=SheetId, G=GidLD, H=GidStock, I=GidIds
    let foundUser: (typeof rows)[0] | null = null;
    for (const row of rows) {
      if (row[3]?.trim().toLowerCase() === usuario.trim().toLowerCase()) {
        if (row[4]?.trim() === clave.trim()) {
          foundUser = row;
          break;
        }
      }
    }
    if (!foundUser) {
      return NextResponse.json(
        { error: "Credenciales incorrectas" },
        { status: 401 }
      );
    }
    // Extraer datos del usuario
    const nombre = foundUser[0]?.trim() || usuario;
    const celular = foundUser[1]?.trim() || "";
    const empresa = foundUser[2]?.trim() || "";
    const sheetId = foundUser[5]?.trim();
    const gidLd = foundUser[6]?.trim() || "0";
    const gidStock = foundUser[7]?.trim() || "0";
    const gidIds = foundUser[8]?.trim() || "0";
    if (!sheetId) {
      return NextResponse.json(
        { error: "Datos de usuario incompletos" },
        { status: 400 }
      );
    }
    // Guardar sesión
    const session = await getSession();
    session.isLoggedIn = true;
    session.user = {
      nombre,
      celular,
      empresa,
      usuario,
      sheetId,
      gidLd,
      gidStock,
      gidIds,
    };
    await session.save();
    return NextResponse.json(
      {
        ok: true,
        user: {
          usuario,
          nombre,
          empresa,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: `Error al iniciar sesión: ${message}` },
      { status: 500 }
    );
  }
}
