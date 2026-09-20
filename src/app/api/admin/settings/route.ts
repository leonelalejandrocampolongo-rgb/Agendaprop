import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, mutateDb } from "@/lib/db";
import { badRequest, requireAdminSession, unauthorized } from "@/lib/api-helpers";

export async function GET() {
  if (!(await requireAdminSession())) return unauthorized();
  const db = await getDb();
  return NextResponse.json({ settings: db.settings });
}

const updateSchema = z.object({
  bufferMinutes: z.coerce.number().int().refine((v) => v === 0 || v === 15 || v === 30, {
    message: "El margen debe ser 0, 15 o 30 minutos",
  }),
});

export async function PATCH(request: NextRequest) {
  if (!(await requireAdminSession())) return unauthorized();

  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten());

  const settings = await mutateDb((db) => {
    db.settings.bufferMinutes = parsed.data.bufferMinutes;
    return db.settings;
  });

  return NextResponse.json({ settings });
}
