import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/** Devuelve la sesión si hay un admin logueado, o null. Usar en route handlers de /api/admin/*. */
export async function requireAdminSession() {
  const session = await auth();
  if (!session?.user) return null;
  return session;
}

export function unauthorized() {
  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
}

export function notFound(message = "No encontrado") {
  return NextResponse.json({ error: message }, { status: 404 });
}

export function badRequest(message: string, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status: 400 });
}
