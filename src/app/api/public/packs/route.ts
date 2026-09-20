import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Pack } from "@/lib/db-types";
import { getDb, mutateDb } from "@/lib/db";
import { badRequest, notFound } from "@/lib/api-helpers";
import { PackScheduleError, schedulePackSession } from "@/lib/packs";
import { notifyNewPackRequest } from "@/lib/notifications";

const bodySchema = z.object({
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  clientName: z.string().trim().min(2, "Ingresá tu nombre completo"),
  clientPhone: z.string().trim().min(6, "Ingresá un teléfono válido"),
  clientEmail: z.union([z.literal(""), z.string().trim().email()]).optional(),
  notes: z.string().trim().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return badRequest("Datos inválidos", parsed.error.flatten());
  }
  const { serviceId, date, startTime, clientName, clientPhone } = parsed.data;
  const clientEmail = parsed.data.clientEmail || undefined;
  const notes = parsed.data.notes || undefined;

  try {
    const { pack, appointment } = await mutateDb((db) => {
      const service = db.services.find(
        (s) => s.id === serviceId && s.active && !s.hidden,
      );
      if (!service) throw new Error("SERVICE_NOT_FOUND");
      if (!service.isPack || !service.packSessionsCount) {
        throw new Error("NOT_A_PACK");
      }

      const now = new Date().toISOString();
      const pack: Pack = {
        id: crypto.randomUUID(),
        serviceId: service.id,
        name: service.name,
        clientName,
        clientPhone,
        clientEmail: clientEmail ?? null,
        sessionsCount: service.packSessionsCount as number,
        totalPriceCents: service.priceCents,
        status: "PENDING",
        notes: notes ?? null,
        createdAt: now,
        updatedAt: now,
      };
      db.packs.push(pack);

      const appointment = schedulePackSession(db, pack, service, {
        date,
        startTime,
        clientName,
        clientPhone,
        clientEmail,
        notes,
      });

      return { pack, appointment };
    });

    const db = await getDb();
    const service = db.services.find((s) => s.id === pack.serviceId);
    if (service) {
      const adminEmails = db.admins.map((a) => a.email);
      notifyNewPackRequest(pack, appointment, service, adminEmails).catch((err) =>
        console.error("[notifications] error al avisar nuevo pack", err),
      );
    }

    return NextResponse.json({ pack, appointment }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "SERVICE_NOT_FOUND") {
      return notFound("El servicio elegido ya no está disponible");
    }
    if (err instanceof Error && err.message === "NOT_A_PACK") {
      return badRequest("Este servicio no es un pack.");
    }
    if (err instanceof PackScheduleError) {
      const status = err.reason === "SLOT_TAKEN" ? 409 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    throw err;
  }
}
