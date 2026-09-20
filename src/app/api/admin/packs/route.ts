import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, mutateDb } from "@/lib/db";
import { badRequest, notFound, requireAdminSession, unauthorized } from "@/lib/api-helpers";
import { createManualPack, packWithProgress } from "@/lib/packs";

export async function GET(request: NextRequest) {
  if (!(await requireAdminSession())) return unauthorized();

  const status = request.nextUrl.searchParams.get("status");

  const db = await getDb();
  let packs = db.packs;
  if (status) packs = packs.filter((p) => p.status === status);

  const withProgress = packs
    .map((p) => packWithProgress(db, p))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return NextResponse.json({ packs: withProgress });
}

const createSchema = z.object({
  serviceId: z.string().min(1),
  clientName: z.string().trim().min(2),
  clientPhone: z.string().trim().min(6),
  clientEmail: z.union([z.literal(""), z.string().trim().email()]).optional(),
  sessionsCount: z.coerce.number().int().min(1).max(50),
  totalPriceCents: z.coerce.number().int().min(0),
  paidCents: z.coerce.number().int().min(0).optional(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  paymentMethod: z.enum(["CASH", "TRANSFER", "MERCADOPAGO", "OTHER"]).optional(),
  status: z.enum(["PENDING", "ACTIVE"]).default("ACTIVE"),
  notes: z.string().trim().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  if (!(await requireAdminSession())) return unauthorized();

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten());
  const data = parsed.data;

  if (data.paidCents && data.paidCents > data.totalPriceCents) {
    return badRequest("El monto ya abonado no puede superar el precio total.");
  }

  try {
    const result = await mutateDb((db) => {
      const service = db.services.find((s) => s.id === data.serviceId);
      if (!service) throw new Error("SERVICE_NOT_FOUND");

      return createManualPack(db, service, {
        serviceId: data.serviceId,
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        clientEmail: data.clientEmail || null,
        sessionsCount: data.sessionsCount,
        totalPriceCents: data.totalPriceCents,
        status: data.status,
        notes: data.notes || null,
        initialPayment:
          data.paidCents && data.paidCents > 0
            ? {
                amountCents: data.paidCents,
                paymentDate: data.paymentDate || new Date().toISOString().slice(0, 10),
                method: data.paymentMethod || "TRANSFER",
              }
            : undefined,
      });
    });

    const db = await getDb();
    return NextResponse.json(
      { pack: packWithProgress(db, result.pack) },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof Error && err.message === "SERVICE_NOT_FOUND") {
      return notFound("El servicio elegido no existe");
    }
    throw err;
  }
}
