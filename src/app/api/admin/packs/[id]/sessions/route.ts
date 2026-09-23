import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, mutateDb } from "@/lib/db";
import { badRequest, notFound, requireAdminSession, unauthorized } from "@/lib/api-helpers";
import { PackScheduleError, packWithProgress, schedulePackSession } from "@/lib/packs";
import { notifyAppointmentStatusChange } from "@/lib/notifications";

const bodySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  notes: z.string().trim().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdminSession())) return unauthorized();
  const { id } = await params;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten());
  const data = parsed.data;

  try {
    const { pack, appointment } = await mutateDb((db) => {
      const pack = db.packs.find((p) => p.id === id);
      if (!pack) throw new Error("PACK_NOT_FOUND");
      const service = db.services.find((s) => s.id === pack.serviceId);
      if (!service) throw new Error("SERVICE_NOT_FOUND");

      const appointment = schedulePackSession(db, pack, service, {
        date: data.date,
        startTime: data.startTime,
        notes: data.notes,
      });
      return { pack, appointment };
    });

    const db = await getDb();
    const service = db.services.find((s) => s.id === pack.serviceId);
    if (service && appointment.status === "CONFIRMED" && appointment.packSessionNumber) {
      notifyAppointmentStatusChange(appointment, service, db.settings, {
        number: appointment.packSessionNumber,
        total: pack.sessionsCount,
      }).catch((err) =>
        console.error("[notifications] error al avisar sesión de pack agendada", err),
      );
    }

    return NextResponse.json(
      { pack: packWithProgress(db, pack), appointment },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof Error && err.message === "PACK_NOT_FOUND") {
      return notFound("Pack no encontrado");
    }
    if (err instanceof Error && err.message === "SERVICE_NOT_FOUND") {
      return notFound("El servicio del pack ya no existe");
    }
    if (err instanceof PackScheduleError) {
      const status = err.reason === "SLOT_TAKEN" ? 409 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    throw err;
  }
}
