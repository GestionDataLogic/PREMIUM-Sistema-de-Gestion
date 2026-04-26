/**
 * session.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Gestión de sesión usando iron-session (cookies firmadas y encriptadas).
 * No requiere base de datos.
 */

import { getIronSession, type IronSession, type IronSessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { UserConfig } from "./types";

// ─── Tipos de sesión ───────────────────────────────────────────────────────────

export interface SessionData {
  isLoggedIn: boolean;
  user?: Pick<UserConfig, "usuario" | "nombre" | "empresa" | "sheetId" | "gidLd" | "gidStock" | "gidIds">;
}

// ─── Configuración ─────────────────────────────────────────────────────────────

export function getSessionOptions(): IronSessionOptions {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET debe tener al menos 32 caracteres. Generá uno con: openssl rand -base64 32"
    );
  }

  return {
    cookieName: "datalogic_session",
    password: secret,
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 horas
    },
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, getSessionOptions());
}

/**
 * Retorna los datos del usuario de la sesión activa.
 * Lanza un error 401 si no hay sesión.
 */
export async function requireAuth(): Promise<SessionData["user"]> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user) {
    throw new AuthError("No autorizado. Por favor, iniciá sesión.");
  }
  return session.user;
}

export class AuthError extends Error {
  statusCode = 401;
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Helper para respuestas de API con manejo de errores centralizado.
 */
export function apiError(
  error: unknown,
  defaultMessage = "Error interno del servidor"
): Response {
  if (error instanceof AuthError) {
    return Response.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }
  console.error("[API Error]", error);
  const message =
    error instanceof Error ? error.message : defaultMessage;
  return Response.json({ error: message }, { status: 500 });
}
