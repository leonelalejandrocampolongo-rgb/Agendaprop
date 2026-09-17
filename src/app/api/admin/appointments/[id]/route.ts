import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { mutateDb } from "@/lib/db";
import {
  badRequest,
  notFound,
  requireAdminSession,
  unauthorized,
} from "@/lib/api-helpers";

const updateSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdminSession())) return unauthorized();
  const { id } = await params;

  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten());

  const appointment = await mutateDb((db) => {
    const existing = db.appointments.find((a) => a.id === id);
    if (!existing) return null;
    Object.assign(existing, parsed.data, { updatedAt: new Date().toISOString() });
    return existing;
  });

  if (!appointment) return notFound("Turno no encontrado");
  return NextResponse.json({ appointment });
}
