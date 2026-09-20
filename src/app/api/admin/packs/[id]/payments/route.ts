import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, mutateDb } from "@/lib/db";
import { badRequest, notFound, requireAdminSession, unauthorized } from "@/lib/api-helpers";
import { PackPaymentError, packWithProgress, registerPackPayment } from "@/lib/packs";

const bodySchema = z.object({
  amountCents: z.coerce.number().int().min(1),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  method: z.enum(["CASH", "TRANSFER", "MERCADOPAGO", "OTHER"]),
  notes: z.string().trim().max(1000).optional(),
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
    const pack = await mutateDb((db) => {
      const existing = db.packs.find((p) => p.id === id);
      if (!existing) throw new Error("PACK_NOT_FOUND");

      registerPackPayment(db, existing, {
        amountCents: data.amountCents,
        paymentDate: data.paymentDate,
        method: data.method,
        notes: data.notes,
      });

      return existing;
    });

    const db = await getDb();
    return NextResponse.json({ pack: packWithProgress(db, pack) }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "PACK_NOT_FOUND") {
      return notFound("Pack no encontrado");
    }
    if (err instanceof PackPaymentError) {
      return badRequest(err.message);
    }
    throw err;
  }
}
