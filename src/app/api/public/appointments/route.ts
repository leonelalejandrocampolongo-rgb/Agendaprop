import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, mutateDb, newId } from "@/lib/db";
import { minutesToTime, timeToMinutes } from "@/lib/availability";
import { badRequest, notFound } from "@/lib/api-helpers";
import { notifyNewAppointment } from "@/lib/notifications";

const bodySchema = z.object({
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  clientName: z.string().trim().min(2, "Ingresá tu nombre completo"),
  clientPhone: z.string().trim().min(6, "Ingresá un teléfono válido"),
  clientEmail: z
    .union([z.literal(""), z.string().trim().email()])
    .optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return badRequest("Datos inválidos", parsed.error.flatten());
  }
  const { serviceId, date, startTime, clientName, clientPhone } =
    parsed.data;
  const clientEmail = parsed.data.clientEmail || undefined;
  const notes = parsed.data.notes || undefined;

  try {
    const appointment = await mutateDb((db) => {
      const service = db.services.find(
        (s) => s.id === serviceId && s.active,
      );
      if (!service) {
        throw new Error("SERVICE_NOT_FOUND");
      }

      const endTime = minutesToTime(
        timeToMinutes(startTime) + service.durationMinutes,
      );

      const stillFree = !db.appointments.some(
        (a) =>
          a.date === date &&
          (a.status === "PENDING" || a.status === "CONFIRMED") &&
          timeToMinutes(a.startTime) < timeToMinutes(endTime) &&
          timeToMinutes(startTime) < timeToMinutes(a.endTime),
      );
      if (!stillFree) {
        throw new Error("SLOT_TAKEN");
      }

      const now = new Date().toISOString();
      const newAppointment = {
        id: newId(),
        serviceId,
        date,
        startTime,
        endTime,
        clientName,
        clientPhone,
        clientEmail: clientEmail ?? null,
        notes: notes ?? null,
        status: "PENDING" as const,
        packId: null,
        packSessionNumber: null,
        createdAt: now,
        updatedAt: now,
      };
      db.appointments.push(newAppointment);
      return newAppointment;
    });

    const db = await getDb();
    const service = db.services.find((s) => s.id === appointment.serviceId);
    if (service) {
      const adminEmails = db.admins.map((a) => a.email);
      notifyNewAppointment(appointment, service, adminEmails).catch((err) =>
        console.error("[notifications] error al avisar nuevo turno", err),
      );
    }

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "SERVICE_NOT_FOUND") {
      return notFound("El servicio elegido ya no está disponible");
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
