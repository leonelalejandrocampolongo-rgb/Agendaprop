import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, mutateDb } from "@/lib/db";
import { badRequest, requireAdminSession, unauthorized } from "@/lib/api-helpers";
import { CustomAppointmentError, createCustomAppointment } from "@/lib/custom-appointments";
import { packWithProgress } from "@/lib/packs";

const bodySchema = z.object({
  clientName: z.string().trim().min(2),
  clientPhone: z.string().trim().min(6),
  clientEmail: z.union([z.literal(""), z.string().trim().email()]).optional(),
  treatmentName: z.string().trim().min(2),
  description: z.string().trim().max(1000).optional(),
  durationMinutes: z.coerce.number().int().min(5).max(600),
  isPack: z.boolean(),

  // turno único
  priceCents: z.coerce.number().int().min(0).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  status: z.enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED"]).optional(),
  depositPaidCents: z.coerce.number().int().min(0).optional(),

  // pack
  sessionsCount: z.coerce.number().int().min(1).max(50).optional(),
  totalPriceCents: z.coerce.number().int().min(0).optional(),
  paidCents: z.coerce.number().int().min(0).optional(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  paymentMethod: z.enum(["CASH", "TRANSFER", "MERCADOPAGO", "OTHER"]).optional(),
  packStatus: z.enum(["PENDING", "ACTIVE"]).optional(),
});

export async function POST(request: NextRequest) {
  if (!(await requireAdminSession())) return unauthorized();

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten());
  const data = parsed.data;

  if (data.isPack && (data.paidCents ?? 0) > (data.totalPriceCents ?? 0)) {
    return badRequest("El monto ya abonado no puede superar el precio total.");
  }

  try {
    const result = await mutateDb((db) =>
      createCustomAppointment(db, {
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        clientEmail: data.clientEmail || null,
        treatmentName: data.treatmentName,
        description: data.description || null,
        durationMinutes: data.durationMinutes,
        isPack: data.isPack,
        priceCents: data.priceCents,
        date: data.date,
        startTime: data.startTime,
        status: data.status,
        depositPaidCents: data.depositPaidCents,
        sessionsCount: data.sessionsCount,
        totalPriceCents: data.totalPriceCents,
        paidCents: data.paidCents,
        paymentDate: data.paymentDate,
        paymentMethod: data.paymentMethod,
        packStatus: data.packStatus,
      }),
    );

    if (result.kind === "pack") {
      const db = await getDb();
      return NextResponse.json(
        { kind: "pack", pack: packWithProgress(db, result.pack) },
        { status: 201 },
      );
    }
    return NextResponse.json({ kind: "appointment", appointment: result.appointment }, { status: 201 });
  } catch (err) {
    if (err instanceof CustomAppointmentError) {
      const status = err.reason === "SLOT_TAKEN" ? 409 : 400;
      return NextResponse.json({ error: err.message }, { status });
    }
    throw err;
  }
}
