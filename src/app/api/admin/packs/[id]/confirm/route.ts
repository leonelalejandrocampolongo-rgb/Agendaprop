import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, mutateDb } from "@/lib/db";
import { badRequest, notFound, requireAdminSession, unauthorized } from "@/lib/api-helpers";
import { confirmPack, PackConfirmError, PackPaymentError, packWithProgress } from "@/lib/packs";
import { notifyPackConfirmed } from "@/lib/notifications";

const bodySchema = z.object({
  amountCents: z.coerce.number().int().min(0).optional(),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  method: z.enum(["CASH", "TRANSFER", "MERCADOPAGO", "OTHER"]).optional(),
  notes: z.string().trim().max(1000).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdminSession())) return unauthorized();
  const { id } = await params;

  const json = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return badRequest("Datos inválidos", parsed.error.flatten());
  const data = parsed.data;

  try {
    const result = await mutateDb((db) => {
      const pack = db.packs.find((p) => p.id === id);
      if (!pack) throw new Error("PACK_NOT_FOUND");

      return confirmPack(
        db,
        pack,
        data.amountCents && data.amountCents > 0
          ? {
              amountCents: data.amountCents,
              paymentDate: data.paymentDate || new Date().toISOString().slice(0, 10),
              method: data.method || "TRANSFER",
              notes: data.notes,
            }
          : undefined,
      );
    });

    const db = await getDb();
    if (result.confirmedSession) {
      notifyPackConfirmed(result.pack, result.confirmedSession).catch((err) =>
        console.error("[notifications] error al avisar pack confirmado", err),
      );
    }

    return NextResponse.json({ pack: packWithProgress(db, result.pack) });
  } catch (err) {
    if (err instanceof Error && err.message === "PACK_NOT_FOUND") {
      return notFound("Pack no encontrado");
    }
    if (err instanceof PackConfirmError || err instanceof PackPaymentError) {
      return badRequest(err.message);
    }
    throw err;
  }
}
