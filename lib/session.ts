import { getIronSession, type IronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import type { UserConfig } from "./types";


export interface SessionData {
  isLoggedIn: boolean;
  user?: Pick<UserConfig, "nombre" | "celular" | "empresa" | "usuario" | "sheetId" | "gidLd" | "gidStock" | "gidIds">;
}


export function getSessionOptions(): SessionOptions {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET no configurado o es muy corto (mínimo 32 caracteres)"
    );
  }
  return {
    password: secret,
    cookieName: "datalogic_session",
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 1 semana
    },
  };
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, getSessionOptions());
}

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
  const message = error instanceof Error ? error.message : defaultMessage;
  return Response.json({ error: message }, { status: 500 });
}
