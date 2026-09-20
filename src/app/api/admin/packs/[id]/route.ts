import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDb, mutateDb } from "@/lib/db";
import { badRequest, notFound, requireAdminSession, unauthorized } from "@/lib/api-helpers";
import { cancelPack, packWithProgress } from "@/lib/packs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await requireAdminSession())) return unauthorized();
  const { id } = await params;

  const db = await getDb();
  const pack = db.packs.find((p) => p.id === id);
  if (!pack) return notFound("Pack no encontrado");

  const service = db.services.find((s) => s.id === pack.serviceId) ?? null;
  const payments = db.packPayments
    .filter((p) => p.packId === pack.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return NextResponse.json({ pack: packWithProgress(db, pack), service, payments });
}

const updateSchema = z.object({
  status: z.enum(["CANCELLED"]).optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
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

  const pack = await mutateDb((db) => {
    const existing = db.packs.find((p) => p.id === id);
    if (!existing) return null;

    if (parsed.data.notes !== undefined) {
      existing.notes = parsed.data.notes;
      existing.updatedAt = new Date().toISOString();
    }
    if (parsed.data.status === "CANCELLED") {
      cancelPack(db, existing);
    }
    return existing;
  });

  if (!pack) return notFound("Pack no encontrado");

  const db = await getDb();
  return NextResponse.json({ pack: packWithProgress(db, pack) });
}
