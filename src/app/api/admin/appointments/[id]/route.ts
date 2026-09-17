import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, mutateDb } from "@/lib/db";
import {
  badRequest,
  notFound,
  requireAdminSession,
  unauthorized,
} from "@/lib/api-helpers";
import { notifyAppointmentStatusChange } from "@/lib/notifications";

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

  let statusChanged = false;
  const appointment = await mutateDb((db) => {
    const existing = db.appointments.find((a) => a.id === id);
    if (!existing) return null;
    statusChanged =
      parsed.data.status !== undefined && parsed.data.status !== existing.status;
    Object.assign(existing, parsed.data, { updatedAt: new Date().toISOString() });
    return existing;
  });

  if (!appointment) return notFound("Turno no encontrado");

  if (statusChanged) {
    const db = await getDb();
    const service = db.services.find((s) => s.id === appointment.serviceId);
    if (service) {
      notifyAppointmentStatusChange(appointment, service).catch((err) =>
        console.error("[notifications] error al avisar cambio de estado", err),
      );
    }
  }

  return NextResponse.json({ appointment });
}
