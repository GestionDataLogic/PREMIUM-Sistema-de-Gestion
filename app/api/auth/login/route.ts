import { type NextRequest } from "next/server";

// In production, this would call loadUsers() and validate against the sheet.
// For now: mock authentication logic.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { usuario, clave } = body as { usuario: string; clave: string };

    if (!usuario || !clave) {
      return Response.json({ error: "Usuario y clave son requeridos" }, { status: 400 });
    }

    // TODO: Replace with real auth:
    // const users = await loadUsers();
    // const user = users[usuario];
    // if (!user || user.clave !== clave) { ... }

    // Mock validation
    if (usuario === "demo" && clave === "demo123") {
      // In production: set iron-session cookie here
      return Response.json({
        ok: true,
        user: { usuario, nombre: "Usuario Demo", empresa: "Empresa Demo S.R.L." },
      });
    }

    return Response.json({ error: "Credenciales incorrectas" }, { status: 401 });
  } catch (err) {
    return Response.json({ error: "Error interno" }, { status: 500 });
  }
}
