import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, mutateDb } from "@/lib/db";
import {
  badRequest,
  notFound,
  requireAdminSession,
  unauthorized,
} from "@/lib/api-helpers";
import { isSlotStillAvailable, minutesToTime, timeToMinutes } from "@/lib/availability";
import { notifyAppointmentStatusChange } from "@/lib/notifications";
import { syncPackStatus } from "@/lib/packs";

const updateSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
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
  const data = parsed.data;

  let statusChanged = false;
  try {
    const appointment = await mutateDb((db) => {
      const existing = db.appointments.find((a) => a.id === id);
      if (!existing) return null;

      // Reprogramar: mueve la misma reserva a otra fecha/horario sin crear
      // una nueva (no consume otra sesión de pack, no duplica el turno).
      if (data.date !== undefined || data.startTime !== undefined) {
        const service = db.services.find((s) => s.id === existing.serviceId);
        if (!service) throw new Error("SERVICE_NOT_FOUND");

        const newDate = data.date ?? existing.date;
        const newStartTime = data.startTime ?? existing.startTime;
        const newEndTime = minutesToTime(
          timeToMinutes(newStartTime) + service.durationMinutes,
        );

        if (
          !isSlotStillAvailable({
            db,
            serviceId: service.id,
            date: newDate,
            startTime: newStartTime,
            endTime: newEndTime,
            excludeAppointmentId: existing.id,
          })
        ) {
          throw new Error("SLOT_TAKEN");
        }

        existing.date = newDate;
        existing.startTime = newStartTime;
        existing.endTime = newEndTime;
      }

      statusChanged = data.status !== undefined && data.status !== existing.status;
      if (data.status !== undefined) existing.status = data.status;
      if (data.notes !== undefined) existing.notes = data.notes;
      existing.updatedAt = new Date().toISOString();

      if (existing.packId) {
        const pack = db.packs.find((p) => p.id === existing.packId);
        if (pack) syncPackStatus(db, pack);
      }

      return existing;
    });

    if (!appointment) return notFound("Turno no encontrado");

    if (statusChanged) {
      const db = await getDb();
      const service = db.services.find((s) => s.id === appointment.serviceId);
      const pack = appointment.packId
        ? db.packs.find((p) => p.id === appointment.packId)
        : undefined;
      if (service) {
        notifyAppointmentStatusChange(
          appointment,
          service,
          pack && appointment.packSessionNumber
            ? { number: appointment.packSessionNumber, total: pack.sessionsCount }
            : undefined,
        ).catch((err) =>
          console.error("[notifications] error al avisar cambio de estado", err),
        );
      }
    }

    return NextResponse.json({ appointment });
  } catch (err) {
    if (err instanceof Error && err.message === "SERVICE_NOT_FOUND") {
      return notFound("El servicio de este turno ya no existe");
    }
    if (err instanceof Error && err.message === "SLOT_TAKEN") {
      return NextResponse.json(
        { error: "Ese horario ya no está disponible, elegí otro." },
        { status: 409 },
      );
    }
    throw err;
  }
}
