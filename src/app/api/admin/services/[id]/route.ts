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
  name: z.string().trim().min(2).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  durationMinutes: z.coerce.number().int().min(5).max(600).optional(),
  priceCents: z.coerce.number().int().min(0).optional(),
  active: z.boolean().optional(),
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

  const service = await mutateDb((db) => {
    const existing = db.services.find((s) => s.id === id);
    if (!existing) return null;
    Object.assign(existing, parsed.data, { updatedAt: new Date().toISOString() });
    return existing;
  });

  if (!service) return notFound("Servicio no encontrado");
  return NextResponse.json({ service });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdminSession())) return unauthorized();
  const { id } = await params;

  const result = await mutateDb((db) => {
    const existing = db.services.find((s) => s.id === id);
    if (!existing) return { status: "not-found" as const };

    const hasAppointments = db.appointments.some((a) => a.serviceId === id);
    if (hasAppointments) {
      existing.active = false;
      existing.updatedAt = new Date().toISOString();
      return { status: "deactivated" as const };
    }

    db.services = db.services.filter((s) => s.id !== id);
    return { status: "deleted" as const };
  });

  if (result.status === "not-found") return notFound("Servicio no encontrado");
  return NextResponse.json({ result: result.status });
}
